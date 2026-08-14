import { useNavigate } from 'react-router'
import { cockpit as c } from '@/mock/data5'
import { Section, Pill, Bar, AIPill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Bot, Activity, Wallet, ShieldAlert, UserCheck, ArrowRight, Sparkles,
  ClipboardCheck, CircleDollarSign, Gauge, Target, AlertTriangle,
} from 'lucide-react'

const waitTone: Record<string, any> = { 'Human Gate': 'amber', '输入补全': 'red', 'AI 结果确认': 'violet', '审批': 'cyan' }

export default function AICockpit() {
  const nav = useNavigate()
  const s = c.stats
  return (
    <div>
      {/* 顶部说明 */}
      <div className="rounded-lg border border-violet-200/70 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white px-6 py-5 mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <AIPill>AI 驾驶舱</AIPill>
            <h1 className="text-lg font-semibold">AI 正在推进项目，人在关键节点确认与补全</h1>
          </div>
          <p className="mt-1.5 text-xs text-indigo-100">今日执行 {s.todayTasks} 项任务 · 本周累计 {s.weekTasks} 项 · AI 结果人工接受率 {s.acceptance}% · Human Gate 首轮通过率 {s.firstPass}%</p>
        </div>
        <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => nav('/agents')}>
          <Bot className="w-4 h-4 mr-1.5" />数字员工中心
        </Button>
      </div>

      {/* 指标 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { icon: Activity, label: '执行中任务', value: '2 项', sub: 'Coding Agent + CI 联动', tone: 'text-violet-600 bg-violet-50' },
          { icon: UserCheck, label: '等待人工介入', value: '4 项', sub: '2 项正在阻塞流程', tone: 'text-amber-600 bg-amber-50' },
          { icon: ShieldAlert, label: '安全拦截（7 天）', value: '2 次', sub: '越权访问 / 分支外提交', tone: 'text-rose-600 bg-rose-50' },
          { icon: Wallet, label: '本月 AI 成本', value: `¥${s.monthCost.toLocaleString()}`, sub: `预算 ¥${s.budget.toLocaleString()} · 已用 42%`, tone: 'text-emerald-600 bg-emerald-50' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-lg border border-slate-200/80 px-4 py-4 flex items-center gap-3.5">
            <span className={cn('w-10 h-10 rounded-lg flex items-center justify-center', m.tone)}><m.icon className="w-5 h-5" /></span>
            <div>
              <div className="text-xs text-slate-400">{m.label}</div>
              <div className="text-lg font-semibold text-slate-800 leading-6">{m.value}</div>
              <div className="text-[11px] text-slate-400">{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* AI 正在执行 */}
        <Section title="AI 正在执行" desc="实时任务进度" extra={<Pill tone="violet" dot>{c.running.length} 项</Pill>}>
          <div className="space-y-3 pt-1">
            {c.running.map(r => (
              <div key={r.task} className="rounded-lg border border-violet-100 bg-violet-50/40 p-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-violet-600" />
                  <span className="text-[13px] font-semibold text-slate-800">{r.agent}</span>
                  <Pill tone="blue" className="ml-auto">{r.stage}</Pill>
                </div>
                <div className="mt-2 text-[13px] text-slate-700">{r.task}</div>
                <div className="mt-2.5 flex items-center gap-3">
                  <Bar value={r.progress} className="flex-1" tone="bg-violet-500" />
                  <span className="text-xs font-semibold text-violet-600">{r.progress}%</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{r.sub}</span><span>{r.eta} · {r.tokens}</span>
                </div>
                <button onClick={() => nav('/projects/p1/tasks/n9')} className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline">
                  查看执行详情<ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* 等待人工介入 */}
        <Section title="等待人工介入" desc="AI 已就位，需要人确认、补全或决策" extra={<Pill tone="amber" dot>{c.waitingHuman.length} 项</Pill>}>
          <div className="space-y-2 pt-1">
            {c.waitingHuman.map(w => (
              <button key={w.title}
                onClick={() => nav(w.kind === 'Human Gate' ? '/projects/p1/gate' : w.kind === '输入补全' ? '/projects/p1/tasks/n12/complete' : w.kind === 'AI 结果确认' ? '/projects/p1/tasks/n8' : '/agents')}
                className="w-full flex items-center gap-3 rounded-lg border border-slate-100 px-3.5 py-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors text-left group">
                <Pill tone={waitTone[w.kind]}>{w.kind}</Pill>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-slate-800 truncate">{w.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">处理人：{w.who} · {w.due}</div>
                </div>
                {w.blocking.includes('阻塞') && <span className="text-[10px] text-rose-500 bg-rose-50 rounded px-1.5 py-0.5 shrink-0">{w.blocking}</span>}
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>
        </Section>

        {/* 安全与策略命中 */}
        <Section title="安全与策略命中" desc="权限策略实时拦截记录" extra={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => nav('/agents')}>全部审计日志</Button>}>
          <div className="space-y-2.5 pt-1">
            {c.policyHits.map(p => (
              <div key={p.time} className="flex items-start gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5">
                <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0', p.level === '高' ? 'text-rose-500' : p.level === '中' ? 'text-amber-500' : 'text-slate-400')} />
                <div className="flex-1">
                  <div className="text-xs leading-5 text-slate-700">{p.text}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400 font-mono">{p.time}</div>
                </div>
                <Pill tone={p.level === '高' ? 'red' : p.level === '中' ? 'amber' : 'slate'}>{p.level}</Pill>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />所有拦截均已按策略自动处置，无人工遗漏。
          </div>
        </Section>

        {/* 成本概览 */}
        <Section title="AI 成本概览" desc="本月预算执行" extra={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => nav('/agents')}>成本明细</Button>}>
          <div className="pt-1">
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-xs text-slate-500">本月已用</span>
              <span className="text-[13px]"><b className="text-slate-800">¥{s.monthCost.toLocaleString()}</b><span className="text-slate-400 text-xs"> / ¥{s.budget.toLocaleString()}</span></span>
            </div>
            <Bar value={42} tone="bg-emerald-500" />
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {[
                { icon: CircleDollarSign, label: '今日成本', value: `¥${s.todayCost}` },
                { icon: Gauge, label: '任务均成本', value: '¥14.2' },
                { icon: Target, label: '预期本月', value: '¥6,900' },
              ].map(m => (
                <div key={m.label} className="rounded-lg bg-slate-50 px-3 py-3 text-center">
                  <m.icon className="w-4 h-4 text-slate-400 mx-auto" />
                  <div className="mt-1.5 text-[15px] font-semibold text-slate-800">{m.value}</div>
                  <div className="text-[11px] text-slate-400">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3.5 flex items-center gap-2 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <ClipboardCheck className="w-3.5 h-3.5 text-cyan-500" />
              代码开发占 52% · 分析评估占 24% · 规格生成占 15%，详见数字员工中心成本分析。
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
