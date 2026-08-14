import type { Context } from '@deepseek-ai/cordis'
import {
  CallId,
  LlmAdapter,
  ReasoningEffortId,
  type GenerateOptions,
  type LlmResolvedModelInfo,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'

const HIGH = ReasoningEffortId('high')

/**
 * Keyless project-delivery adapter. Stage and mode come from the driver's
 * environment: `text` answers directly, `roundtrip` first performs one real
 * shell tool call (bash on POSIX, pwsh on Windows) and then answers.
 */
class ProjectMockAdapter extends LlmAdapter {
  override async resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return {
      provider,
      id: model,
      name: model,
      reasoning: {
        efforts: [{ id: HIGH, name: 'High' }],
        defaultEffort: HIGH,
      },
    }
  }

  async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const stage = process.env.DSH_PROJECT_STAGE ?? 'coding'
    const mode = process.env.DSH_PROJECT_MOCK ?? 'text'
    if (mode === 'roundtrip') {
      const toolResult = options.messages.at(-1)?.content.find(block => block.type === 'tool-result')
      if (toolResult === undefined) {
        const shell = process.env.DSH_PROJECT_SHELL_TOOL ?? 'bash'
        const command = shell === 'pwsh'
          ? 'Write-Output PROJECT_STAGE_SHELL_ROUND_TRIP'
          : 'echo PROJECT_STAGE_SHELL_ROUND_TRIP'
        const args = JSON.stringify({ command, description: `Prove the ${shell} round trip in the ${stage} stage.` })
        yield { type: 'block-start', index: 0, blockType: 'tool-call' }
        yield { type: 'tool-call-delta', index: 0, id: CallId(`project-${stage}-call`), name: shell, argumentsDelta: args }
        yield { type: 'block-end', index: 0, block: { type: 'tool-call', id: CallId(`project-${stage}-call`), name: shell, arguments: args } }
        yield { type: 'usage', usage: { inputTokens: 9, outputTokens: 3, cacheReadTokens: 2 } }
        yield { type: 'finish', reason: { kind: 'tool-calls' } }
        return
      }

      const toolText = toolResult.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
      const reply = `[${stage}] lifecycle turn complete: ${toolText.trim()}`
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: reply }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: reply } }
      yield { type: 'usage', usage: { inputTokens: 7, outputTokens: 5, reasoningTokens: 1 } }
      yield { type: 'finish', reason: { kind: 'stop' } }
      return
    }
    if (mode === 'gate') {
      const toolResult = options.messages.at(-1)?.content.find(block => block.type === 'tool-result')
      if (toolResult === undefined) {
        const args = JSON.stringify({
          questions: [{
            id: 'confirm',
            question: `${stage} 阶段是否确认通过？`,
            options: [{ label: '确认通过', description: '按当前规格/结论进入下一阶段' }, { label: '修改后继续', description: '先按意见补充或修改' }],
          }],
        })
        yield { type: 'block-start', index: 0, blockType: 'tool-call' }
        yield { type: 'tool-call-delta', index: 0, id: CallId(`project-${stage}-gate`), name: 'ask_user_question', argumentsDelta: args }
        yield { type: 'block-end', index: 0, block: { type: 'tool-call', id: CallId(`project-${stage}-gate`), name: 'ask_user_question', arguments: args } }
        yield { type: 'usage', usage: { inputTokens: 9, outputTokens: 3, cacheReadTokens: 2 } }
        yield { type: 'finish', reason: { kind: 'tool-calls' } }
        return
      }

      const answer = toolResult.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
      const reply = `[${stage}] gate resolved: ${answer.trim()}`
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: reply }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: reply } }
      yield { type: 'usage', usage: { inputTokens: 7, outputTokens: 5, reasoningTokens: 1 } }
      yield { type: 'finish', reason: { kind: 'stop' } }
      return
    }

    const reply = `[${stage}] lifecycle turn complete`
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: reply }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: reply } }
    yield { type: 'usage', usage: { inputTokens: 6, outputTokens: 4 } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

export const name = 'cli-mock-llm'
export const inject = ['llm']

/** Register the keyless `cli-mock` adapter. */
export function apply(ctx: Context): void {
  ctx.llm.registerAdapter(['cli-mock'], new ProjectMockAdapter())
}
