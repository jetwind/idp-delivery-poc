/**
 * LangGraph 编排服务（orchestrator/，FastAPI 8080）的 transport 层。
 *
 * 前端通过 Vite 同源代理 `/flow` 访问。流水线是「启动 → 轮询状态 → 处理 pending
 * interrupt（question 回答 / gate 决策）→ resume」的循环。
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
}

// 编排服务直连（带 CORS），不走 Vite proxy：/flow/start 和 /flow/resume 会
// 同步阻塞几分钟（agent 跑），Vite proxy 的长连接会被中间层断开。
const FLOW_BASE = 'http://localhost:8080'

async function flowJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FLOW_BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`编排服务失败（${path}）：HTTP ${res.status}${text ? ` ${text}` : ''}`)
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

/**
 * resume：回答 question（[{id, selected, custom?}]）或给出 gate 决策（"approve"/"reject"）。
 * 同步推进到下一个 interrupt，返回新快照（阻塞几分钟，前端 await）。
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
