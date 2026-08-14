import { useState } from 'react'
import { useNavigate } from 'react-router'
import { releaseCompare as c, releases } from '@/mock/data3'
import { Section, T, thCls, tdCls } from '@/components/common'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ArrowRight, GitCompareArrows, Plus, Minus, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReleaseCompare() {
  const nav = useNavigate()
  const [from, setFrom] = useState(c.from)
  const [to, setTo] = useState(c.to)
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/projects/p1/releases')} className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800"><ChevronLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">项目版本对比</h1>
            <p className="mt-0.5 text-xs text-slate-400">对比两个 Project Release 之间的需求、规格、服务与环境变化</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="w-32 h-9 font-mono text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{releases.map(r => <SelectItem key={r.version} value={r.version}>{r.version}</SelectItem>)}</SelectContent>
          </Select>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="w-32 h-9 font-mono text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{releases.map(r => <SelectItem key={r.version} value={r.version}>{r.version}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 ml-1"><GitCompareArrows className="w-3.5 h-3.5 mr-1" />对比</Button>
        </div>
      </div>

      {/* 汇总 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: '需求变化', value: '+3 / ~2 / -1' },
          { label: 'CR 变化', value: '5 个变更' },
          { label: '规格版本变化', value: '4 类规格升级' },
          { label: '微服务变化', value: '6 个服务 · 142 commits' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-lg border border-slate-200/80 px-4 py-3.5">
            <div className="text-xs text-slate-400">{m.label}</div>
            <div className="mt-1 text-[15px] font-semibold text-slate-800">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* 需求变化 */}
        <Section title="需求变化">
          <div className="space-y-3 pt-1">
            {c.reqChanges.map(g => (
              <div key={g.type}>
                <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
                  {g.type === '新增' ? <Plus className="w-3.5 h-3.5 text-emerald-500" /> : g.type === '删除' ? <Minus className="w-3.5 h-3.5 text-rose-500" /> : <PencilLine className="w-3.5 h-3.5 text-amber-500" />}
                  <span className={g.type === '新增' ? 'text-emerald-600' : g.type === '删除' ? 'text-rose-600' : 'text-amber-600'}>{g.type}（{g.items.length}）</span>
                </div>
                <div className="space-y-1">
                  {g.items.map(it => (
                    <div key={it} className={cn('text-xs rounded-md px-3 py-2 leading-5',
                      g.type === '新增' ? 'bg-emerald-50/70 text-emerald-800' : g.type === '删除' ? 'bg-rose-50/70 text-rose-700 line-through decoration-rose-300' : 'bg-amber-50/70 text-amber-800')}>{it}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 规格变化 + 环境变化 */}
        <div className="space-y-4">
          <Section title="规格变化">
            <T className="pt-1">
              <thead><tr><th className={thCls}>规格</th><th className={thCls}>{from}</th><th className={thCls}></th><th className={thCls}>{to}</th></tr></thead>
              <tbody>
                {c.specChanges.map(s => (
                  <tr key={s.spec}>
                    <td className={tdCls}>{s.spec}</td>
                    <td className={tdCls}><span className="font-mono text-xs text-slate-400">{s.from}</span></td>
                    <td className={tdCls}><ArrowRight className="w-3.5 h-3.5 text-slate-300" /></td>
                    <td className={tdCls}><span className="font-mono text-xs text-indigo-600 font-medium">{s.to}</span></td>
                  </tr>
                ))}
              </tbody>
            </T>
          </Section>
          <Section title="环境变化">
            <div className="space-y-2 pt-1">
              {c.envChanges.map(e => (
                <div key={e} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{e}
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* 微服务 / Git 变化 */}
        <Section title="微服务与组件版本变化" desc={`${from} → ${to}`} className="col-span-2" pad={false}>
          <T className="border-t border-slate-100 mt-1">
            <thead><tr>
              <th className={cn(thCls, 'pl-5')}>微服务</th><th className={thCls}>旧版本</th><th className={thCls}>新版本</th>
              <th className={thCls}>Commit 范围</th><th className={cn(thCls, 'pr-5')}>变更幅度</th>
            </tr></thead>
            <tbody>
              {c.svcChanges.map(s => (
                <tr key={s.service} className="hover:bg-slate-50/70">
                  <td className={cn(tdCls, 'pl-5 font-mono text-xs')}>{s.service}</td>
                  <td className={tdCls}><span className="font-mono text-xs text-slate-400">{s.from}</span></td>
                  <td className={tdCls}><span className="font-mono text-xs text-indigo-600 font-medium">{s.to}</span></td>
                  <td className={tdCls}><span className="font-mono text-xs text-slate-500">{s.commits} commits</span></td>
                  <td className={cn(tdCls, 'pr-5')}>
                    <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, s.commits * 2)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </T>
        </Section>
      </div>
    </div>
  )
}
