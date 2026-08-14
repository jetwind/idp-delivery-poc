import { useNavigate } from 'react-router'
import { useSpecStore } from '@/hooks/useSpecStore'
import { PageHeader, Pill, Bar, statusTone, T, thCls, tdCls, Section } from '@/components/common'
import { Button } from '@/components/ui/button'
import { FileText, Sparkles, ShieldCheck, Plus, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const specIcons: Record<string, string> = {
  req: 'from-blue-500 to-indigo-500', design: 'from-cyan-500 to-blue-500', api: 'from-violet-500 to-purple-500',
  test: 'from-emerald-500 to-teal-500', release: 'from-amber-500 to-orange-500',
}

export default function SpecList() {
  const nav = useNavigate()
  const { specs, backend, refresh } = useSpecStore()
  return (
    <div>
      <PageHeader
        title="项目规格"
        desc="正式、可执行、可版本化的项目事实 · Evaluation 质量评估 + Human Gate 人工确认"
        extra={
          <div className="flex items-center gap-2">
            {backend === true && <Pill tone="green" dot>实时数据</Pill>}
            {backend === false && <Pill tone="amber" dot>离线 · mock</Pill>}
            <Button variant="outline" size="sm" onClick={refresh}><RefreshCcw className="w-3.5 h-3.5 mr-1" />刷新</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-1" />新增规格</Button>
          </div>
        }
      />

      {/* 规格卡片 */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {specs.map(s => (
          <button key={s.id} onClick={() => nav(`/projects/p1/specs/${s.id}`)}
            className="text-left bg-white rounded-lg border border-slate-200/80 p-4 hover:shadow-md hover:border-indigo-200 transition-all group">
            <div className="flex items-center justify-between">
              <span className={cn('w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center', specIcons[s.id])}>
                <FileText className="w-4 h-4" />
              </span>
              <Pill tone={statusTone(s.status)} dot>{s.status}</Pill>
            </div>
            <div className="mt-3 text-[14px] font-semibold text-slate-800 group-hover:text-indigo-600">{s.name}</div>
            <div className="mt-0.5 text-[11px] text-slate-400 leading-4 h-8 line-clamp-2">{s.summary}</div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono">{s.version}</span>
              <span>{s.completeness > 0 ? `完整度 ${s.completeness}%` : '未开始'}</span>
            </div>
            <Bar value={s.completeness} className="mt-1.5" tone={s.completeness >= 90 ? 'bg-emerald-500' : s.completeness >= 60 ? 'bg-indigo-500' : 'bg-slate-200'} />
          </button>
        ))}
      </div>

      {/* 规格列表 */}
      <Section pad={false} title="规格列表" extra={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs"><Sparkles className="w-3.5 h-3.5 mr-1 text-violet-500" />批量 AI 检查</Button>
          <Button variant="outline" size="sm" className="h-7 text-xs"><ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-500" />Gate 记录</Button>
        </div>}>
        <T className="border-t border-slate-100">
          <thead><tr>
            <th className={cn(thCls, 'pl-5')}>规格名称</th><th className={thCls}>当前版本</th><th className={thCls}>状态</th>
            <th className={thCls}>完整度（AI 评估）</th><th className={thCls}>Gate</th><th className={thCls}>更新时间</th><th className={thCls}>负责人</th><th className={cn(thCls, 'pr-5')}>操作</th>
          </tr></thead>
          <tbody>
            {specs.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/70 cursor-pointer" onClick={() => nav(`/projects/p1/specs/${s.id}`)}>
                <td className={cn(tdCls, 'pl-5')}><span className="font-medium text-slate-800">{s.name}</span></td>
                <td className={tdCls}><span className="font-mono text-xs">{s.version}</span></td>
                <td className={tdCls}><Pill tone={statusTone(s.status)} dot>{s.status}</Pill></td>
                <td className={tdCls}>
                  <div className="flex items-center gap-2 w-[140px]">
                    <Bar value={s.completeness} className="flex-1" tone={s.completeness >= 90 ? 'bg-emerald-500' : s.completeness >= 60 ? 'bg-indigo-500' : 'bg-slate-200'} />
                    <span className="text-xs text-slate-500 w-9">{s.completeness > 0 ? `${s.completeness}%` : '—'}</span>
                  </div>
                </td>
                <td className={tdCls}><Pill tone={s.gate === '已通过' ? 'green' : s.gate === '待确认' ? 'amber' : 'slate'}>{s.gate}</Pill></td>
                <td className={tdCls}><span className="text-xs text-slate-400">{s.updated}</span></td>
                <td className={tdCls}>{s.owner}</td>
                <td className={cn(tdCls, 'pr-5')}>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-violet-600 hover:bg-violet-50">AI 补全</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">AI 检查</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </T>
      </Section>
    </div>
  )
}
