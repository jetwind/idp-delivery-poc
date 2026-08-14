import { useCallback, useEffect, useRef, useState } from 'react'
import { getFlowState, resumeFlow, startFlow, type FlowQuestion, type FlowSnapshot, type QuestionInterrupt } from '@/api/flow'
import { PageHeader, Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Play, Loader2, CheckCircle2, XCircle, Send, RotateCcw, Sparkles, ShieldCheck, FileText, TriangleAlert } from 'lucide-react'

const STAGES = [
  { id: 'requirements', name: '需求分析' },
  { id: 'design', name: '架构设计' },
  { id: 'coding', name: '代码编写' },
  { id: 'testing', name: '测试验证' },
]

const DEFAULT_CWD = 'D:/ccn-work/src/github/deepseek-harness-delivery/examples/project-delivery'

export default function FlowPage() {
  const [requirement, setRequirement] = useState('')
  const [cwd, setCwd] = useState(DEFAULT_CWD)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<FlowSnapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [customs, setCustoms] = useState<Record<string, string>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  // 启动后轮询状态。
  useEffect(() => {
    if (!threadId) return
    const tick = async () => {
      try {
        const snap = await getFlowState(threadId)
        setSnapshot(snap)
        if (snap.done && snap.pending === null) stopPolling()
      } catch { /* 单次轮询失败不断流 */ }
    }
    tick()
    timerRef.current = setInterval(tick, 2000)
    return stopPolling
  }, [threadId, stopPolling])

  async function handleStart() {
    if (!requirement.trim()) return
    setBusy(true); setError(null); setSnapshot(null)
    try {
      const snap = await startFlow(requirement.trim(), cwd.trim())
      setThreadId(snap.thread_id)
      setSnapshot(snap)
      setAnswers({}); setCustoms({})
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function submitAnswer() {
    if (!snapshot || snapshot.pending?.type !== 'question') return
    const q = snapshot.pending as QuestionInterrupt
    const payload = q.questions.map(item => {
      const selected = answers[item.id] ?? []
      const custom = customs[item.id]
      return custom ? { id: item.id, selected, custom } : { id: item.id, selected }
    })
    setBusy(true); setError(null)
    try {
      const snap = await resumeFlow(threadId!, payload)
      setSnapshot(snap)
      setAnswers({}); setCustoms({})
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function submitGate(decision: 'approve' | 'reject') {
    setBusy(true); setError(null)
    try {
      const snap = await resumeFlow(threadId!, decision)
      setSnapshot(snap)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    stopPolling()
    setThreadId(null); setSnapshot(null); setError(null); setAnswers({}); setCustoms({})
  }

  const pending = snapshot?.pending ?? null
  const stageIndex = snapshot?.stage_index ?? 0

  return (
    <div>
      <PageHeader
        title="AI 交付流水线"
        desc="输入需求 → 需求→设计→编码→测试逐阶段由 harness agent 真实执行，每阶段人工 gate 确认后推进"
        extra={threadId ? <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="w-3.5 h-3.5 mr-1" />重新开始</Button> : undefined}
      />

      {/* 阶段条 */}
      <div className="bg-white rounded-lg border border-slate-200/80 px-5 py-4 mb-4">
        <div className="flex items-center">
          {STAGES.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <span className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold',
                  i < stageIndex ? 'bg-emerald-500 text-white' : i === stageIndex ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200')}>
                  {i < stageIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </span>
                <span className={cn('mt-2 text-xs', i === stageIndex ? 'text-indigo-600 font-semibold' : i < stageIndex ? 'text-emerald-600' : 'text-slate-400')}>{s.name}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="flex-1 mx-3 mb-6 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className={cn('h-full rounded-full', i < stageIndex ? 'bg-emerald-400 w-full' : 'w-0')} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 输入需求 */}
      {!threadId && (
        <div className="bg-white rounded-lg border border-slate-200/80 px-5 py-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-[13px] font-semibold text-slate-800">输入项目需求</span>
          </div>
          <Textarea
            rows={4}
            value={requirement}
            onChange={e => setRequirement(e.target.value)}
            placeholder="用一句话描述你要交付的项目，例如：帮我做一个一物一码的产品追溯系统，需要支持扫码溯源和防窜货。"
          />
          <div className="mt-3 flex items-center gap-2">
            <input
              value={cwd}
              onChange={e => setCwd(e.target.value)}
              className="flex-1 h-8 rounded-md border border-slate-200 px-2 text-xs font-mono text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="工作目录（agent 干活的地方）"
            />
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={busy || !requirement.trim()} onClick={handleStart}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
              启动流水线
            </Button>
          </div>
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0" />{error}
        </div>
      )}

      {/* 运行状态 */}
      {threadId && snapshot && (
        <div className="space-y-4">
          {!snapshot.done && !pending && (
            <div className="bg-white rounded-lg border border-indigo-100 bg-indigo-50/40 px-5 py-4 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              <div>
                <div className="text-[13px] font-medium text-slate-800">「{snapshot.stage}」阶段执行中…</div>
                <div className="text-xs text-slate-500 mt-0.5">harness agent 正在真实干活，稍候会出现待确认项</div>
              </div>
            </div>
          )}

          {/* question */}
          {pending?.type === 'question' && (
            <div className="bg-white rounded-lg border border-amber-200/70 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span className="text-[13px] font-semibold text-slate-800">agent 需要你确认（{pending.stage}）</span>
              </div>
              <div className="space-y-4">
                {pending.questions.map((item: FlowQuestion) => (
                  <QuestionItem
                    key={item.id}
                    item={item}
                    selected={answers[item.id] ?? []}
                    custom={customs[item.id] ?? ''}
                    onSelect={v => setAnswers(prev => ({ ...prev, [item.id]: v }))}
                    onCustom={v => setCustoms(prev => ({ ...prev, [item.id]: v }))}
                  />
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={busy} onClick={submitAnswer}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                  提交回答
                </Button>
              </div>
            </div>
          )}

          {/* gate */}
          {pending?.type === 'gate' && (
            <div className="bg-white rounded-lg border border-violet-200/70 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-violet-500" />
                <span className="text-[13px] font-semibold text-slate-800">「{pending.stage}」阶段已完成，等待人工确认</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">确认通过则进入下一阶段；退回则本阶段重新执行。</p>
              <div className="flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => submitGate('approve')}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  确认通过
                </Button>
                <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" disabled={busy} onClick={() => submitGate('reject')}>
                  <XCircle className="w-3.5 h-3.5 mr-1" />退回
                </Button>
              </div>
            </div>
          )}

          {/* 完成 */}
          {snapshot.done && (
            <div className="bg-white rounded-lg border border-emerald-200/70 px-5 py-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="mt-2 text-[15px] font-semibold text-slate-800">交付流水线完成</div>
              <p className="mt-1 text-xs text-slate-500">需求 → 设计 → 编码 → 测试 四阶段全部完成，产物已沉淀</p>
            </div>
          )}

          {/* 产物 */}
          {Object.keys(snapshot.spec_cache).length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200/80 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-[13px] font-semibold text-slate-800">已产出规格</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(snapshot.spec_cache).map(([id, spec]) => {
                  const s = spec as { title?: string; version?: number; status?: string }
                  return (
                    <Pill key={id} tone={s.status === 'approved' ? 'green' : 'amber'}>
                      {id} · {s.title ?? ''} V{s.version ?? '?'}
                    </Pill>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QuestionItem({ item, selected, custom, onSelect, onCustom }: {
  item: FlowQuestion
  selected: string[]
  custom: string
  onSelect: (v: string[]) => void
  onCustom: (v: string) => void
}) {
  const opts = item.options ?? []
  const multi = item.multiSelect === true
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <div className="text-[13px] font-medium text-slate-800 leading-5">{item.question}</div>
      {item.detail && <div className="mt-1 text-xs text-slate-400">{item.detail}</div>}
      {opts.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {opts.map(opt => {
            const checked = selected.includes(opt.label)
            return (
              <label key={opt.label} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={item.id}
                  checked={checked}
                  onChange={() => {
                    if (multi) {
                      onSelect(checked ? selected.filter(x => x !== opt.label) : [...selected, opt.label])
                    } else {
                      onSelect([opt.label])
                    }
                  }}
                  className="accent-indigo-600"
                />
                {opt.label}
              </label>
            )
          })}
        </div>
      ) : (
        <input
          value={custom}
          onChange={e => onCustom(e.target.value)}
          placeholder="输入你的回答…"
          className="mt-2 w-full h-8 rounded-md border border-slate-200 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      )}
    </div>
  )
}
