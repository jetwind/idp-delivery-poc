/**
 * dsh 后端 wire transport 层。
 *
 * 后端是已运行的 dsh 实例（本机 3080）。前端通过 Vite 同源代理把
 * `POST /api/<method>` 转发过去，规避跨站写围栏。wire 契约：
 *   - 请求体：`{ type: 'client-request', rpcId, method, payload }`，
 *     `payload` 直接放业务参数（与 path 末尾的 method 一致）。
 *   - 响应体：`{ type: 'server-response', rpcId, result: { ok, value } | { ok:false, error } }`。
 * 业务错误始终是 HTTP 200 + `result.ok === false`；HTTP 非 200 只表达 carrier 层失败。
 */

/** session.history 返回的事件信封（业务 data 为宽类型，按需读取）。 */
export interface HistoryEvent {
  type: string
  seq: number
  time: number
  data: unknown
}

/** session.history 的单个条目。 */
export interface HistoryEntry {
  event: HistoryEvent
  view?: unknown
}

export interface SessionSummary {
  sessionId: string
  updatedAt: number
  running: boolean
  blank: boolean
  cwd?: string
  agentPreset?: string
  projections?: { asOfSeq: number; values: Record<string, unknown> }
}

export interface RpcError {
  code: string
  message: string
  details: Record<string, unknown>
}

export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: RpcError }

interface ServerResponse<T> {
  type: 'server-response'
  rpcId: string
  result: RpcResult<T>
}

/** 生成请求的 rpcId（浏览器环境可用）。 */
function newRpcId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `rpc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * 底层 RPC 调用：POST /api/<method>，解析 server-response 信封。
 * 业务失败（ok:false）通过抛错暴露，carrier 失败（非 200）也抛错。
 */
async function rpc<T>(method: string, payload: unknown): Promise<T> {
  const body = { type: 'client-request', rpcId: newRpcId(), method, payload }
  let res: Response
  try {
    res = await fetch(`/api/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(`无法连接后端（/api/${method}）：${err instanceof Error ? err.message : String(err)}`)
  }
  if (!res.ok) {
    throw new Error(`后端 carrier 失败（/api/${method}）：HTTP ${res.status}`)
  }
  const envelope = (await res.json()) as ServerResponse<T>
  if (!envelope.result.ok) {
    const e = envelope.result.error
    throw new Error(`后端业务失败（${method}）：${e.code} ${e.message}`)
  }
  return envelope.result.value
}

/** 列出全部会话。 */
export function listSessions(): Promise<{ items: SessionSummary[] }> {
  return rpc('session.list', {})
}

/** 开一个新会话（cwd 为 agent 的工作目录，缺省由后端选择）。 */
export function createSession(opts: { cwd?: string; agentPreset?: string } = {}): Promise<{ sessionId: string; agentPreset?: string }> {
  return rpc('session.create', { cwd: opts.cwd, agentPreset: opts.agentPreset })
}

/**
 * 向会话发一条任务 prompt（queue 模式追加到队列）。
 * 返回后 agent 异步执行，调用方应轮询 history 读回进展。
 */
export function prompt(sessionId: string, text: string): Promise<{ accepted: true }> {
  return rpc('session.prompt', {
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text }],
  })
}

/** 拉取会话历史（按 seq 增量；beforeSeq 不传则取最新窗口尾页）。 */
export function history(sessionId: string, opts: { beforeSeq?: number; maxMessages?: number } = {}): Promise<{
  events: HistoryEntry[]
  hasMore: boolean
  projections?: { asOfSeq: number; values: Record<string, unknown> }
}> {
  return rpc('session.history', {
    sessionId,
    beforeSeq: opts.beforeSeq,
    maxMessages: opts.maxMessages,
  })
}

/** 工具调用结果的文本摘要（用于日志流展示）。 */
function toolCallText(name: string, args: unknown): string {
  let argText = ''
  try {
    argText = typeof args === 'string' ? args : JSON.stringify(args)
  } catch {
    argText = String(args)
  }
  if (argText.length > 200) argText = argText.slice(0, 200) + '…'
  return `工具调用 ${name}${argText ? ` ${argText}` : ''}`
}

export interface DriverLogLine {
  kind: 'assistant' | 'reasoning' | 'tool' | 'user'
  text: string
  seq: number
}

