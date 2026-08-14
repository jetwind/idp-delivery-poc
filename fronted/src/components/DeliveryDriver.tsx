import { useDeliveryDriver, DELIVERY_STAGES } from '@/hooks/useDeliveryDriver'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PlugZap, Play, Square, Loader2, Bot, Wrench, Brain, User, CheckCircle2, TriangleAlert } from 'lucide-react'

/** 后端联调目标（前端实际走 Vite 同源代理 /api → 该地址）。 */
const BACKEND_LABEL = 'dsh 后端 · 127.0.0.1:3080（Vite 同源代理）'

/** 驱动流程时给新会话的工作目录与任务 prompt。 */
const DEFAULT_CWD = 'D:/ccn-work/src/github/deepseek-harness-delivery/examples/project-delivery'
const DEFAULT_TASK = `你是AI 交付平台的执行 agent，正在为项目「全域产品追溯平台建设项目」执行【需求】阶段。
请先浏览当前工作目录了解项目结构，然后在当前目录下创建 specs/requirements.md，写入 3 条核心需求（每条含：需求名、优先级、验收标准）。完成后用一句话报告结果。`

const statusMeta: Record<string, { label: string; cls: string }> = {
  idle: { label: '未连接', cls: 'bg-slate-100 text-slate-500' },
  connecting: { label: '连接中…', cls: 'bg-indigo-100 text-indigo-600' },
  ready: { label: '后端可达', cls: 'bg-emerald-100 text-emerald-600' },
  running: { label: '执行中', cls: 'bg-violet-100 text-violet-600' },
  done: { label: '已完成', cls: 'bg-emerald-100 text-emerald-600' },
  error: { label: '出错', cls: 'bg-rose-100 text-rose-600' },
}

const logIcon = {
  assistant: Bot, reasoning: Brain, tool: Wrench, user: User,
} as const

export default function DeliveryDriver() {
  const { status, sessionId, logs, error, sessionCount, connect, start, stop } = useDeliveryDriver()
  const meta = statusMeta[status]
  const busy = status === 'running' || status === 'connecting'

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-6 py-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlugZap className="w-4 h-4 text-indigo-500" />
          <h2 className="text-[15px] font-semibold text-slate-800">后端联动 · AI 驱动流程</h2>
          <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium', meta.cls)}>
            {busy && <Loader2 className="w-3 h-3 animate-spin" />}
            {meta.label}
          </span>
          {sessionCount !== null && <span className="text-[11px] text-slate-400">后端现有 {sessionCount} 个会话</span>}
        </div>
        <div className="flex items-center gap-2">
          {status === 'idle' || status === 'error' ? (
            <Button size="sm" variant="outline" onClick={() => connect()}>连接后端</Button>
          ) : null}
          <Button size="sm" disabled={busy} onClick={() => start(DEFAULT_CWD, DEFAULT_TASK)}>
            {status === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            启动「需求」阶段
          </Button>
          {status === 'running' ? (
            <Button size="sm" variant="outline" onClick={() => stop()}><Square className="w-3.5 h-3.5" />停止</Button>
          ) : null}
        </div>
      </div>

      {/* 阶段条 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {DELIVERY_STAGES.map((s, i) => (
          <span key={s} className={cn(
            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium border',
            i === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200',
          )}>
            {i === 0 && status === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className={cn('w-3 h-3', i === 0 ? 'text-white' : 'text-slate-300')} />}
            {s}
          </span>
        ))}
        <span className="text-[11px] text-slate-400">后端 dsh 会在新会话中逐阶段执行，前端轮询读回进展</span>
      </div>

      {/* 连接信息 */}
      <div className="mb-3 text-[11px] text-slate-400 font-mono truncate">
        {BACKEND_LABEL}
        {sessionId ? ` · 会话 ${sessionId}` : ''}
      </div>

      {/* 错误 */}
      {error ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      ) : null}

      {/* 执行日志流 */}
      <div className="rounded-lg border border-slate-100 bg-slate-50/60 max-h-72 overflow-y-auto p-3 space-y-2 min-h-[120px]">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-slate-400">
            {status === 'running' ? '等待 agent 产出…' : '点「启动「需求」阶段」，前端开新会话驱动后端执行，执行过程实时回显在这里'}
          </div>
        ) : (
          logs.map((line, i) => {
            const Icon = logIcon[line.kind]
            return (
              <div key={`${line.seq}-${i}`} className="flex gap-2 text-xs leading-5">
                <span className={cn(
                  'mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0',
                  line.kind === 'assistant' ? 'bg-violet-100 text-violet-600'
                    : line.kind === 'reasoning' ? 'bg-slate-200 text-slate-500'
                      : line.kind === 'tool' ? 'bg-cyan-100 text-cyan-600'
                        : 'bg-blue-100 text-blue-600',
                )}>
                  <Icon className="w-2.5 h-2.5" />
                </span>
                <span className={cn(
                  'whitespace-pre-wrap break-words flex-1',
                  line.kind === 'reasoning' ? 'text-slate-400' : line.kind === 'tool' ? 'text-cyan-700 font-mono text-[11px]' : 'text-slate-700',
                )}>
                  {line.kind === 'tool' ? line.text : line.text}
                </span>
              </div>
            )
          })
        )}
        {status === 'done' && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />agent 已执行完成，可在上方会话中查看结果
          </div>
        )}
      </div>
    </div>
  )
}
