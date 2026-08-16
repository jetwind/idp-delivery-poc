import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Section, Pill, Bar, AIPill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Bot, Activity, Wallet, ShieldAlert, UserCheck, ArrowRight, Sparkles,
  CircleDollarSign, Gauge, AlertTriangle, CheckCircle2, RotateCcw,
} from 'lucide-react'
import {
  getCockpit, getAgentsCost, getAgentsAudit,
  type CockpitData, type CockpitItem, type AgentsCost, type AuditRecord,
} from '@/api/flow'

const STAGE_COUNT = 5

/** 等待人工的 interrupt 类型 → 徽章样式。 */
const waitTone: Record<string, 'amber' | 'red' | 'violet' | 'cyan'> = {
  gate: 'amber', question: 'red', approval: 'cyan',
}

/** 审计记录 outcome → 徽章样式。 */
function auditTone(kind: string, outcome: string): { tone: 'green' | 'amber' | 'rose' | 'slate'; label: string } {
  if (kind === 'approval') {
    if (['拒绝', 'rejected', 'reject'].includes(outcome)) return { tone: 'rose', label: '已拒绝' }
    return { tone: 'green', label: '已批准' }
  }
  if (kind === 'gate') {
    if (['revise', '退回'].includes(outcome)) return { tone: 'amber', label: '退回' }
    return { tone: 'green', label: '通过' }
  }
  return { tone: 'slate', label: outcome || '—' }
}

function flowHref(item: CockpitItem): string {
  return `/projects/${item.project_id}/versions/${item.version_id}/flow`
}

