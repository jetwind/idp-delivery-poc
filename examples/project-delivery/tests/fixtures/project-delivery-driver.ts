#!/usr/bin/env node
/**
 * Keyless project-delivery Loader driver: boot the real composition, compose
 * one agent from the named stage preset, emit its prompt assembly, run one
 * fixture turn, and print the canonical JSONL result.
 */

import type { Context } from '@deepseek-ai/cordis'
import { fileURLToPath } from 'node:url'
import { boot, installFailLoud, loadEnv, resolveConfigPath } from '@deepseek-ai/dsh-app-boot'
import { runFixtureTurn } from '@deepseek-ai/dsh-loader-smoke'
import { SessionId } from '@deepseek-ai/dsh-session'
import { SpecId } from '@deepseek-ai/dsh-spec'

const NAME = 'project-delivery-test-driver'
const STAGES = new Set(['requirements', 'link-services', 'coding', 'review', 'design', 'testing', 'release', 'retrospective'])

const [configPath, stage, ...taskParts] = process.argv.slice(2)
if (configPath === undefined || stage === undefined || !STAGES.has(stage)
  || taskParts.length === 0 || taskParts.every(part => part.trim() === '')) {
  throw new Error(`${NAME}: expected <config-path> <stage: ${[...STAGES].join('|')}> <task...>`)
}

// The fixture overlay reads the presets root through the environment because
// the Loader resolves relative row paths against the process cwd, which the
// smoke runner controls. A with-key run points DSH_PROJECT_PROVIDER at the
// real DeepSeek adapter (e.g. `deepseek-official`) and names a model.
process.env.DSH_PROJECT_PRESETS_ROOT = fileURLToPath(new URL('../../presets/', import.meta.url))
process.env.DSH_PROJECT_STAGE = stage
process.env.DSH_PROJECT_SHELL_TOOL = process.platform === 'win32' ? 'pwsh' : 'bash'
const provider = process.env.DSH_PROJECT_PROVIDER ?? 'cli-mock'
const model = process.env.DSH_PROJECT_MODEL ?? 'cli-mock'

const uninstallFailLoud = installFailLoud(NAME)
let ctx: Context | undefined
try {
  loadEnv(NAME)
  const root = await boot(NAME, resolveConfigPath(configPath, undefined))
  ctx = root

  // Demonstrate the durable spec store: write one spec, record one human-gate
  // decision, and emit the committed record. This is the data face the Web
  // GUI drives through the Remote contract and the durable replacement for
  // `specs/*.md` files.
  const specId = SpecId(`project/${stage}`)
  const put = await root.specStore.put({
    specId,
    kind: 'requirements',
    title: `${stage} 规格`,
    projectId: 'project',
    sections: [{ id: 's1', title: '1. 目标', status: 'complete', content: ['目标 A'] }],
    checks: [],
    pendings: [],
    ifVersion: 0,
  })
  const decided = put.ok
    ? await root.specStore.decide({ specId, action: 'approved', who: 'driver', ifVersion: put.value.version })
    : undefined
  process.stdout.write(`${JSON.stringify({ type: 'spec_store', put, decided: decided ?? null })}\n`)

  const handle = await root.agents.create({
    sessionId: SessionId(`project-${stage}`),
    agentOptions: { provider, model },
    meta: { cwd: process.cwd() },
    setup: agentCtx => root.agentPresets.mount(agentCtx, stage).then(() => undefined),
  })
  const assembly = await root.systemPrompt.assemble({ scope: handle.agent })
  process.stdout.write(`${JSON.stringify({
    type: 'preset_assembly',
    stage,
    sections: assembly.sections.map(section => ({ name: section.name, text: section.text })),
    tools: assembly.tools.map(tool => tool.name),
  })}\n`)
  const result = await runFixtureTurn(root, {
    task: taskParts.join(' '),
    onEvent: (sessionId: string, event) => {
      process.stdout.write(`${JSON.stringify({ type: 'session_event', sessionId, event })}\n`)
    },
  })
  process.stdout.write(`${JSON.stringify(result)}\n`)
  await handle.dispose()
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
} finally {
  await ctx?.fiber.dispose()
  uninstallFailLoud()
}
