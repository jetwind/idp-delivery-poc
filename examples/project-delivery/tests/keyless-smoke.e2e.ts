import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LOADER_SMOKE_TEST_TIMEOUT_MS, runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'
import type { SessionEvent } from '@deepseek-ai/dsh-session'

const binScript = fileURLToPath(new URL('./fixtures/project-delivery-driver.ts', import.meta.url))
const configPath = fileURLToPath(new URL('./fixtures/cli.cordis.yml', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../tsconfig.json', import.meta.url))

const shellTool = process.platform === 'win32' ? 'pwsh' : 'bash'

// The "existing services" input the link-services stage reads, mirroring the
// Hive service library the Web prototype's LinkService sheet browses.
const SERVICE_LIBRARY = [
  '# 微服务库（服务关联阶段输入）',
  '| 服务 | 中文名 | 版本 | 所属 | 说明 |',
  '| --- | --- | --- | --- | --- |',
  '| base-master-data | 主数据服务 | v3.1.2 | 平台组 | 主数据与编码管理 |',
  '| base-auth-center | 统一认证中心 | v4.0.1 | 平台组 | 认证与权限 |',
  '| trace-rule-engine | 追溯规则引擎 | v1.5.0 | 追溯产品组 | 防窜货/预警规则 |',
  '| data-sync-hub | 数据同步中心 | v2.3.1 | 数据组 | 异构系统同步与 CDC |',
  '| base-msg-center | 消息中心 | v2.6.0 | 平台组 | 站内信/短信/邮件 |',
].join('\n')

interface PresetAssembly {
  type: 'preset_assembly'
  stage: string
  sections: Array<{ name: string; text: string }>
  tools: string[]
}

interface StageRun {
  assembly: PresetAssembly
  events: SessionEvent[]
  result: Record<string, unknown>
  specStore?: Record<string, unknown>
}

async function runStage(stage: string, task: string, mock = 'text'): Promise<StageRun> {
  const { stdout, stderr } = await runLoaderSmoke({
    label: `project-delivery-${stage}`,
    tempDirPrefix: `project-delivery-${stage}-`,
    binScript,
    libBinScript: binScript,
    configPath,
    binArgs: [configPath, stage, task],
    tsconfigPath,
    env: { DSH_PROJECT_MOCK: mock },
    // Cold tsx boots of the full spine occasionally exceed the 30-second
    // default on slow hosts; the extra headroom avoids retry flake.
    processTimeoutMs: 60_000,
    prepare: async (cwd) => {
      await writeFile(join(cwd, 'service-library.md'), SERVICE_LIBRARY, 'utf8')
    },
  })
  expect(stderr).toBe('')
  const lines = stdout.trimEnd().split('\n').map(line => JSON.parse(line) as Record<string, unknown>)
  const assembly = lines.find(line => line['type'] === 'preset_assembly') as PresetAssembly | undefined
  if (assembly === undefined) throw new Error(`driver did not emit a preset_assembly record: ${stdout}`)
  const events = lines
    .filter(line => line['type'] === 'session_event')
    .map(line => line['event'] as SessionEvent)
  const result = lines.at(-1)
  if (result === undefined || result['type'] !== 'result') throw new Error(`driver did not emit a result record: ${stdout}`)
  const specStore = lines.find(line => line['type'] === 'spec_store') as Record<string, unknown> | undefined
  return { assembly, events, result, ...(specStore === undefined ? {} : { specStore }) }
}

function personaOf(run: StageRun): string {
  const section = run.assembly.sections.find(section => section.name === 'deployment:persona')
  if (section === undefined) throw new Error(`no persona section in ${run.assembly.stage} assembly`)
  return section.text
}

interface StageExpectation {
  marker: string
  withShell: boolean
  withDelegation: boolean
  withPlan: boolean
  withAsk: boolean
  withSpec: boolean
}

const STAGE_EXPECTATIONS: Record<string, StageExpectation> = {
  requirements: { marker: '需求分析师', withShell: false, withDelegation: false, withPlan: false, withAsk: true, withSpec: true },
  'link-services': { marker: '服务架构师', withShell: false, withDelegation: false, withPlan: false, withAsk: true, withSpec: true },
  coding: { marker: '软件工程师', withShell: true, withDelegation: true, withPlan: false, withAsk: false, withSpec: true },
  review: { marker: '代码评审专家', withShell: false, withDelegation: false, withPlan: false, withAsk: true, withSpec: true },
  design: { marker: '软件架构师', withShell: false, withDelegation: false, withPlan: true, withAsk: false, withSpec: false },
  testing: { marker: '测试工程师', withShell: true, withDelegation: false, withPlan: false, withAsk: false, withSpec: false },
  release: { marker: '发布经理', withShell: true, withDelegation: false, withPlan: false, withAsk: true, withSpec: false },
  retrospective: { marker: '复盘主持人', withShell: false, withDelegation: false, withPlan: false, withAsk: true, withSpec: false },
}

describe('project-delivery stage presets', () => {
  for (const [stage, expected] of Object.entries(STAGE_EXPECTATIONS)) {
    it(`composes ${stage} with its own persona and tool set`, async () => {
      const run = await runStage(stage, `run the ${stage} stage`)
      expect(personaOf(run)).toContain(expected.marker)
      expect(run.assembly.tools).toContain('read')
      expect(run.assembly.tools).toContain('todo_write')
      expect(run.assembly.tools.includes(shellTool)).toBe(expected.withShell)
      expect(run.assembly.tools.includes('subagent')).toBe(expected.withDelegation)
      expect(run.assembly.tools.includes('workflow')).toBe(expected.withDelegation)
      expect(run.assembly.tools.includes('ralph')).toBe(expected.withDelegation)
      expect(run.assembly.tools.includes('exit_plan_mode')).toBe(expected.withPlan)
      expect(run.assembly.tools.includes('ask_user_question')).toBe(expected.withAsk)
      expect(run.assembly.tools.includes('spec_read')).toBe(expected.withSpec)
      expect(run.result['output']).toBe(`[${stage}] lifecycle turn complete`)
      expect(run.result['usage']).toBeDefined()
    }, LOADER_SMOKE_TEST_TIMEOUT_MS)
  }

  it('runs a real shell tool round trip through the coding stage', async () => {
    const run = await runStage('coding', 'prove the shell path', 'roundtrip')
    const call = run.events.find(event => event.type === 'tool/call' && event.data.name === shellTool)
    expect(call).toBeDefined()
    expect(run.result['output']).toContain('PROJECT_STAGE_SHELL_ROUND_TRIP')
    expect(personaOf(run)).toContain('软件工程师')
  }, LOADER_SMOKE_TEST_TIMEOUT_MS)

  it('pauses for a human gate, answers it, and resumes the turn', async () => {
    const run = await runStage('requirements', '定稿需求规格', 'gate')
    const call = run.events.find(event => event.type === 'tool/call' && event.data.name === 'ask_user_question')
    expect(call).toBeDefined()
    // The auto-confirming provider picks the first option, so the resolved
    // gate reflects the human's 确认通过 choice.
    expect(run.result['output']).toContain('gate resolved')
    expect(run.result['output']).toContain('确认通过')
  }, LOADER_SMOKE_TEST_TIMEOUT_MS)

  it('stores a spec and records a human-gate decision durably', async () => {
    const run = await runStage('requirements', 'store the requirements spec')
    const put = run.specStore?.['put'] as { ok: boolean; value?: { version: number; status: string } } | undefined
    const decided = run.specStore?.['decided'] as { ok: boolean; value?: { version: number; status: string; decisions: unknown[] } } | undefined
    expect(put?.ok).toBe(true)
    expect(put?.value?.version).toBe(1)
    expect(put?.value?.status).toBe('submitted')
    expect(decided?.ok).toBe(true)
    expect(decided?.value?.status).toBe('approved')
    expect(decided?.value?.version).toBe(2)
    expect(decided?.value?.decisions).toHaveLength(1)
  }, LOADER_SMOKE_TEST_TIMEOUT_MS)
})