export default function AICockpit() {
  const nav = useNavigate()
  const [data, setData] = useState<CockpitData | null>(null)
  const [cost, setCost] = useState<AgentsCost | null>(null)
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  // 流水线实时状态：每 8s 轮询一次（轻量；只查有 thread 的版本 checkpoint）。
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const d = await getCockpit()
        if (!cancelled) setData(d)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    }
    load()
    const t = setInterval(load, 8000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  // 成本 / 审计：一次性拉取。
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [c, a] = await Promise.all([getAgentsCost(), getAgentsAudit()])
        if (cancelled) return
        setCost(c)
        setAudits(a.audits)
      } catch { /* 成本/审计失败不影响驾驶舱主视图 */ }
    })()
    return () => { cancelled = true }
  }, [])

  const s = data?.summary
  const running = data?.running ?? []
  const waiting = [...(data?.waiting ?? []), ...(data?.orphaned ?? [])]

  return (
    <div>
      {/* 顶部说明 */}
      <div className="rounded-lg border border-violet-200/70 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white px-6 py-5 mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <AIPill>AI 驾驶舱</AIPill>
            <h1 className="text-lg font-semibold">AI 正在推进项目，人在关键节点确认与补全</h1>
          </div>
          <p className="mt-1.5 text-xs text-indigo-100">
            执行中 {s?.running ?? 0} 项 · 等待人工 {s?.waiting ?? 0} 项 · 已交付 {s?.delivered ?? 0} 项 · 共 {s?.versions ?? 0} 个版本 / {s?.projects ?? 0} 个项目
          </p>
        </div>
        <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => nav('/agents')}>
          <Bot className="w-4 h-4 mr-1.5" />数字员工中心
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-600">
          驾驶舱数据加载失败：{error}
        </div>
      )}

      {/* 指标 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { icon: Activity, label: '执行中任务', value: `${s?.running ?? 0} 项`, sub: '后台流水线实时推进', tone: 'text-violet-600 bg-violet-50' },
          { icon: UserCheck, label: '等待人工介入', value: `${s?.waiting ?? 0} 项`, sub: `${s?.orphaned ?? 0} 项待继续执行`, tone: 'text-amber-600 bg-amber-50' },
          { icon: ShieldAlert, label: '已交付', value: `${s?.delivered ?? 0} 项`, sub: `另有 ${s?.idle ?? 0} 个版本未启动`, tone: 'text-emerald-600 bg-emerald-50' },
          { icon: Wallet, label: '本月 AI 成本', value: `¥${(cost?.totalCost ?? 0).toLocaleString()}`, sub: `${((cost?.totalTokens ?? 0) / 1000).toFixed(0)}K tokens 累计`, tone: 'text-cyan-600 bg-cyan-50' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-lg border border-slate-200/80 px-4 py-4 flex items-center gap-3.5">
            <span className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', m.tone)}><m.icon className="w-5 h-5" /></span>
            <div className="min-w-0">
              <div className="text-xs text-slate-400">{m.label}</div>
              <div className="text-lg font-semibold text-slate-800 leading-6">{m.value}</div>
              <div className="text-[11px] text-slate-400 truncate">{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* AI 正在执行 */}
        <Section title="AI 正在执行" desc="跨项目实时任务进度" extra={<Pill tone="violet" dot>{running.length} 项</Pill>}>
          <div className="space-y-3 pt-1">
            {running.length === 0 && <div className="text-xs text-slate-400 py-4 text-center">当前没有正在执行的流水线</div>}
            {running.map(r => (
              <button key={r.version_id} onClick={() => nav(flowHref(r))}
                className="w-full rounded-lg border border-violet-100 bg-violet-50/40 p-4 text-left hover:border-violet-300 transition-colors">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-violet-600" />
                  <span className="text-[13px] font-semibold text-slate-800 truncate">{r.project_name} · {r.version_name}</span>
                  <Pill tone="blue" className="ml-auto">{r.stage ?? '执行中'}</Pill>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <Bar value={(r.stage_index / STAGE_COUNT) * 100} className="flex-1" tone="bg-violet-500" />
                  <span className="text-xs font-semibold text-violet-600">{Math.round((r.stage_index / STAGE_COUNT) * 100)}%</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>第 {Math.min(r.stage_index + 1, STAGE_COUNT)}/{STAGE_COUNT} 阶段</span>
                  <span className="inline-flex items-center gap-1 text-violet-600 font-medium">查看执行详情<ArrowRight className="w-3 h-3" /></span>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* 等待人工介入 */}
        <Section title="等待人工介入" desc="AI 已就位，需要人确认、补全或决策" extra={<Pill tone="amber" dot>{waiting.length} 项</Pill>}>
          <div className="space-y-2 pt-1">
            {waiting.length === 0 && <div className="text-xs text-slate-400 py-4 text-center">当前没有需要人工介入的项</div>}
            {waiting.map(w => {
              const orphaned = !w.pending_label
              return (
                <button key={w.version_id} onClick={() => nav(flowHref(w))}
                  className="w-full flex items-center gap-3 rounded-lg border border-slate-100 px-3.5 py-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors text-left group">
                  {orphaned ? (
                    <Pill tone="slate"><RotateCcw className="w-3 h-3" />可继续</Pill>
                  ) : (
                    <Pill tone={waitTone[w.pending_type ?? ''] ?? 'slate'}>{w.pending_label}</Pill>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-slate-800 truncate">{w.project_name} · {w.version_name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{orphaned ? '编排层重启后暂停，点击继续执行' : `阶段：${w.stage ?? '—'}`}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 shrink-0" />
                </button>
              )
            })}
          </div>
        </Section>

        {/* 安全与策略命中 */}
        <Section title="安全与人工确认" desc="审批与 gate 决策记录" extra={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => nav('/agents')}>全部审计日志</Button>}>
          <div className="space-y-2.5 pt-1">
            {audits.length === 0 && <div className="text-xs text-slate-400 py-4 text-center">暂无审批 / gate 记录</div>}
            {audits.slice(0, 6).map(a => {
              const t = auditTone(a.kind, a.outcome)
              return (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5">
                  {a.kind === 'approval'
                    ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                    : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs leading-5 text-slate-700">{a.detail}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400 font-mono">
                      {a.agent} · {new Date(a.ts).toLocaleString()}
                    </div>
                  </div>
                  <Pill tone={t.tone}>{t.label}</Pill>
                </div>
              )
            })}
          </div>
        </Section>

        {/* 成本概览 */}
        <Section title="AI 成本概览" desc="按数字员工（阶段 agent）聚合" extra={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => nav('/agents')}>成本明细</Button>}>
          <div className="pt-1">
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-xs text-slate-500">累计成本（估算）</span>
              <span className="text-[15px]"><b className="text-slate-800">¥{(cost?.totalCost ?? 0).toLocaleString()}</b></span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-3">
              {[
                { icon: CircleDollarSign, label: '会话数', value: `${(cost?.agents ?? []).reduce((n, a) => n + a.sessions, 0)}` },
                { icon: Gauge, label: '总 tokens', value: `${((cost?.totalTokens ?? 0) / 1000).toFixed(0)}K` },
                { icon: Sparkles, label: '数字员工', value: `${cost?.agents.length ?? 0} 个` },
              ].map(m => (
                <div key={m.label} className="rounded-lg bg-slate-50 px-3 py-3 text-center">
                  <m.icon className="w-4 h-4 text-slate-400 mx-auto" />
                  <div className="mt-1.5 text-[15px] font-semibold text-slate-800">{m.value}</div>
                  <div className="text-[11px] text-slate-400">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3.5 space-y-1.5">
              {(cost?.agents ?? []).filter(a => a.cost > 0).sort((x, y) => y.cost - x.cost).map(a => (
                <div key={a.id} className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 w-20 truncate">{a.name}</span>
                  <Bar value={cost && cost.totalCost ? (a.cost / cost.totalCost) * 100 : 0} className="flex-1" tone="bg-emerald-500" />
                  <span className="text-slate-400 w-14 text-right">¥{a.cost}</span>
                </div>
              ))}
              {(cost?.agents ?? []).every(a => a.cost === 0) && (
                <div className="text-[11px] text-slate-400">暂无 token 消耗记录。</div>
              )}
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
