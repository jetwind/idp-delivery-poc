import { useNavigate } from 'react-router'
import { timeline, risks, todoItems } from '@/mock/data3'
import { Section, Pill, Metric, statusTone } from '@/components/common'
import { AIPill } from '@/components/common'
import DeliveryDriver from '@/components/DeliveryDriver'
import { AlertTriangle, ShieldCheck, Bot, GitPullRequestArrow, Sparkles, ArrowRight, UserCheck, FileWarning, ClipboardCheck, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const stages = ['需求', '方案', '开发', '测试', '发布', '复盘']
const curStage = 2

const toneIcon: Record<string, any> = {
  ai: Sparkles, human: UserCheck, system: RefreshCcw, eval: ClipboardCheck, release: GitPullRequestArrow, change: FileWarning,
}
const toneColor: Record<string, string> = {
  ai: 'bg-violet-100 text-violet-600', human: 'bg-blue-100 text-blue-600', system: 'bg-slate-100 text-slate-500',
  eval: 'bg-cyan-100 text-cyan-600', release: 'bg-indigo-100 text-indigo-600', change: 'bg-amber-100 text-amber-600',
}

export default function DeliveryDashboard() {
  const nav = useNavigate()
  return (
    <div>
      {/* 阶段总览 */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-6 py-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-slate-800">交付阶段</h2>
          <span className="text-xs text-slate-400">需求 → 方案 → 开发 → 测试 → 发布 → 复盘</span>
        </div>
        <div className="flex items-center">
          {stages.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <span className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold',
                  i < curStage ? 'bg-emerald-500 text-white' : i === curStage ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200')}>
                  {i < curStage ? '✓' : i + 1}
                </span>
                <span className={cn('mt-2 text-xs', i === curStage ? 'text-indigo-600 font-semibold' : i < curStage ? 'text-emerald-600' : 'text-slate-400')}>{s}</span>
                {i === curStage && <span className="mt-0.5 text-[10px] text-slate-400">进行中 · 第 38 天</span>}
              </div>
              {i < stages.length - 1 && (
                <div className="flex-1 mx-3 mb-7 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className={cn('h-full rounded-full', i < curStage ? 'bg-emerald-400 w-full' : i === curStage ? 'bg-indigo-500' : 'w-0')} style={i === curStage ? { width: '62%' } : undefined} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 后端联动：AI 驱动流程 */}
      <DeliveryDriver />

      {/* 核心指标 */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <Metric label="当前阶段" value="开发实现" sub="Workflow 第 3 阶段" tone="blue" onClick={() => nav('/projects/p1/workflow')} />
        <Metric label="待人工处理" value="5" sub="Human Task 2 · Human Gate 3" tone="amber" icon={<ShieldCheck className="w-4 h-4 text-amber-400" />} onClick={() => nav('/projects/p1/gate')} />
        <Metric label="AI 执行中" value="2" sub="Coding Agent · CI 联动" tone="violet" icon={<Bot className="w-4 h-4 text-violet-400" />} onClick={() => nav('/projects/p1/workflow')} />
        <Metric label="当前风险" value="4" sub="高 2 · 中 2" tone="red" icon={<AlertTriangle className="w-4 h-4 text-rose-400" />} />
        <Metric label="当前版本" value={<span className="font-mono">V1.3.0</span>} sub="PROD · 2026-06-28" tone="green" onClick={() => nav('/projects/p1/releases/v130')} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 待处理 */}
        <Section title="当前待处理" desc="按优先级排序" className="row-span-2"
          extra={<button className="text-xs text-indigo-600 hover:underline">全部 7 项</button>}>
          <div className="space-y-2 pt-1">
            {todoItems.map(t => (
              <button key={t.title} onClick={() => nav(t.tag === 'gate' ? '/projects/p1/gate' : t.tag === 'spec' || t.tag === 'ai' ? '/projects/p1/specs/req' : '/projects/p1/workflow')}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-100 px-3.5 py-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors text-left group">
                <Pill tone={t.tag === 'gate' ? 'amber' : t.tag === 'risk' ? 'red' : t.tag === 'spec' ? 'blue' : t.tag === 'ai' ? 'violet' : t.tag === 'eval' ? 'cyan' : 'slate'}>{t.kind}</Pill>
                <span className="flex-1 text-[13px] text-slate-700 group-hover:text-slate-900">{t.title}</span>
                <span className="text-[11px] text-slate-400 shrink-0">{t.due}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>
        </Section>

        {/* AI 动态 */}
        <Section title="AI 动态" desc="项目时间线" className="row-span-2">
          <div className="relative pl-5 pt-1 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100 max-h-[560px] overflow-y-auto pr-1">
            {timeline.map((e, i) => {
              const Icon = toneIcon[e.tone]
              return (
                <div key={i} className="relative">
                  <span className={cn('absolute -left-5 top-0.5 w-[15px] h-[15px] rounded-full flex items-center justify-center', toneColor[e.tone])}>
                    <Icon className="w-2.5 h-2.5" />
                  </span>
                  <div className="text-[10.5px] text-slate-400 font-mono">{e.time} · {e.type}</div>
                  <div className="mt-0.5 text-xs leading-5 text-slate-700">{e.text}</div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* 风险区域 */}
        <Section title="风险列表" desc="规格 / 进度 / 技术 / 质量"
          extra={<Pill tone="red">{risks.length} 项</Pill>}>
          <div className="space-y-2.5 pt-1">
            {risks.map(r => (
              <div key={r.title} className="rounded-lg border border-slate-100 px-4 py-3 hover:border-rose-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Pill tone={statusTone(r.level)}>{r.level}风险</Pill>
                  <Pill tone="slate">{r.kind}</Pill>
                  <span className="ml-auto text-[11px] text-slate-400">跟进：{r.owner}</span>
                </div>
                <div className="mt-2 text-[13px] font-medium text-slate-800">{r.title}</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* AI 执行入口卡 */}
        <div className="rounded-lg border border-violet-200/70 bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-700 text-white p-5 flex flex-col justify-between shadow-lg shadow-indigo-600/20">
          <div>
            <div className="flex items-center gap-2">
              <AIPill>AI 数字员工</AIPill>
            </div>
            <h3 className="mt-3 text-[15px] font-semibold leading-6">Coding Agent · Dev-07 正在执行代码开发</h3>
            <p className="mt-2 text-xs leading-5 text-indigo-100/90">当前任务：trace-pack-relation 拆箱重组模块 · 已完成 7/12 子任务 · 今日提交 12 个 Commit</p>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => nav('/projects/p1/tasks/n8')} className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-white/15 hover:bg-white/25 transition-colors text-[13px] font-medium backdrop-blur">
              AI Task 详情<ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => nav('/cockpit')} className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-white text-indigo-700 hover:bg-indigo-50 transition-colors text-[13px] font-semibold">
              进入 AI 驾驶舱<ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
