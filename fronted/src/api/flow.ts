/**
 * LangGraph 编排服务（orchestrator/，FastAPI 8080）的 transport 层。
 *
 * 前端直连编排服务（带 CORS）。流水线是「启动 → 轮询 state + events → 处理
 * pending interrupt（question 回答 / gate 决策 / approval）→ resume」的循环。
 * start/resume 已异步化（立即返回），图在后台跑。
 */

/** question interrupt 里的单个问题。 */
export interface FlowQuestion {
  id: string
  question: string
  options?: { label: string }[]
  multiSelect?: boolean
  detail?: string
}

export interface QuestionInterrupt {
  type: 'question'
  stage: string
  session_id: string
  rpc_id: string
  questions: FlowQuestion[]
}

export interface GateInterrupt {
  type: 'gate'
  stage: string
  spec_id: string | null
}

export interface ApprovalInterrupt {
  type: 'approval'
  stage: string
  session_id: string
  rpc_id: string
  toolName: string
  reason?: string
}

export type FlowPending = QuestionInterrupt | GateInterrupt | ApprovalInterrupt

export interface FlowSnapshot {
  thread_id: string
  stage_index: number
  stage: string
  done: boolean
  pending: FlowPending | null
  /** 每阶段产出的文件清单（阶段 id → 文件路径列表）。 */
  artifacts: Record<string, string[]>
  /** 当前阶段 agent 会话 id（用于拉取实时日志）。 */
  current_session_id: string | null
  /** 已解析的工作目录（本地绝对路径）。 */
  cwd: string | null
  /** 后台图运行错误（有则显示）。 */
  error: string | null
}

/** 一条实时活动日志（由编排层从 session.history 摘要而来）。 */
export interface FlowEvent {
  seq: number
  type: 'user' | 'assistant' | 'tool' | 'tool_result'
  session_id?: string
  stage?: string
  text?: string
  toolName?: string
  input?: string
  ok?: boolean
  source?: string | null
}

export interface FlowEvents {
  thread_id: string
  session_id: string | null
  running: boolean
  stage: string
  events: FlowEvent[]
}

/** 工作区里的一个文件（相对 cwd 的路径）。 */
export interface FlowFile {
  path: string
  size: number
}

export interface FlowFiles {
  thread_id: string
  cwd: string | null
  files: FlowFile[]
}

export interface FlowFileContent {
  path: string
  content: string
  truncated: boolean
}

// 编排服务直连（带 CORS）。/flow/start、/flow/resume 已异步化（立即返回），
// 前端轮询 /flow/state（阶段/待处理项）与 /flow/events（实时日志）。
// 注意用 127.0.0.1 而非 localhost：uvicorn 只监听 IPv4，localhost 会先解析到
// IPv6 ::1 再回退，每个请求多 3-5s，轮询堆积会把 resume 卡住。
const FLOW_BASE = 'http://127.0.0.1:8080'

async function flowJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FLOW_BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let detail = text
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed.detail === 'string') detail = parsed.detail
      else if (Array.isArray(parsed.detail)) detail = parsed.detail.map((d: any) => d.msg ?? JSON.stringify(d)).join('; ')
    } catch { /* 非 JSON 时用原文 */ }
    throw new Error(`编排服务失败（${path}）：HTTP ${res.status}${detail ? ` ${detail}` : ''}`)
  }
  return res.json() as Promise<T>
}

/** 启动流水线：输入需求文本 + 工作目录，返回首个快照。 */
export function startFlow(requirementText: string, cwd: string): Promise<FlowSnapshot> {
  return flowJson('/flow/start', {
    method: 'POST',
    body: JSON.stringify({ requirement_text: requirementText, cwd }),
  })
}

/** 读当前阶段 + 待处理的 interrupt。 */
export function getFlowState(threadId: string): Promise<FlowSnapshot> {
  return flowJson(`/flow/state/${threadId}`)
}

/** 读当前阶段 session 的最近事件流（实时日志）。 */
export function getFlowEvents(threadId: string): Promise<FlowEvents> {
  return flowJson(`/flow/events/${threadId}`)
}

/** 列举工作目录下的文件清单。 */
export function getFlowFiles(threadId: string): Promise<FlowFiles> {
  return flowJson(`/flow/files/${threadId}`)
}

/** 读取工作目录下某个文件的内容。 */
export function getFlowFile(threadId: string, path: string): Promise<FlowFileContent> {
  return flowJson(`/flow/file/${threadId}?path=${encodeURIComponent(path)}`)
}

/**
 * resume：回答 question（[{id, selected, custom?}]）、给出 gate 决策（"approve"/"reject"）
 * 或 approval 决策（"allowed-once"/"rejected"）。异步推进到下一个 interrupt（立即返回）。
 */
export function resumeFlow(threadId: string, answer: unknown): Promise<FlowSnapshot> {
  return flowJson(`/flow/resume/${threadId}`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  })
}

/** 阶段列表（用于渲染阶段条）。 */
export function getStages(): Promise<{ id: string; name: string }[]> {
  return flowJson('/flow/stages')
}

// ---- standards 管理（阶段标准文件 CRUD，后台 UI 维护，经 MCP 给 harness）----

export interface StandardsStage {
  stage: string
  name: string
  files: string[]
}

export interface StandardsTree {
  stages: StandardsStage[]
}

export interface StandardFile {
  stage: string
  name: string
  content: string
}

/** 各阶段标准文件清单。 */
export function getStandardsTree(): Promise<StandardsTree> {
  return flowJson('/standards/tree')
}

/** 读某标准文件内容。 */
export function readStandard(stage: string, name: string): Promise<StandardFile> {
  return flowJson(`/standards/file?stage=${encodeURIComponent(stage)}&name=${encodeURIComponent(name)}`)
}

/** 写/更新某标准文件内容。 */
export function writeStandard(stage: string, name: string, content: string): Promise<{ ok: boolean }> {
  return flowJson(`/standards/file?stage=${encodeURIComponent(stage)}&name=${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })
}

/** 删除某标准文件。 */
export function deleteStandard(stage: string, name: string): Promise<{ ok: boolean }> {
  return flowJson(`/standards/file?stage=${encodeURIComponent(stage)}&name=${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
}
