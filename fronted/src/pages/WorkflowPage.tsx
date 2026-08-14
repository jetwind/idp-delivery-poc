import { useNavigate } from 'react-router'
import { workflow, type NodeType, type NodeStatus } from '@/mock/data2'
import { PageHeader, Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Sparkles, User, Cog, ClipboardCheck, ShieldCheck, Code2, ChevronRight, CheckCircle2, Loader2, Circle, Ban } from 'lucide-react'

const typeMeta: Record<NodeType, { icon: any; cls: string; badge: string }> = {
  'AI Task': { icon: Sparkles, cls: 'border-violet-200 bg-violet-50/60', badge: 'bg-violet-100 text-violet-600' },
  'Coding Agent': { icon: Code2, cls: 'border-fuchsia-200 bg-fuchsia-50/60', badge: 'bg-fuchsia-100 text-fuchsia-600' },
  'Human Task': { icon: User, cls: 'border-blue-200 bg-blue-50/60', badge: 'bg-blue-100 text-blue-600' },
  'System Task': { icon: Cog, cls: 'border-slate-200 bg-slate-50', badge: 'bg-slate-100 text-slate-500' },
  'Evaluation': { icon: ClipboardCheck, cls: 'border-cyan-200 bg-cyan-50/60', badge: 'bg-cyan-100 text-cyan-600' },
  'Human Gate': { icon: ShieldCheck, cls: 'border-amber-200 bg-amber-50/60', badge: 'bg-amber-100 text-amber-600' },
}
const statusIcon: Record<NodeStatus, any> = {
  '已完成': { icon: CheckCircle2, cls: 'text-emerald-500' },
  '执行中': { icon: Loader2, cls: 'text-indigo-500 animate-spin' },
  '待处理': { icon: Circle, cls: 'text-amber-400' },
  '未开始': { icon: Circle, cls: 'text-slate-300' },
  '被阻断': { icon: Ban, cls: 'text-rose-500' },
}

export default function WorkflowPage() {
  const nav = useNavigate()
  return (
    <div>
      <PageHeader
        title="交付流程"
        desc="Workflow 驱动人、AI 与系统协同完成项目交付 · 标准项目流程模板"
        extra={<Button variant="outline" size="sm">流程配置</Button>}
      />

      {/* 图例 */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {(Object.keys(typeMeta) as NodeType[]).map(t => (
          <span key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={cn('w-5 h-5 rounded flex items-center justify-center', typeMeta[t].badge)}>
              {(() => { const I = typeMeta[t].icon; return <I className="w-3 h-3" /> })()}
            </span>{t}
          </span>
        ))}
        <span className="ml-auto text-xs text-slate-400">当前推进至：开发实现 · 代码开发</span>
      </div>

      {/* 泳道 */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-[1480px]">
          {workflow.map((stage, si) => {
            const doneCount = stage.nodes.filter(n => n.status === '已完成').length
            const active = stage.nodes.some(n => n.status === '执行中')
            const blocked = stage.nodes.some(n => n.status === '被阻断')
            return (
              <div key={stage.name} className="flex-1 min-w-[220px]">
                <div className={cn('rounded-t-lg px-4 py-3 border',
                  active ? 'bg-indigo-600 text-white border-indigo-600' : blocked ? 'bg-rose-50 text-rose-700 border-rose-200' : doneCount === stage.nodes.length ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-600 border-slate-200')}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold">{si + 1}. {stage.name}</span>
                    {active ? <Pill tone="violet" className="bg-white/20 text-white border-white/30">进行中</Pill>
                      : blocked ? <Pill tone="red">等待输入</Pill>
                      : doneCount === stage.nodes.length ? <CheckCircle2 className="w-4 h-4" />
                      : <span className="text-[11px] text-slate-400">未开始</span>}
                  </div>
                  <div className={cn('mt-1 text-[11px]', active ? 'text-indigo-100' : 'text-slate-400')}>{doneCount}/{stage.nodes.length} 节点完成</div>
                </div>
                <div className={cn('rounded-b-lg border border-t-0 p-2.5 space-y-2.5 min-h-[300px]', active ? 'border-indigo-200 bg-indigo-50/30' : blocked ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-slate-50/50')}>
                  {stage.nodes.map(n => {
                    const tm = typeMeta[n.type]
                    const si2 = statusIcon[n.status]
                    return (
                      <button key={n.id}
                        onClick={() => n.status === '被阻断' ? nav(`/projects/p1/tasks/${n.id}/complete`) : n.type === 'AI Task' || n.type === 'Coding Agent' ? nav(`/projects/p1/tasks/${n.id}`) : n.type === 'Human Gate' || n.type === 'Evaluation' ? nav('/projects/p1/gate') : undefined}
                        className={cn('w-full text-left rounded-lg border p-3 transition-all hover:shadow-md hover:-translate-y-px', tm.cls, n.status === '执行中' && 'ring-2 ring-indigo-400/50 shadow-md', n.status === '被阻断' && 'ring-2 ring-rose-300/60 border-rose-200 bg-white')}>
                        <div className="flex items-center justify-between">
                          <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold', tm.badge)}>
                            <tm.icon className="w-2.5 h-2.5" />{n.type}
                          </span>
                          <si2.icon className={cn('w-4 h-4', si2.cls)} />
                        </div>
                        <div className="mt-2 text-[13px] font-medium text-slate-800">{n.name}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {n.actor && <span className="block truncate">{n.actor}</span>}
                          {n.duration && <span className="block text-slate-400">{n.duration}</span>}
                        </div>
                        {n.status === '被阻断' && n.gaps ? (
                          <div className="mt-2.5 -mx-3 -mb-3 rounded-b-lg bg-rose-500 text-white text-[11px] font-medium px-3 py-2 flex items-center gap-1.5">
                            <Ban className="w-3 h-3" />缺少输入 {n.gaps} 项 · 点击补全<ChevronRight className="w-3 h-3 ml-auto" />
                          </div>
                        ) : null}
                        {(n.type === 'AI Task' || n.type === 'Coding Agent') && n.status !== '未开始' && n.status !== '被阻断' && (
                          <div className="mt-2 flex items-center text-[11px] text-violet-600 font-medium">查看执行详情<ChevronRight className="w-3 h-3" /></div>
                        )}
                        {n.type === 'Human Gate' && n.status !== '未开始' && (
                          <div className="mt-2 flex items-center text-[11px] text-amber-600 font-medium">前往确认<ChevronRight className="w-3 h-3" /></div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
