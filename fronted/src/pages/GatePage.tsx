import { useEffect, useState } from 'react'
import { useSpecStore } from '@/hooks/useSpecStore'
import { decideSpec, getSpec, type SpecDecisionAction, type SpecRecord } from '@/api/dsh'
import { checkTypeLabel, decisionActionLabel, formatTime, specStatusLabel } from '@/api/spec'
import { PageHeader, Section, Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ShieldCheck, CircleAlert, AlertTriangle, Lightbulb, CheckCircle2, PencilLine, Undo2, History, Loader2, TriangleAlert } from 'lucide-react'

const issueIcon: Record<string, any> = { 阻断问题: CircleAlert, 风险问题: AlertTriangle, 优化建议: Lightbulb }
const issueTone: Record<string, string> = { 阻断问题: 'red', 风险问题: 'amber', 优化建议: 'cyan' }

const DECIDE_ACTIONS: { action: SpecDecisionAction; label: string; cls: string }[] = [
  { action: 'approved', label: '确认通过', cls: 'bg-emerald-600 hover:bg-emerald-700' },
  { action: 'revised', label: '修改后通过', cls: 'bg-indigo-600 hover:bg-indigo-700' },
  { action: 'rejected', label: '退回', cls: 'border-rose-200 text-rose-600 hover:bg-rose-50' },
]

export default function GatePage() {
  const { specs } = useSpecStore()
  const pendingSpec = specs.find(s => s.status === '待确认') ?? specs[0]
  const [specId, setSpecId] = useState<string | null>(null)
  const [spec, setSpec] = useState<SpecRecord | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const activeId = specId ?? pendingSpec?.id ?? null

  useEffect(() => {
    if (!activeId) { setSpec(null); return }
    let cancelled = false
    getSpec(activeId)
      .then(r => { if (!cancelled) setSpec(r) })
      .catch(() => { if (!cancelled) setSpec(null) })
    return () => { cancelled = true }
  }, [activeId])

  const decide = async (action: SpecDecisionAction) => {
    if (!spec) return
    setBusy(true)
    setMsg(null)
    try {
      const updated = await decideSpec({
        specId: spec.id, action, who: '张明远', comment: comment.trim() || undefined, ifVersion: spec.version,
      })
      setSpec(updated)
      setComment('')
      setMsg(`已「${decisionActionLabel[action]}」，版本推进至 V${updated.version} · ${specStatusLabel[updated.status]}`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Evaluation / Human Gate"
        desc="AI 质量评估 + 人工最终确认与授权 · 决策写入 specStore 决策日志（append-only，不可篡改）"
        extra={
          <select
            value={activeId ?? ''}
            onChange={e => setSpecId(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {specs.map(s => (
              <option key={s.id} value={s.id}>{s.name} · {s.version}</option>
            ))}
          </select>
        }
      />

      {spec === null ? (
        <div className="flex items-center justify-center h-40 text-sm text-slate-400">
          {activeId ? '规格加载中…' : '暂无规格可评审'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Evaluation 面板（checks） */}
          <Section title="Evaluation 质量评估" desc={`评估对象：${spec.title} · V${spec.version}`}
            extra={<Pill tone="violet" dot>specStore</Pill>}>
            <div className="pt-1 flex items-center gap-4">
              <div className="text-xs text-slate-500">
                阻断 {spec.checks.filter(c => c.type === 'blocking').length} · 风险 {spec.checks.filter(c => c.type === 'risk').length} · 建议 {spec.checks.filter(c => c.type === 'suggestion').length}
              </div>
              <Pill tone={spec.checks.some(c => c.type === 'blocking') ? 'red' : 'green'}>
                {spec.checks.some(c => c.type === 'blocking') ? '存在阻断问题' : '无阻断问题'}
              </Pill>
            </div>
            <div className="mt-4 space-y-2">
              {spec.checks.length === 0 && <div className="text-xs text-slate-400">暂无检查问题。</div>}
              {spec.checks.map(c => {
                const Icon = issueIcon[checkTypeLabel[c.type]]
                return (
                  <div key={c.title} className="flex items-start gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5">
                    <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', c.type === 'blocking' ? 'text-rose-500' : c.type === 'risk' ? 'text-amber-500' : 'text-cyan-500')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Pill tone={issueTone[checkTypeLabel[c.type]] as any}>{checkTypeLabel[c.type]}</Pill>
                      </div>
                      <div className="mt-1 text-[13px] text-slate-800">{c.title}</div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{c.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>

          <div className="space-y-4">
            {/* Human Gate 待决策 */}
            <Section title="Human Gate 待确认" desc={`${spec.title} · V${spec.version}`} extra={<Pill tone="amber" dot>{specStatusLabel[spec.status]}</Pill>}>
              <div className="pt-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 px-3.5 py-3"><div className="text-[11px] text-slate-400">待确认对象</div><div className="mt-1 text-[13px] font-medium text-slate-800">{spec.title}</div></div>
                  <div className="rounded-lg bg-slate-50 px-3.5 py-3"><div className="text-[11px] text-slate-400">当前版本</div><div className="mt-1 font-mono text-[13px] font-medium text-indigo-600">V{spec.version}</div></div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">待决策事项（{spec.pendings.length}）</div>
                  <div className="space-y-2.5">
                    {spec.pendings.length === 0 && <div className="text-xs text-slate-400">无待决策事项。</div>}
                    {spec.pendings.map(p => (
                      <div key={p.q} className="rounded-lg border border-slate-200 p-3.5">
                        <div className="text-[13px] font-medium text-slate-800 leading-5">{p.q}</div>
                        <p className="mt-1 text-xs text-slate-500 leading-5">{p.from}</p>
                        <div className="mt-2"><Pill tone="amber">{p.who}</Pill></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1.5">确认意见</div>
                  <Textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="填写确认意见（将计入决策记录）…" />
                </div>

                {msg && (
                  <div className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-xs', msg.includes('失败') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700')}>
                    <TriangleAlert className="w-3.5 h-3.5 shrink-0" />{msg}
                  </div>
                )}

                <div className="flex gap-2">
                  {DECIDE_ACTIONS.map(a => (
                    <Button key={a.action} disabled={busy} variant={a.action === 'approved' || a.action === 'revised' ? undefined : 'outline'}
                      className={cn('flex-1', a.cls)} onClick={() => decide(a.action)}>
                      {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : a.action === 'approved' ? <CheckCircle2 className="w-4 h-4 mr-1" /> : a.action === 'revised' ? <PencilLine className="w-4 h-4 mr-1" /> : <Undo2 className="w-4 h-4 mr-1" />}
                      {a.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Section>

            {/* 决策记录（decisions） */}
            <Section title="决策记录" desc="确认人 · 时间 · 动作 · 意见" extra={<History className="w-4 h-4 text-slate-300" />}>
              <div className="pt-1 space-y-2">
                {spec.decisions.length === 0 && <div className="text-xs text-slate-400">尚无决策记录。</div>}
                {[...spec.decisions].reverse().map((d, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5">
                    <Pill tone={d.action === 'approved' ? 'green' : d.action === 'revised' ? 'blue' : 'amber'}>{decisionActionLabel[d.action]}</Pill>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-700">{d.who ?? '—'}</div>
                      <div className="text-[11px] text-slate-400">{d.comment ?? '（无意见）'}</div>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">{formatTime(d.at)}</span>
                  </div>
                ))}
              </div>
            </Section>

            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
              <p className="text-xs leading-5 text-slate-600">决策通过 specStore.decide 写入，版本 CAS 校验 + append-only 决策日志，纳入项目基线不可篡改。</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