/** 把一个历史事件折叠成一条可读日志（供驱动面板展示执行流）。 */
export function eventToLog(entry: HistoryEntry): DriverLogLine[] {
  const { type, seq, data } = entry.event
  const d = data as Record<string, unknown> | undefined
  if (!d) return []

  if (type === 'assistant/message') {
    const content = (d.message as { content?: Array<{ type: string; text?: string }> } | undefined)?.content ?? []
    const out: DriverLogLine[] = []
    for (const part of content) {
      if (part.type === 'text' && part.text) out.push({ kind: 'assistant', text: part.text, seq })
      else if (part.type === 'reasoning' && part.text) out.push({ kind: 'reasoning', text: part.text, seq })
    }
    return out
  }
  if (type === 'tool/call') {
    return [{ kind: 'tool', text: toolCallText(String(d.name ?? '?'), d.arguments), seq }]
  }
  if (type === 'user/message') {
    const content = (d.message as { content?: Array<{ type: string; text?: string }> } | undefined)?.content ?? []
    const text = content.filter(p => p.type === 'text' && p.text).map(p => p.text).join('\n')
    return text ? [{ kind: 'user', text, seq }] : []
  }
  return []
}

// ---- specStore 域（Remote 端点，/api/{namespace}/{method} 斜杠 + {args:{request}} 包装）----

export type SpecKind = 'requirements' | 'services' | 'implementation' | 'review'
export type SpecStatus = 'submitted' | 'approved' | 'rejected'
export type SpecSectionStatus = 'complete' | 'partial' | 'missing'
export type SpecCheckType = 'blocking' | 'risk' | 'suggestion'
export type SpecDecisionAction = 'approved' | 'rejected' | 'revised'

export interface SpecSection {
  id: string
  title: string
  status: SpecSectionStatus
  content: string[]
}
export interface SpecCheck {
  type: SpecCheckType
  title: string
  desc: string
  action: string
}
export interface SpecPending {
  q: string
  from: string
  who: string
}
export interface SpecDecision {
  action: SpecDecisionAction
  who?: string
  comment?: string
  at: number
}
/** specStore 持久化的规格文档（版本 CAS + 决策日志）。 */
export interface SpecRecord {
  id: string
  kind: SpecKind
  projectId?: string
  title: string
  version: number
  status: SpecStatus
  sections: SpecSection[]
  checks: SpecCheck[]
  pendings: SpecPending[]
  decisions: SpecDecision[]
  createdAt: number
  updatedAt: number
}

/** specStore 业务结果：与 carrier 层 result 同构，再包一层 ok/value|error。 */
export type SpecResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; specId?: string; current?: number | null } }

/** Remote 端点的 payload 固定包装：`{ args: { request } }`。 */
function remoteArgs(request: unknown): { args: { request: unknown } } {
  return { args: { request } }
}

/** 调一个 specStore 方法，解开双层 ok 并抛业务错误。 */
async function specCall<T>(method: string, request: unknown): Promise<T> {
  const result = await rpc<SpecResult<T>>(method, remoteArgs(request))
  if (!result.ok) {
    const e = result.error
    throw new Error(`specStore/${method.split('/')[1]} 失败：${e.code}${e.specId ? ` ${e.specId}` : ''}`)
  }
  return result.value
}

/** 列出规格（可选按项目过滤）。 */
export async function listSpecs(projectId?: string): Promise<SpecRecord[]> {
  const value = await specCall<{ specs: SpecRecord[] }>('specStore/list', { projectId })
  return value.specs
}

/** 读一个规格。 */
export function getSpec(specId: string): Promise<SpecRecord> {
  return specCall<SpecRecord>('specStore/get', { specId })
}

/** 规格写入请求体。 */
export interface SpecPutRequest {
  specId: string
  kind: SpecKind
  title: string
  projectId?: string
  sections?: SpecSection[]
  checks?: SpecCheck[]
  pendings?: SpecPending[]
  ifVersion: number
}

/** 新建或覆盖一个规格（ifVersion 0 新建，否则须匹配当前版本）。 */
export function putSpec(request: SpecPutRequest): Promise<SpecRecord> {
  return specCall<SpecRecord>('specStore/put', request)
}

/** 人工门禁决策（append-only，版本 CAS）。 */
export function decideSpec(request: {
  specId: string
  action: SpecDecisionAction
  who?: string
  comment?: string
  ifVersion: number
}): Promise<SpecRecord> {
  return specCall<SpecRecord>('specStore/decide', request)
}
