import { useState } from 'react'
import { agents, permDomains, permMatrix, agentRuns, costDaily, costByAgent, costByType, auditLogs, type PermLevel } from '@/mock/data5'
import { PageHeader, Pill, Bar, statusTone, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Bot, Plus, ShieldCheck, Activity, Wallet, ScrollText, Wrench, BookOpen, AlertTriangle, Ban, CheckCircle2 } from 'lucide-react'

const permMeta: Record<PermLevel, { label: string; cls: string }> = {
  none: { label: '无权限', cls: 'bg-slate-100 text-slate-400' },
  read: { label: '只读', cls: 'bg-blue-50 text-blue-600' },
  write: { label: '读写', cls: 'bg-emerald-50 text-emerald-600' },
  approval: { label: '需审批', cls: 'bg-amber-50 text-amber-600' },
}
const agentColor: Record<string, string> = { ava: 'from-blue-500 to-indigo-500', neo: 'from-cyan-500 to-blue-600', rex: 'from-violet-500 to-purple-600', dev07: 'from-fuchsia-500 to-pink-600', tess: 'from-emerald-500 to-teal-600', echo: 'from-amber-500 to-orange-600' }

export default function AgentsCenter() {
  const [permAgent, setPermAgent] = useState<string | null>(null)
  const maxDaily = Math.max(...costDaily.map(c => c.v))
  const maxAgentCost = Math.max(...costByAgent.map(c => c.cost))

  return (
    <div>
      <PageHeader
        title="数字员工中心"
        desc="配置 AI 数字员工的能力、权限与预算 · 全量行为可审计"
        extra={<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-1" />新增数字员工</Button>}
      />

      <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-5 pb-5">
        <Tabs defaultValue="list">
          <TabsList className="bg-transparent border-b border-slate-100 rounded-none w-full justify-start h-11 p-0 gap-6">
            {[['list', '员工列表', Bot], ['perm', '权限管理', ShieldCheck], ['monitor', '运行监控', Activity], ['cost', '成本分析', Wallet], ['audit', '审计日志', ScrollText]].map(([v, l, I]: any) => (
              <TabsTrigger key={v} value={v} className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]">
                <I className="w-3.5 h-3.5 mr-1.5" />{l}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 员工列表 */}
          <TabsContent value="list" className="mt-4">
            <div className="grid grid-cols-3 gap-3">
              {agents.map(a => (
                <div key={a.id} className="rounded-lg border border-slate-200/80 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <span className={cn('w-10 h-10 rounded-lg bg-gradient-to-br text-white flex items-center justify-center font-semibold text-sm', agentColor[a.id])}>{a.enName.slice(0, 1)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-slate-800">{a.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{a.enName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">负责阶段：{a.role}</div>
                    </div>
                    <Pill tone={statusTone(a.status)} dot>{a.status}</Pill>
                  </div>
                  <p className="mt-2.5 text-xs leading-5 text-slate-500">{a.desc}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-slate-50 py-2"><div className="text-[15px] font-semibold text-slate-800">{a.totalTasks}</div><div className="text-[10px] text-slate-400">累计任务</div></div>
                    <div className="rounded-md bg-slate-50 py-2"><div className="text-[15px] font-semibold text-slate-800">{a.avgScore}</div><div className="text-[10px] text-slate-400">Evaluation 均分</div></div>
                    <div className="rounded-md bg-slate-50 py-2"><div className="text-[15px] font-semibold text-slate-800">¥{a.monthCost}</div><div className="text-[10px] text-slate-400">本月成本</div></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button className="text-xs text-indigo-600 hover:underline" onClick={() => setPermAgent(a.id)}>配置能力 / 权限</button>
                    <Switch defaultChecked={a.status !== '停用'} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 权限管理 */}
          <TabsContent value="perm" className="mt-4">
            <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
              <span className="font-medium text-slate-700">权限矩阵（员工 × 资源域）</span>
              <span className="flex items-center gap-3 ml-auto">
                {(['none', 'read', 'write', 'approval'] as PermLevel[]).map(p => (
                  <span key={p} className="flex items-center gap-1"><span className={cn('w-2.5 h-2.5 rounded-sm', permMeta[p].cls)} />{permMeta[p].label}</span>
                ))}
              </span>
            </div>
            <T>
              <thead><tr><th className={thCls}>数字员工</th>{permDomains.map(d => <th key={d} className={cn(thCls, 'text-center')}>{d}</th>)}<th className={thCls}>操作</th></tr></thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className={tdCls}><span className="font-medium text-slate-800">{a.name} · {a.enName}</span></td>
                    {permMatrix[a.id].map((p, i) => (
                      <td key={i} className={cn(tdCls, 'text-center')}>
                        <span className={cn('inline-block rounded px-2 py-0.5 text-[11px] font-medium', permMeta[p].cls)}>{permMeta[p].label}</span>
                      </td>
                    ))}
                    <td className={tdCls}><Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPermAgent(a.id)}>调整</Button></td>
                  </tr>
                ))}
              </tbody>
            </T>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: Ban, title: '硬性底线策略', desc: 'PROD 环境只读、禁止直提 main、禁止读取密钥明文——策略优先于一切配置，不可关闭' },
                { icon: ShieldCheck, title: '最小权限原则', desc: '默认无权限，按角色开通；Git 写权限仅项目分支，知识库写入需审批' },
                { icon: AlertTriangle, title: '越权实时拦截', desc: '越权行为即时阻断、自动记录审计日志并通知项目经理，本月已拦截 2 次' },
              ].map(p => (
                <div key={p.title} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5 flex gap-2.5">
                  <p.icon className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div><div className="text-xs font-semibold text-slate-800">{p.title}</div><p className="mt-1 text-[11px] leading-4.5 text-slate-500">{p.desc}</p></div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 运行监控 */}
          <TabsContent value="monitor" className="mt-4">
            <T>
              <thead><tr><th className={thCls}>时间</th><th className={thCls}>数字员工</th><th className={thCls}>行为</th><th className={thCls}>对象</th><th className={thCls}>Tokens</th><th className={thCls}>成本</th><th className={thCls}>结果</th></tr></thead>
              <tbody>
                {agentRuns.map(r => (
                  <tr key={r.time + r.action} className="hover:bg-slate-50/70">
                    <td className={tdCls}><span className="font-mono text-xs text-slate-400">{r.time}</span></td>
                    <td className={tdCls}><span className="text-xs font-medium text-slate-700">{r.agent}</span></td>
                    <td className={tdCls}><span className="text-xs text-slate-600">{r.action}</span></td>
                    <td className={tdCls}><span className="font-mono text-[11px] text-slate-400">{r.target}</span></td>
                    <td className={tdCls}><span className="font-mono text-xs text-slate-500">{r.tokens}</span></td>
                    <td className={tdCls}><span className="font-mono text-xs text-slate-500">{r.cost > 0 ? `¥${r.cost}` : '—'}</span></td>
                    <td className={tdCls}><Pill tone={r.result === '成功' ? 'green' : r.result === '已拦截' ? 'red' : r.result === '已暂停' ? 'amber' : 'blue'} dot>{r.result}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </T>
          </TabsContent>

          {/* 成本分析 */}
          <TabsContent value="cost" className="mt-4">
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[['本月累计', '¥3,357', '预算 ¥8,000 · 42%'], ['今日成本', '¥46.2', '3 项任务'], ['任务均成本', '¥14.2', '较上月 -8%'], ['预计本月', '¥6,900', '按当前消耗趋势']].map(([l, v, s]) => (
                <div key={l} className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3.5">
                  <div className="text-xs text-slate-400">{l}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-800">{v}</div>
                  <div className="text-[11px] text-slate-400">{s}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="text-xs font-medium text-slate-500 mb-3">近 7 日成本（元）</div>
                <div className="flex items-end gap-3 h-40">
                  {costDaily.map(d => (
                    <div key={d.d} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-600">{d.v}</span>
                      <div className="w-full max-w-[44px] rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400" style={{ height: `${(d.v / maxDaily) * 100}%` }} />
                      <span className="text-[10px] text-slate-400">{d.d.slice(5)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <div className="text-xs font-medium text-slate-500 mb-2.5">按数字员工（本月）</div>
                  <div className="space-y-2">
                    {costByAgent.map(a => (
                      <div key={a.name} className="flex items-center gap-3">
                        <span className="text-xs text-slate-600 w-40 truncate">{a.name}</span>
                        <Bar value={(a.cost / maxAgentCost) * 100} className="flex-1" tone="bg-indigo-500" />
                        <span className="text-xs font-mono text-slate-500 w-16 text-right">¥{a.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2.5">按任务类型占比</div>
                <div className="space-y-2.5">
                  {costByType.map((t2, i) => (
                    <div key={t2.name}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">{t2.name}</span><span className="text-slate-500">{t2.pct}%</span></div>
                      <Bar value={t2.pct} tone={['bg-violet-500', 'bg-indigo-500', 'bg-cyan-500', 'bg-slate-300'][i]} />
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-lg border border-amber-100 bg-amber-50/50 p-3.5">
                  <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" />预算告警规则</div>
                  <p className="mt-1.5 text-[11px] leading-4.5 text-amber-700">单员工日成本超 ¥200 自动降级模型；项目月消耗达预算 80% 通知项目经理；达 100% 暂停非关键 AI 任务。</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 审计日志 */}
          <TabsContent value="audit" className="mt-4">
            <T>
              <thead><tr><th className={thCls}>时间</th><th className={thCls}>员工</th><th className={thCls}>事件类型</th><th className={thCls}>级别</th><th className={thCls}>详情</th><th className={thCls}>状态</th></tr></thead>
              <tbody>
                {auditLogs.map(l => (
                  <tr key={l.time} className="hover:bg-slate-50/70">
                    <td className={tdCls}><span className="font-mono text-xs text-slate-400">{l.time}</span></td>
                    <td className={tdCls}><span className="text-xs font-medium text-slate-700">{l.agent}</span></td>
                    <td className={tdCls}><Pill tone={l.type === '越权拦截' ? 'red' : l.type === '权限变更' ? 'amber' : l.type === '分支外提交' ? 'amber' : 'slate'}>{l.type}</Pill></td>
                    <td className={tdCls}><Pill tone={l.level === '高' ? 'red' : l.level === '中' ? 'amber' : 'slate'}>{l.level}</Pill></td>
                    <td className={tdCls}><span className="text-xs text-slate-600 leading-5">{l.detail}</span></td>
                    <td className={tdCls}><Pill tone={l.status === '已处置' || l.status === '已生效' ? 'green' : l.status === '待审批' ? 'amber' : 'slate'} dot={l.status !== '正常'}>{l.status}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </T>
            <p className="mt-3 text-[11px] text-slate-400">审计日志保留 3 年，与项目基线、Human Gate 决策记录关联，支持按员工 / 项目 / 事件类型导出。</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* 员工详情抽屉：能力 + 权限配置 */}
      <Sheet open={!!permAgent} onOpenChange={() => setPermAgent(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          {permAgent && (() => {
            const a = agents.find(x => x.id === permAgent)!
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2.5">
                    <span className={cn('w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center text-sm font-semibold', agentColor[a.id])}>{a.enName.slice(0, 1)}</span>
                    {a.name} · {a.enName}
                  </SheetTitle>
                  <SheetDescription>{a.desc}</SheetDescription>
                </SheetHeader>
                <div className="mt-5 space-y-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2"><Wrench className="w-3.5 h-3.5 text-indigo-500" />可用工具</div>
                    <div className="space-y-1.5">
                      {a.tools.map(t2 => (
                        <div key={t2} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                          <span className="text-xs text-slate-700">{t2}</span><Switch defaultChecked />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2"><BookOpen className="w-3.5 h-3.5 text-cyan-500" />可访问知识</div>
                    <div className="flex flex-wrap gap-1.5">{a.knowledge.map(k => <Pill key={k} tone="cyan">{k}</Pill>)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />资源权限</div>
                    <div className="space-y-1.5">
                      {permDomains.map((d, i) => {
                        const p = permMatrix[a.id][i]
                        return (
                          <div key={d} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                            <span className="text-xs text-slate-700">{d}</span>
                            <div className="flex gap-1">
                              {(['none', 'read', 'write', 'approval'] as PermLevel[]).map(lv => (
                                <button key={lv} className={cn('rounded px-2 py-0.5 text-[10.5px] font-medium transition-colors',
                                  p === lv ? permMeta[lv].cls + ' ring-1 ring-current' : 'text-slate-300 hover:text-slate-500')}>
                                  {permMeta[lv].label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1"><Ban className="w-3 h-3" />底线策略（PROD 只读 / 禁提 main / 禁读密钥）不可修改。</p>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="outline" onClick={() => setPermAgent(null)}>取消</Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setPermAgent(null)}><CheckCircle2 className="w-4 h-4 mr-1" />保存配置</Button>
                  </div>
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>
    </div>
  )
}
