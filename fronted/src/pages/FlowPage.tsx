import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { continueFlow, getFlowEvents, getFlowFile, getFlowFiles, getFlowState, getProject, resumeFlow, startFlow, startProjectFlow, type FlowEvent, type FlowFile, type FlowQuestion, type FlowSnapshot, type Project, type QuestionInterrupt, type TodoItem } from '@/api/flow'
import { PageHeader, Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Play, Loader2, CheckCircle2, XCircle, Send, RotateCcw, Sparkles, ShieldCheck, FileText, TriangleAlert, Terminal, Bot, Wrench, MessageSquare, Folder, ListChecks, Circle } from 'lucide-react'

const STAGES = [
  { id: 'requirements', name: '01 需求' },
  { id: 'design', name: '02 详细设计' },
  { id: 'tasks', name: '03 任务' },
  { id: 'coding', name: '04 编码' },
  { id: 'testing', name: '05 测试' },
]

const DEFAULT_CWD = ''

export default function FlowPage() {
  const { pid } = useParams()
  const nav = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [requirement, setRequirement] = useState('')
  const [cwd, setCwd] = useState(DEFAULT_CWD)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<FlowSnapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [customs, setCustoms] = useState<Record<string, string>>({})
  const [gateFeedback, setGateFeedback] = useState('')
  const [logs, setLogs] = useState<FlowEvent[]>([])
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [running, setRunning] = useState(false)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenRef = useRef<Set<string>>(new Set())
  const eventsBusyRef = useRef(false)
  const logRef = useRef<HTMLDivElement | null>(null)

  const stopPolling = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  // 项目模式：加载项目，若有历史 thread 则继续（resume）该流水线。
  useEffect(() => {
    if (!pid) return
    let alive = true
    getProject(pid).then(r => {
      if (!alive) return
      setProject(r.project)
      setRequirement(r.project.requirement_text)
      setCwd(r.project.cwd)
      if (r.project.thread_id) setThreadId(r.project.thread_id)
    }).catch(() => { /* 项目不存在则停留在输入态 */ })
    return () => { alive = false }
  }, [pid])

  // 启动后轮询：状态单独拉（快，pending 立即生效）；日志单独异步更新（慢也不阻塞状态）。
  useEffect(() => {
    if (!threadId) return
    const tickState = async () => {
      try {
        const snap = await getFlowState(threadId)
        setSnapshot(snap)
        if (snap.error) setError(snap.error)
        if (snap.done && snap.pending === null) stopPolling()
      } catch { /* 单次轮询失败不断流 */ }
    }
    const tickEvents = async () => {
      if (eventsBusyRef.current) return // 上一次日志拉取还没回来，跳过本次，避免堆积
      eventsBusyRef.current = true
      try {
        const ev = await getFlowEvents(threadId)
        setRunning(ev.running)
        setTodos(ev.todos ?? [])
        const fresh = ev.events.filter(e => {
          const key = `${e.session_id ?? '?'}:${e.seq}`
          if (seenRef.current.has(key)) return false
          seenRef.current.add(key)
          return true
        })
        if (fresh.length) setLogs(prev => [...prev, ...fresh])
      } catch { /* 单次轮询失败不断流 */ } finally {
        eventsBusyRef.current = false
      }
    }
    tickState()
    tickEvents()
    timerRef.current = setInterval(() => { void tickState(); void tickEvents() }, 2000)
    return stopPolling
  }, [threadId, stopPolling])

  // 日志自动滚到底部。
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  async function handleStart() {
    setBusy(true); setError(null); setSnapshot(null)
    try {
      const snap = pid
        ? await startProjectFlow(pid)
        : await startFlow(requirement.trim(), cwd.trim())
      setThreadId(snap.thread_id)
      setSnapshot(snap)
      setAnswers({}); setCustoms({})
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  // 重新开始：项目模式则新建一个 thread（旧流水线保留在 checkpoint，可另行处理）。
  function restart() {
    if (pid) {
      if (window.confirm('重新开始会启动一条新的流水线，确认？')) handleStart()
    } else {
      reset()
    }
  }

  // 继续一个因编排层重启而「孤儿化」的流程（从上次 checkpoint 推进到下一个 interrupt）。
  async function handleContinue() {
    if (!threadId) return
    setBusy(true); setError(null)
    try {
      await continueFlow(threadId)
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
      await resumeFlow(threadId!, payload)
      setSnapshot(s => s ? { ...s, pending: null } : s)
      setAnswers({}); setCustoms({})
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function submitGate(decision: 'approve' | 'revise') {
    setBusy(true); setError(null)
    try {
      const answer = decision === 'approve' ? 'approve' : { action: 'revise', feedback: gateFeedback.trim() }
      await resumeFlow(threadId!, answer)
      setSnapshot(s => s ? { ...s, pending: null, validation: { status: 'pending', attempts: 0, error: null } } : s)
      setGateFeedback('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function submitApproval(outcome: 'allowed-once' | 'rejected') {
    setBusy(true); setError(null)
    try {
      await resumeFlow(threadId!, outcome)
      setSnapshot(s => s ? { ...s, pending: null } : s)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    stopPolling()
    setThreadId(null); setSnapshot(null); setError(null); setAnswers({}); setCustoms({})
    setLogs([]); setTodos([]); setRunning(false); setSelectedStage(null); seenRef.current = new Set()
  }

  const pending = snapshot?.pending ?? null
  const stageIndex = snapshot?.stage_index ?? 0
  const selectedStageName = selectedStage ? STAGES.find(s => s.id === selectedStage)?.name : undefined
  const shownLogs = selectedStageName ? logs.filter(e => e.stage === selectedStageName) : logs
  const selectedOutputs = selectedStage && snapshot?.artifacts ? (snapshot.artifacts[selectedStage] ?? []) : []

  return (
    <div>
      <PageHeader
        title={project ? `${project.name} · AI 流水线` : 'AI 交付流水线'}
        desc={project ? (project.requirement_text.length > 60 ? project.requirement_text.slice(0, 60) + '…' : project.requirement_text) : '输入需求 → 需求→设计→编码→测试逐阶段由 harness agent 真实执行，每阶段人工 gate 确认后推进'}
        extra={threadId
          ? <Button variant="outline" size="sm" onClick={restart}><RotateCcw className="w-3.5 h-3.5 mr-1" />重新开始</Button>
          : pid ? <Button variant="outline" size="sm" onClick={() => nav('/projects')}>返回项目列表</Button> : undefined}
      />

      {/* 阶段条（可点击回溯） */}
      <div className="bg-white rounded-lg border border-slate-200/80 px-5 py-4 mb-4">
        <div className="flex items-center">
          {STAGES.map((s, i) => {
            const done = i < stageIndex
            const current = i === stageIndex
            const active = selectedStage === s.id
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => setSelectedStage(active ? null : s.id)}
                  className="flex flex-col items-center group" title={done || current ? '点击查看该阶段日志与产出' : '尚未开始'}>
                  <span className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all',
                    done ? 'bg-emerald-500 text-white' : current ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200',
                    active && 'ring-2 ring-indigo-400 ring-offset-1')}>
                    {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </span>
                  <span className={cn('mt-2 text-xs group-hover:underline',
                    current ? 'text-indigo-600 font-semibold' : done ? 'text-emerald-600' : 'text-slate-400',
                    active && 'font-semibold')}>{s.name}</span>
                </button>
                {i < STAGES.length - 1 && (
                  <div className="flex-1 mx-3 mb-6 h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className={cn('h-full rounded-full', done ? 'bg-emerald-400 w-full' : 'w-0')} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-2 text-[11px] text-slate-400">点击已开始/进行中的阶段可回溯查看其日志与产出；再次点击取消。</div>
      </div>

      {/* 输入需求 / 项目启动 */}
      {!threadId && (pid ? (
        <div className="bg-white rounded-lg border border-slate-200/80 px-5 py-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-[13px] font-semibold text-slate-800">项目需求</span>
            <Pill tone="violet">{project?.name ?? pid}</Pill>
          </div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-6">{requirement || '加载中…'}</div>
          <div className="mt-1.5 text-xs text-slate-400 font-mono">工作目录：{cwd}</div>
          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={busy || !project} onClick={handleStart}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
              启动流水线
            </Button>
            <Button size="sm" variant="outline" onClick={() => nav('/projects')}>返回项目列表</Button>
          </div>
        </div>
      ) : (
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
              placeholder="工作目录，如 <仓库路径>/examples/project-delivery（agent 干活的地方）"
            />
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={busy || !requirement.trim() || !cwd.trim()} onClick={handleStart}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
              启动流水线
            </Button>
          </div>
        </div>
      ))}

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
              {snapshot.flow_running
                ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                : <TriangleAlert className="w-4 h-4 text-amber-500 shrink-0" />}
              <div className="flex-1">
                <div className="text-[13px] font-medium text-slate-800">「{snapshot.stage}」阶段{snapshot.flow_running ? '执行中…' : '已暂停'}</div>
                <div className="text-xs text-slate-500 mt-0.5">{snapshot.flow_running ? 'harness agent 正在真实干活，稍候会出现待确认项' : '流程可能因服务重启而暂停，点击「继续执行」从上次进度恢复。'}</div>
              </div>
              {!snapshot.flow_running && (
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={busy} onClick={handleContinue}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  继续执行
                </Button>
              )}
            </div>
          )}

          {/* 执行子步骤（agent 的 todo_write 计划 + 进度） */}
          {!snapshot.done && todos.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200/80 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-indigo-500" />
                <span className="text-[13px] font-semibold text-slate-800">执行子步骤</span>
                <span className="text-xs text-slate-400">{todos.filter(t => t.status === 'completed').length}/{todos.length} 完成</span>
              </div>
              <div className="space-y-1.5">
                {todos.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {t.status === 'completed'
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      : t.status === 'in_progress'
                        ? <Loader2 className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0 animate-spin" />
                        : <Circle className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />}
                    <span className={cn('break-words',
                      t.status === 'completed' ? 'text-slate-400 line-through' : t.status === 'in_progress' ? 'text-indigo-700 font-medium' : 'text-slate-500')}>
                      {t.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 结构化产物 schema 校验子步骤 */}
          {snapshot.validation.status !== 'pending' && (
            <div className={cn('rounded-lg border px-4 py-3 flex items-start gap-2.5',
              snapshot.validation.status === 'passed' ? 'border-emerald-200/70 bg-emerald-50/50'
                : snapshot.validation.status === 'failed' ? 'border-rose-200/70 bg-rose-50/50'
                  : 'border-amber-200/70 bg-amber-50/50')}>
              {snapshot.validation.status === 'passed'
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                : snapshot.validation.status === 'failed'
                  ? <TriangleAlert className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  : <Loader2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-spin" />}
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-slate-800">
                  {snapshot.validation.status === 'passed' && '结构化产物已通过 schema 校验'}
                  {snapshot.validation.status === 'retrying' && `结构化产物校验未通过，正在重试（第 ${snapshot.validation.attempts} 次）…`}
                  {snapshot.validation.status === 'failed' && `结构化产物校验未通过（重试 ${snapshot.validation.attempts} 次后），等待人工介入`}
                </div>
                {snapshot.validation.error && (
                  <div className="mt-1 text-xs text-slate-500 whitespace-pre-wrap font-mono">{snapshot.validation.error}</div>
                )}
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
          {/* approval */}
          {pending?.type === 'approval' && (
            <div className="bg-white rounded-lg border border-rose-200/70 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                <span className="text-[13px] font-semibold text-slate-800">agent 请求执行命令（{pending.stage}）</span>
              </div>
              <div className="text-xs text-slate-600 mb-1">工具：<code className="font-mono">{pending.toolName}</code></div>
              {pending.reason && <div className="text-xs text-slate-500 mb-3">{pending.reason}</div>}
              <div className="flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => submitApproval('allowed-once')}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  批准一次
                </Button>
                <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" disabled={busy} onClick={() => submitApproval('rejected')}>
                  <XCircle className="w-3.5 h-3.5 mr-1" />拒绝
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
              <p className="text-xs text-slate-500 mb-3">确认通过进入下一阶段；不通过时填写补充矫正意见（必填），agent 据此在当前版本上增量修订后再次提交。</p>
              <Textarea
                rows={3}
                value={gateFeedback}
                onChange={e => setGateFeedback(e.target.value)}
                placeholder="补充矫正意见（必填），例如：需求里缺少性能指标、字段命名改为 xxx、补充异常场景…"
                className="mb-3 text-xs"
              />
              <div className="flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => submitGate('approve')}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  确认通过
                </Button>
                <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50" disabled={busy || !gateFeedback.trim()} onClick={() => submitGate('revise')}>
                  <XCircle className="w-3.5 h-3.5 mr-1" />补充矫正
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
          {Object.keys(snapshot.artifacts).length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200/80 px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-[13px] font-semibold text-slate-800">已产出文件</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(snapshot.artifacts).map(([stage, files]) => (
                  <div key={stage} className="flex items-start gap-2">
                    <Pill tone="green">{stage}</Pill>
                    <div className="flex flex-wrap gap-1.5">
                      {files.map(f => (
                        <code key={f} className="text-xs font-mono text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">{f}</code>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 选中阶段的产出 */}
      {threadId && selectedStage && selectedOutputs.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200/80 mb-4">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-[13px] font-semibold text-slate-800">{selectedStageName} 阶段产出</span>
          </div>
          <div className="px-5 py-3 flex flex-wrap gap-1.5">
            {selectedOutputs.map(f => (
              <code key={f} className="text-xs font-mono text-slate-600 bg-slate-100 rounded px-1.5 py-0.5">{f}</code>
            ))}
          </div>
        </div>
      )}

      {/* 工作区文件浏览器 */}
      {threadId && <FileBrowser threadId={threadId} />}

      {/* 实时日志（放最下面，观察性） */}
      {threadId && (
        <div className="bg-white rounded-lg border border-slate-200/80 mb-4">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              <span className="text-[13px] font-semibold text-slate-800">运行日志</span>
              {selectedStageName ? <Pill tone="violet">{selectedStageName}</Pill> : (running && <Pill tone="blue" dot>运行中</Pill>)}
              {shownLogs.length > 0 && <span className="text-xs text-slate-400">{shownLogs.length} 条</span>}
            </div>
            {selectedStage && (
              <button onClick={() => setSelectedStage(null)} className="text-xs text-indigo-600 hover:underline">显示全部阶段</button>
            )}
          </div>
          <div ref={logRef} className="px-5 py-3 max-h-[420px] overflow-y-auto space-y-1.5">
            {shownLogs.length === 0 ? (
              <div className="text-xs text-slate-400">{selectedStage ? '该阶段暂无日志（尚未运行或未产生输出）' : '启动中，等待 agent 产出…'}</div>
            ) : (
              shownLogs.map((e, i) => <LogItem key={i} e={e} />)
            )}
          </div>
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

function LogItem({ e }: { e: FlowEvent }) {
  const base = 'flex items-start gap-2 text-xs leading-5 py-0.5'
  if (e.type === 'tool') {
    return (
      <div className={base}>
        <Wrench className="w-3.5 h-3.5 mt-0.5 text-indigo-500 shrink-0" />
        <div className="min-w-0">
          <span className="font-medium text-slate-600">工具调用</span>
          <code className="ml-2 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono">{e.toolName}</code>
          {e.input && <span className="ml-1 text-slate-400 break-all">{e.input}</span>}
        </div>
      </div>
    )
  }
  if (e.type === 'tool_result') {
    return (
      <div className={base}>
        {e.ok === false
          ? <XCircle className="w-3.5 h-3.5 mt-0.5 text-rose-500 shrink-0" />
          : <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />}
        <div className="min-w-0">
          <span className="font-medium text-slate-500">结果</span>
          {e.text && <span className="ml-2 text-slate-500 break-all">{e.text}</span>}
        </div>
      </div>
    )
  }
  if (e.type === 'assistant') {
    return (
      <div className={base}>
        <Bot className="w-3.5 h-3.5 mt-0.5 text-violet-500 shrink-0" />
        <div className="min-w-0 whitespace-pre-wrap text-slate-700 break-words">{e.text}</div>
      </div>
    )
  }
  return (
    <div className={base}>
      <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <span className="text-slate-400">{e.source === 'user' ? '输入' : '上下文'}</span>
        <div className="text-slate-600 whitespace-pre-wrap break-words">{e.text}</div>
      </div>
    </div>
  )
}

function FileBrowser({ threadId }: { threadId: string }) {
  const [files, setFiles] = useState<FlowFile[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await getFlowFiles(threadId)
        if (alive) setFiles(r.files)
      } catch { /* 忽略单次失败 */ }
    }
    load()
    const t = setInterval(load, 3000)
    return () => { alive = false; clearInterval(t) }
  }, [threadId])

  async function open(path: string) {
    setSelected(path); setLoading(true); setErr(null)
    try {
      const r = await getFlowFile(threadId, path)
      setContent(r.content); setTruncated(r.truncated)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e)); setContent('')
    } finally {
      setLoading(false)
    }
  }

  const groups = new Map<string, FlowFile[]>()
  for (const f of files) {
    const top = f.path.split('/')[0] || '(root)'
    if (!groups.has(top)) groups.set(top, [])
    groups.get(top)!.push(f)
  }
  const topDirs = [...groups.keys()].sort()

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 mb-4">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-[13px] font-semibold text-slate-800">工作区文件</span>
          {files.length > 0 && <span className="text-xs text-slate-400">{files.length} 个文件</span>}
        </div>
      </div>
      <div className="flex min-h-[240px] max-h-[440px]">
        <div className="w-[264px] shrink-0 border-r border-slate-100 overflow-y-auto p-2">
          {files.length === 0 ? (
            <div className="text-xs text-slate-400 px-2 py-2">尚无文件（agent 还未产出）</div>
          ) : (
            topDirs.map(dir => (
              <div key={dir} className="mb-1">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Folder className="w-3 h-3" />{dir}/
                </div>
                {groups.get(dir)!.map(f => {
                  const name = dir === '(root)' ? f.path : f.path.slice(dir.length + 1)
                  const active = selected === f.path
                  return (
                    <button key={f.path} onClick={() => open(f.path)}
                      className={cn('w-full text-left px-4 py-1 rounded text-xs font-mono truncate block',
                        active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50')}>
                      {name}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50/50 p-3">
          {loading ? (
            <div className="text-xs text-slate-400">加载中…</div>
          ) : err ? (
            <div className="text-xs text-rose-500">{err}</div>
          ) : selected ? (
            <div>
              <div className="text-xs font-mono text-slate-500 mb-2">{selected}{truncated ? '（内容过长已截断）' : ''}</div>
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words">{content}</pre>
            </div>
          ) : (
            <div className="text-xs text-slate-400">点击左侧文件预览内容</div>
          )}
        </div>
      </div>
    </div>
  )
}
