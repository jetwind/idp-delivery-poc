import { useState } from 'react'
import { kbCategories, kbEntries, kbReviews, kbUsage, kbAgents, kbGovernance, type KBEntry } from '@/mock/data6'
import { PageHeader, Pill, Bar, statusTone, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import KBCreate from '@/components/KBCreate'
import {
  BookOpen, LayoutGrid, List, Inbox, Share2, Search, Plus, Bot, ShieldCheck,
  CheckCircle2, XCircle, AlertTriangle, GitBranch, Link2, History, Sparkles, User,
} from 'lucide-react'

const catTone: Record<string, string> = { 产品知识库: 'bg-blue-50 text-blue-600', 行业知识: 'bg-cyan-50 text-cyan-600', 技术规范: 'bg-violet-50 text-violet-600', 最佳实践: 'bg-emerald-50 text-emerald-600', 项目沉淀资产: 'bg-amber-50 text-amber-600' }
const reviewTone: Record<string, any> = { 待审批: 'amber', 已通过: 'green', 已驳回: 'red' }

export default function KnowledgeCenter() {
  const [entry, setEntry] = useState<KBEntry | null>(null)
  const [cat, setCat] = useState('all')
  const [status, setStatus] = useState('all')
  const [kw, setKw] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const list = kbEntries.filter(e =>
    (cat === 'all' || e.category === cat) &&
    (status === 'all' || e.status === status) &&
    (!kw || e.title.includes(kw)))
  const pendingCount = kbReviews.filter(r => r.status === '待审批').length

  return (
    <div>
      <PageHeader
        title="知识库管理"
        desc="企业知识的沉淀、审核、发布与消费 · 数字员工执行任务时的知识来源"
        extra={<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" />新建知识</Button>}
      />

      <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-5 pb-5">
        <Tabs defaultValue="overview">
          <TabsList className="bg-transparent border-b border-slate-100 rounded-none w-full justify-start h-11 p-0 gap-6">
            <TabsTrigger value="overview" className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]"><LayoutGrid className="w-3.5 h-3.5 mr-1.5" />知识库总览</TabsTrigger>
            <TabsTrigger value="entries" className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]"><List className="w-3.5 h-3.5 mr-1.5" />知识条目</TabsTrigger>
            <TabsTrigger value="review" className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]">
              <Inbox className="w-3.5 h-3.5 mr-1.5" />入库审核
              {pendingCount > 0 && <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5">{pendingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="usage" className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]"><Share2 className="w-3.5 h-3.5 mr-1.5" />引用与治理</TabsTrigger>
          </TabsList>

          {/* 总览 */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: '知识条目总数', value: kbCategories.reduce((a, b) => a + b.entries, 0), sub: '本月新增 12' },
                { label: '累计被 AI 引用', value: '529 次', sub: '近 30 天 · 按任务调用计' },
                { label: '待审核入库', value: `${pendingCount} 条`, sub: '来源：项目复盘沉淀' },
                { label: '平均健康度', value: '86', sub: '新鲜度 × 引用率综合评估' },
              ].map(m => (
                <div key={m.label} className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3.5">
                  <div className="text-xs text-slate-400">{m.label}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-800">{m.value}</div>
                  <div className="text-[11px] text-slate-400">{m.sub}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {kbCategories.map(c => (
                <div key={c.id} className="rounded-lg border border-slate-200/80 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium', catTone[c.name])}><BookOpen className="w-3.5 h-3.5" />{c.name}</span>
                    <span className={cn('text-xs font-semibold', c.health >= 90 ? 'text-emerald-600' : c.health >= 80 ? 'text-indigo-600' : 'text-amber-600')}>健康度 {c.health}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{c.desc}</p>
                  <Bar value={c.health} className="mt-3" tone={c.health >= 90 ? 'bg-emerald-500' : c.health >= 80 ? 'bg-indigo-500' : 'bg-amber-500'} />
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{c.entries} 条 · 被引用 {c.refs} 次</span>
                    <span>更新 {c.updated.slice(5)}</span>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-violet-200/70 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800"><Sparkles className="w-4 h-4 text-violet-500" />知识如何被 AI 使用</div>
                <p className="mt-2 text-xs leading-5.5 text-slate-600">数字员工执行任务时自动检索相关知识：需求分析师引用行业知识、方案架构师引用技术规范与最佳实践、Coding Agent 引用编码规范。每次引用计入审计，可在「引用与治理」查看。</p>
                <p className="mt-2 text-xs leading-5.5 text-slate-600">项目复盘识别的资产候选，经「复盘沉淀 → 入库审核 → 发布」后进入知识库，形成企业级复用。</p>
              </div>
            </div>
          </TabsContent>

          {/* 条目 */}
          <TabsContent value="entries" className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <Select value={cat} onValueChange={setCat}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="知识分类" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {kbCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {['已发布', '待审核', '草稿', '待更新'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative flex-1 max-w-[280px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input value={kw} onChange={e => setKw(e.target.value)} placeholder="搜索知识名称" className="h-8 pl-8 text-xs" />
              </div>
              <span className="text-xs text-slate-400 ml-auto">{list.length} 条知识</span>
            </div>
            <T>
              <thead><tr>
                <th className={thCls}>知识名称</th><th className={thCls}>分类</th><th className={thCls}>类型</th>
                <th className={thCls}>来源</th><th className={thCls}>状态</th><th className={thCls}>版本</th>
                <th className={thCls}>被引用</th><th className={thCls}>使用中的数字员工</th><th className={thCls}>更新时间</th><th className={thCls}></th>
              </tr></thead>
              <tbody>
                {list.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/70 cursor-pointer" onClick={() => setEntry(e)}>
                    <td className={tdCls}><span className="font-medium text-slate-800">{e.title}</span></td>
                    <td className={tdCls}><span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', catTone[e.category])}>{e.category}</span></td>
                    <td className={tdCls}><Pill tone="slate">{e.type}</Pill></td>
                    <td className={tdCls}><span className="text-xs text-slate-500">{e.source}</span></td>
                    <td className={tdCls}><Pill tone={statusTone(e.status)} dot>{e.status}</Pill></td>
                    <td className={tdCls}><span className="font-mono text-xs">{e.version}</span></td>
                    <td className={tdCls}><span className="text-xs font-medium text-slate-700">{e.refs}</span></td>
                    <td className={tdCls}>
                      <div className="flex gap-1 flex-wrap">
                        {e.agents.length > 0 ? e.agents.map(a => (
                          <span key={a} className="inline-flex items-center gap-1 rounded bg-violet-50 text-violet-600 px-1.5 py-0.5 text-[10.5px] font-medium"><Bot className="w-2.5 h-2.5" />{a}</span>
                        )) : <span className="text-xs text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className={tdCls}><span className="text-xs text-slate-400">{e.updated}</span></td>
                    <td className={tdCls}><Button variant="ghost" size="sm" className="h-7 text-xs">详情</Button></td>
                  </tr>
                ))}
              </tbody>
            </T>
          </TabsContent>

          {/* 入库审核 */}
          <TabsContent value="review" className="mt-4">
            <div className="grid grid-cols-[1fr_300px] gap-4 items-start">
              <div className="space-y-3">
                {kbReviews.map(r => (
                  <div key={r.id} className={cn('rounded-lg border p-4', r.status === '待审批' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100')}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-slate-800">{r.title}</span>
                      <Pill tone="violet">{r.type}</Pill>
                      <Pill tone={reviewTone[r.status]} dot>{r.status}</Pill>
                      <span className="ml-auto text-[11px] text-slate-400 font-mono">{r.time}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">{r.summary}</p>
                    <div className="mt-2.5 flex items-center gap-4 text-[11px] text-slate-400">
                      <span>来源：{r.from}</span>
                      <span className="flex items-center gap-1"><Bot className="w-3 h-3 text-violet-400" />提交：{r.applicant}</span>
                      <span className="flex items-center gap-1.5">AI 质量预检
                        <Bar value={r.score} className="w-16" tone={r.score >= 85 ? 'bg-emerald-500' : 'bg-amber-500'} />
                        <b className={r.score >= 85 ? 'text-emerald-600' : 'text-amber-600'}>{r.score}</b>
                      </span>
                    </div>
                    {r.status === '待审批' ? (
                      <div className="mt-3 flex items-center justify-end gap-2 pt-3 border-t border-amber-100">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-rose-500 border-rose-200 hover:bg-rose-50"><XCircle className="w-3.5 h-3.5 mr-1" />驳回</Button>
                        <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 mr-1" />通过并发布 V1.0</Button>
                      </div>
                    ) : (
                      <div className={cn('mt-3 rounded-md px-3 py-2 text-xs flex items-start gap-2', r.status === '已通过' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600')}>
                        <User className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span><b>{r.reviewer}</b>（知识管理员）：{r.note}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800"><ShieldCheck className="w-4 h-4 text-indigo-500" />入库规则</div>
                  <div className="mt-2.5 space-y-2.5 text-xs leading-5 text-slate-600">
                    <p>1. 数字员工对企业知识库<b>无直接写权限</b>，只能提交入库申请。</p>
                    <p>2. 申请经 AI 质量预检（完整度、规范性、重复度）后，由知识管理员审批发布。</p>
                    <p>3. 发布的知识带版本号与来源追溯，可被数字员工在任务中引用。</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-100 p-4">
                  <div className="text-xs font-semibold text-slate-700 mb-2">本月审核统计</div>
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex justify-between"><span>提交申请</span><b className="text-slate-700">9 条</b></div>
                    <div className="flex justify-between"><span>通过发布</span><b className="text-emerald-600">6 条</b></div>
                    <div className="flex justify-between"><span>驳回补充</span><b className="text-rose-500">1 条</b></div>
                    <div className="flex justify-between"><span>平均审批时长</span><b className="text-slate-700">1.2 天</b></div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 引用与治理 */}
          <TabsContent value="usage" className="mt-4">
            <div className="grid grid-cols-[1fr_320px] gap-4 items-start">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">知识 × 数字员工引用矩阵（近 30 天调用次数）</div>
                <T>
                  <thead><tr>
                    <th className={thCls}>知识</th>
                    {kbAgents.map(a => <th key={a} className={cn(thCls, 'text-center')}>{a}</th>)}
                    <th className={cn(thCls, 'text-center')}>合计</th>
                  </tr></thead>
                  <tbody>
                    {kbUsage.map(u => (
                      <tr key={u.name} className="hover:bg-slate-50/70">
                        <td className={tdCls}><span className="text-xs font-medium text-slate-700">{u.name}</span></td>
                        {kbAgents.map(a => {
                          const v = (u.usage as any)[a] ?? 0
                          return (
                            <td key={a} className={cn(tdCls, 'text-center')}>
                              {v > 0
                                ? <span className={cn('inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold', v >= 25 ? 'bg-violet-100 text-violet-700' : v >= 10 ? 'bg-violet-50 text-violet-600' : 'bg-slate-50 text-slate-500')}>{v}</span>
                                : <span className="text-slate-200 text-xs">·</span>}
                            </td>
                          )
                        })}
                        <td className={cn(tdCls, 'text-center')}><b className="text-xs text-slate-700">{u.total}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </T>
                <p className="mt-2 text-[11px] text-slate-400">引用次数与 AI Task 执行日志、审计日志关联，可追溯到具体任务。</p>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">治理提醒（{kbGovernance.length}）</div>
                <div className="space-y-2.5">
                  {kbGovernance.map(g => (
                    <div key={g.title} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className={cn('w-3.5 h-3.5', g.level === '中' ? 'text-amber-500' : 'text-slate-400')} />
                        <Pill tone={g.level === '中' ? 'amber' : 'slate'}>{g.level}</Pill>
                      </div>
                      <div className="mt-1.5 text-xs font-medium text-slate-800 leading-5">{g.title}</div>
                      <p className="mt-1 text-[11px] leading-4.5 text-slate-500">{g.desc}</p>
                      <button className="mt-2 text-[11px] font-medium text-indigo-600 hover:underline">{g.action} →</button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3.5 text-[11px] leading-5 text-slate-500">
                  <b className="text-slate-700">自动治理策略</b>：90 天未引用自动降权 · 180 天未更新提醒责任人 · 重复内容定期检测。
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <KBCreate open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* 知识详情抽屉 */}
      <Sheet open={!!entry} onOpenChange={() => setEntry(null)}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          {entry && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  {entry.title}
                  <span className="font-mono text-xs text-slate-400">{entry.version}</span>
                  <Pill tone={statusTone(entry.status)} dot>{entry.status}</Pill>
                </SheetTitle>
                <SheetDescription>{entry.category} · {entry.type} · 维护人 {entry.author}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-center"><div className="text-lg font-semibold text-slate-800 leading-6">{entry.refs}</div><div className="text-[10px] text-slate-400">被引用</div></div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-center"><div className="text-lg font-semibold text-slate-800 leading-6">{entry.agents.length}</div><div className="text-[10px] text-slate-400">数字员工</div></div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-center"><div className="text-lg font-semibold text-slate-800 leading-6">{entry.history?.length ?? 1}</div><div className="text-[10px] text-slate-400">版本数</div></div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-2">内容预览</div>
                  <div className="rounded-lg border border-slate-100 p-3.5 space-y-2">
                    {(entry.preview ?? ['该知识为结构化条目，发布后供数字员工在任务执行中检索引用。']).map((p, i) => (
                      <p key={i} className="text-xs leading-5.5 text-slate-600 flex gap-2"><span className="w-1 h-1 rounded-full bg-indigo-400 mt-2 shrink-0" />{p}</p>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2"><Link2 className="w-3.5 h-3.5 text-indigo-500" />来源追溯</div>
                  <div className="rounded-lg bg-indigo-50/50 border border-indigo-100 px-3.5 py-2.5 text-xs leading-5.5 text-slate-600">{entry.sourceDetail}</div>
                </div>

                {entry.agents.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2"><Bot className="w-3.5 h-3.5 text-violet-500" />使用中的数字员工</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {entry.agents.map(a => <span key={a} className="inline-flex items-center gap-1 rounded-md bg-violet-50 text-violet-600 px-2 py-1 text-xs font-medium"><Bot className="w-3 h-3" />{a}</span>)}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2"><History className="w-3.5 h-3.5 text-slate-400" />版本历史</div>
                  <div className="space-y-2">
                    {(entry.history ?? [{ v: entry.version, note: '当前版本', time: entry.updated }]).map(h => (
                      <div key={h.v} className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-indigo-600 w-10">{h.v}</span>
                        <span className="flex-1 text-slate-600">{h.note}</span>
                        <span className="text-slate-400 font-mono">{h.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {entry.status === '待审核' && (
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1.5">审批意见</div>
                    <Textarea rows={2} placeholder="填写审批意见…" />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  {entry.status === '待审核' ? (
                    <>
                      <Button variant="outline" className="text-rose-500 border-rose-200 hover:bg-rose-50"><XCircle className="w-4 h-4 mr-1" />驳回</Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 mr-1" />通过并发布</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setEntry(null)}>关闭</Button>
                      <Button variant="outline"><GitBranch className="w-4 h-4 mr-1" />版本管理</Button>
                      <Button className="bg-indigo-600 hover:bg-indigo-700">编辑</Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
