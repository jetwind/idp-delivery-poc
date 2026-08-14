import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { projects, products } from '@/mock/data'
import { PageHeader, Pill, Bar, statusTone, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, ChevronRight, AlertTriangle, ListChecks, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

const stageFlow = ['需求', '方案', '开发', '测试', '交付']
const prodStageFlow = ['规划', '研发', '运营']

export default function ProjectList() {
  const nav = useNavigate()
  const [tab, setTab] = useState<'projects' | 'products'>('projects')
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('all')

  const plist = projects.filter((p) =>
    (status === 'all' || p.status === status) &&
    (!kw || p.name.includes(kw) || p.client.includes(kw) || p.owner.includes(kw) || p.code.includes(kw)))
  const pdlist = products.filter((p) =>
    (status === 'all' || p.status === status) &&
    (!kw || p.name.includes(kw) || p.line.includes(kw) || p.owner.includes(kw) || p.code.includes(kw)))

  return (
    <div>
      <PageHeader
        title="项目与产品"
        desc={`交付项目（禅道立项）与自有产品（持续演进）统一管理 · ${projects.length} 个项目 · ${products.length} 个产品`}
        extra={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => nav('/projects/new?type=product')}>
              <Package className="w-4 h-4 mr-1" />新建产品
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => nav('/projects/new')}>
              <Plus className="w-4 h-4 mr-1" />创建项目
            </Button>
          </div>
        }
      />

      {/* 对象切换 + 筛选栏 */}
      <div className="bg-white rounded-lg border border-slate-200/80 px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md bg-slate-100 p-0.5 text-xs">
          {([['projects', `项目 ${projects.length}`], ['products', `产品 ${products.length}`]] as const).map(([v, l]) => (
            <button key={v} onClick={() => { setTab(v); setStatus('all') }}
              className={cn('px-3.5 h-7 rounded-[5px] transition-colors', tab === v ? 'bg-white shadow-sm text-slate-800 font-medium' : 'text-slate-500 hover:text-slate-700')}>
              {l}
            </button>
          ))}
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {(tab === 'projects' ? ['准备中', '进行中', '暂停', '已完成'] : ['规划中', '开发中', '运营中']).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input value={kw} onChange={e => setKw(e.target.value)} placeholder={tab === 'projects' ? '搜索项目名称 / 客户 / 负责人 / 编号' : '搜索产品名称 / 产品线 / 负责人 / 编号'} className="h-8 pl-8 text-xs" />
        </div>
        <span className="text-xs text-slate-400 ml-auto">命中 {tab === 'projects' ? plist.length : pdlist.length} 个</span>
      </div>

      {/* 项目表格 */}
      {tab === 'projects' && (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <T>
            <thead>
              <tr>
                <th className={thCls}>项目名称 / 编号</th>
                <th className={thCls}>客户</th>
                <th className={thCls}>负责人</th>
                <th className={thCls}>状态</th>
                <th className={thCls}>当前阶段</th>
                <th className={thCls}>整体进度</th>
                <th className={thCls}>风险提示</th>
                <th className={thCls}>我的待办</th>
                <th className={thCls}>最新版本</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody>
              {plist.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 cursor-pointer group" onClick={() => nav(`/projects/${p.id}`)}>
                  <td className={tdCls}>
                    <Link to={`/projects/${p.id}`} className="font-medium text-slate-800 group-hover:text-indigo-600" onClick={e => e.stopPropagation()}>{p.name}</Link>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">{p.code}</div>
                  </td>
                  <td className={tdCls}>{p.client}</td>
                  <td className={tdCls}>{p.owner}</td>
                  <td className={tdCls}><Pill tone={statusTone(p.status)} dot>{p.status}</Pill></td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-1">
                      {stageFlow.map((s, i) => {
                        const cur = stageFlow.indexOf(p.stage as string)
                        const done = i < cur || p.status === '已完成'
                        const active = s === p.stage
                        return (
                          <span key={s} className={cn('px-1.5 h-5 inline-flex items-center rounded text-[11px]',
                            active ? 'bg-indigo-600 text-white font-medium' : done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                            {s}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-2 w-[110px]">
                      <Bar value={p.progress} className="flex-1" />
                      <span className="text-xs text-slate-500 w-8">{p.progress}%</span>
                    </div>
                  </td>
                  <td className={tdCls}>
                    {p.risks > 0 ? (
                      <button className="inline-flex items-center gap-1 text-rose-600 hover:underline" onClick={e => { e.stopPropagation(); nav(`/projects/${p.id}/delivery`) }}>
                        <AlertTriangle className="w-3.5 h-3.5" />{p.risks} 项风险
                      </button>
                    ) : <span className="text-slate-300 text-xs">无风险</span>}
                  </td>
                  <td className={tdCls}>
                    {p.todos > 0 ? (
                      <button className="inline-flex items-center gap-1 text-indigo-600 hover:underline" onClick={e => { e.stopPropagation(); nav(`/projects/${p.id}/delivery`) }}>
                        <ListChecks className="w-3.5 h-3.5" />{p.todos} 项待办
                      </button>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className={tdCls}>
                    {p.release !== '—' ? (
                      <button className="font-mono text-xs text-slate-700 hover:text-indigo-600 hover:underline" onClick={e => { e.stopPropagation(); nav(`/projects/${p.id}/releases/v130`) }}>
                        {p.release}
                      </button>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className={tdCls}><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" /></td>
                </tr>
              ))}
            </tbody>
          </T>
        </div>
      )}

      {/* 产品表格 */}
      {tab === 'products' && (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <T>
            <thead>
              <tr>
                <th className={thCls}>产品名称 / 编号</th>
                <th className={thCls}>产品线</th>
                <th className={thCls}>负责人</th>
                <th className={thCls}>状态</th>
                <th className={thCls}>演进阶段</th>
                <th className={thCls}>成熟度</th>
                <th className={thCls}>风险提示</th>
                <th className={thCls}>我的待办</th>
                <th className={thCls}>当前版本</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody>
              {pdlist.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 cursor-pointer group" onClick={() => nav(`/projects/${p.id}`)}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center text-xs font-semibold shrink-0">{p.name.slice(0, 1)}</span>
                      <div>
                        <Link to={`/projects/${p.id}`} className="font-medium text-slate-800 group-hover:text-indigo-600" onClick={e => e.stopPropagation()}>{p.name}</Link>
                        <div className="text-xs text-slate-400 mt-0.5 font-mono">{p.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className={tdCls}><Pill tone="cyan">{p.line}</Pill></td>
                  <td className={tdCls}>{p.owner}</td>
                  <td className={tdCls}><Pill tone={statusTone(p.status)} dot>{p.status}</Pill></td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-1">
                      {prodStageFlow.map((s) => {
                        const cur = prodStageFlow.indexOf(p.stage)
                        const i = prodStageFlow.indexOf(s)
                        const done = i < cur
                        const active = s === p.stage
                        return (
                          <span key={s} className={cn('px-1.5 h-5 inline-flex items-center rounded text-[11px]',
                            active ? 'bg-cyan-600 text-white font-medium' : done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                            {s}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className={tdCls}>
                    <div className="flex items-center gap-2 w-[110px]">
                      <Bar value={p.progress} className="flex-1" tone="bg-cyan-500" />
                      <span className="text-xs text-slate-500 w-8">{p.progress}%</span>
                    </div>
                  </td>
                  <td className={tdCls}>
                    {p.risks > 0 ? (
                      <button className="inline-flex items-center gap-1 text-rose-600 hover:underline" onClick={e => { e.stopPropagation(); nav(`/projects/${p.id}/delivery`) }}>
                        <AlertTriangle className="w-3.5 h-3.5" />{p.risks} 项风险
                      </button>
                    ) : <span className="text-slate-300 text-xs">无风险</span>}
                  </td>
                  <td className={tdCls}>
                    {p.todos > 0 ? (
                      <button className="inline-flex items-center gap-1 text-indigo-600 hover:underline" onClick={e => { e.stopPropagation(); nav(`/projects/${p.id}/delivery`) }}>
                        <ListChecks className="w-3.5 h-3.5" />{p.todos} 项待办
                      </button>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className={tdCls}>
                    {p.release !== '—' ? (
                      <button className="font-mono text-xs text-slate-700 hover:text-indigo-600 hover:underline" onClick={e => { e.stopPropagation(); nav(`/projects/${p.id}/releases/v130`) }}>
                        {p.release}
                      </button>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className={tdCls}><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" /></td>
                </tr>
              ))}
            </tbody>
          </T>
          <div className="px-5 py-3 border-t border-slate-50 text-[11px] text-slate-400">
            产品为公司自有资产，直接创建、持续演进，无客户与交付周期概念；AI 原生交付能力（规格 / 流程 / 基线 / 复盘）与项目一致。
          </div>
        </div>
      )}
    </div>
  )
}
