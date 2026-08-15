import { useEffect, useState } from 'react'
import { getAgents, getAgentsCost, type DigitalAgent, type AgentsCost } from '@/api/flow'
import { agentRuns, auditLogs } from '@/mock/data5'
import { PageHeader, Pill, Bar, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Bot, ShieldCheck, Activity, Wallet, ScrollText, Wrench, BookOpen, AlertTriangle, Ban, CheckCircle2, Loader2 } from 'lucide-react'

const agentColor: Record<string, string> = {
  requirements: 'from-blue-500 to-indigo-500',
  design: 'from-cyan-500 to-blue-600',
  tasks: 'from-violet-500 to-purple-600',
  coding: 'from-fuchsia-500 to-pink-600',
  testing: 'from-emerald-500 to-teal-600',
}

const agentTools: Record<string, string[]> = {
  requirements: ['文档解析', '知识库检索（MCP）', '提问澄清'],
  design: ['文档解析', '知识库检索（MCP）', '代码索引'],
  tasks: ['文档解析', '知识库检索（MCP）'],
  coding: ['代码读写', '编译构建', '单元测试', '子代理委派', '知识库检索（MCP）'],
  testing: ['测试执行', '文档解析', '知识库检索（MCP）'],
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export default function AgentsCenter() {
  const [agents, setAgents] = useState<DigitalAgent[]>([])
  const [cost, setCost] = useState<AgentsCost | null>(null)
  const [loading, setLoading] = useState(true)
  const [permAgent, setPermAgent] = useState<DigitalAgent | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([getAgents(), getAgentsCost()])
      .then(([a, c]) => { if (alive) { setAgents(a.agents); setCost(c) } })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const costOf = (id: string) => cost?.agents.find(a => a.id === id)
  const maxCost = Math.max(1, ...(cost?.agents.map(a => a.cost) ?? [1]))

  return (
    <div>
      <PageHeader
        title="数字员工中心"
        desc="5 个阶段 AI 数字员工（需求→设计→任务→编码→测试）· 成本实时统计 · 知识库经 MCP 接入"
        extra={<Pill tone="indigo" dot>harness 执行层驱动</Pill>}
      />

      <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-5 pb-5">
        <Tabs defaultValue="list">
          <TabsList className="bg-transparent border-b border-slate-100 rounded-none w-full justify-start h-11 p-0 gap-6">
            {[['list', '员工列表', Bot], ['cost', '成本分析', Wallet], ['perm', '知识库权限', ShieldCheck], ['monitor', '运行监控', Activity], ['audit', '审计日志', ScrollText]].map(([v, l, I]: any) => (
              <TabsTrigger key={v} value={v} className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]">
                <I className="w-3.5 h-3.5 mr-1.5" />{l}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 员工列表（真实） */}
          <TabsContent value="list" className="mt-4">
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />加载中…</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {agents.map(a => {
                  const c = costOf(a.id)
                  return (
                    <div key={a.id} className="rounded-lg border border-slate-200/80 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <span className={cn('w-10 h-10 rounded-lg bg-gradient-to-br text-white flex items-center justify-center font-semibold text-sm', agentColor[a.id])}>{a.name.replace(/\d+\s*/, '').slice(0, 1)}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold text-slate-800">{a.name}</span>
                            <span className="text-xs text-slate-400 font-mono">{a.preset}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">负责：{a.role}</div>
                        </div>
                      </div>
                      <p className="mt-2.5 text-xs leading-5 text-slate-500">{a.desc}</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md bg-slate-50 py-2"><div className="text-[15px] font-semibold text-slate-800">{c?.sessions ?? 0}</div><div className="text-[10px] text-slate-400">累计会话</div></div>
                        <div className="rounded-md bg-slate-50 py-2"><div className="text-[15px] font-semibold text-slate-800">{fmtTokens((c?.inputTokens ?? 0) + (c?.outputTokens ?? 0))}</div><div className="text-[10px] text-slate-400">Tokens</div></div>
                        <div className="rounded-md bg-slate-50 py-2"><div className="text-[15px] font-semibold text-slate-800">¥{c?.cost ?? 0}</div><div className="text-[10px] text-slate-400">累计成本</div></div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <button className="text-xs text-indigo-600 hover:underline" onClick={() => setPermAgent(a)}>配置能力 / 知识库</button>
                        <Pill tone="green" dot>待命</Pill>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* 成本分析（真实） */}
          <TabsContent value="cost" className="mt-4">
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                ['累计成本', `¥${cost?.totalCost ?? 0}`, '全部阶段 session 汇总'],
                ['累计 Tokens', fmtTokens(cost?.totalTokens ?? 0), '输入 + 输出'],
                ['数字员工', String(agents.length), '需求→设计→任务→编码→测试'],
                ['累计会话', String((cost?.agents ?? []).reduce((s, a) => s + a.sessions, 0)), 'harness session'],
              ].map(([l, v, s]) => (
                <div key={l} className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3.5">
                  <div className="text-xs text-slate-400">{l}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-800">{v}</div>
                  <div className="text-[11px] text-slate-400">{s}</div>
                </div>
              ))}
            </div>
            <div className="mb-3 text-xs font-medium text-slate-500">按数字员工（累计成本，元）</div>
            <div className="space-y-2.5">
              {(cost?.agents ?? []).map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-36 truncate">{a.name}</span>
                  <Bar value={(a.cost / maxCost) * 100} className="flex-1" tone="bg-indigo-500" />
                  <span className="text-xs font-mono text-slate-500 w-16 text-right">¥{a.cost}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="text-xs font-medium text-slate-500 mb-2">Token 明细</div>
              <T>
                <thead><tr><th className={thCls}>数字员工</th><th className={thCls}>会话</th><th className={thCls}>输入 Tokens</th><th className={thCls}>输出 Tokens</th><th className={thCls}>成本</th></tr></thead>
                <tbody>
                  {(cost?.agents ?? []).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td className={tdCls}><span className="font-medium text-slate-800">{a.name}</span></td>
                      <td className={tdCls}><span className="text-xs text-slate-600">{a.sessions}</span></td>
                      <td className={tdCls}><span className="font-mono text-xs text-slate-500">{a.inputTokens.toLocaleString()}</span></td>
                      <td className={tdCls}><span className="font-mono text-xs text-slate-500">{a.outputTokens.toLocaleString()}</span></td>
                      <td className={tdCls}><span className="font-mono text-xs text-slate-500">¥{a.cost}</span></td>
                    </tr>
                  ))}
                </tbody>
              </T>
            </div>
          </TabsContent>

          {/* 知识库权限（真实：每员工可访问的 MCP 标准） */}
          <TabsContent value="perm" className="mt-4">
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
              <span>每个数字员工可访问的知识库（经 MCP 提供，即各阶段标准文件）；其余资源域权限接入中。</span>
            </div>
            <T>
              <thead><tr><th className={thCls}>数字员工</th><th className={thCls}>可访问知识库</th></tr></thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/70">
                    <td className={tdCls}><span className="font-medium text-slate-800">{a.name}</span></td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap gap-1.5">
                        {a.knowledge.length ? a.knowledge.map(k => <Pill key={k} tone="cyan">{k}</Pill>) : <span className="text-xs text-slate-400">暂无</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </T>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: Ban, title: '硬性底线策略', desc: '生产环境只读、禁止直提 main、禁止读取密钥明文——策略优先于一切配置，不可关闭' },
                { icon: ShieldCheck, title: '最小权限原则', desc: '默认无权限，按角色开通；知识库（MCP）为只读查询，写权限需审批' },
                { icon: AlertTriangle, title: '越权实时拦截', desc: '越权行为即时阻断并记录审计日志（接入中）' },
              ].map(p => (
                <div key={p.title} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3.5 flex gap-2.5">
                  <p.icon className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <div><div className="text-xs font-semibold text-slate-800">{p.title}</div><p className="mt-1 text-[11px] leading-4.5 text-slate-500">{p.desc}</p></div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 运行监控（示例数据） */}
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
            <p className="mt-3 text-[11px] text-slate-400">运行监控明细由 session 事件聚合生成，当前展示示例数据（接入中）。</p>
          </TabsContent>

          {/* 审计日志（示例数据） */}
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
            <p className="mt-3 text-[11px] text-slate-400">审计日志与项目基线、Human Gate 决策关联，当前展示示例数据（接入中）。</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* 员工详情抽屉：能力 + 知识库（真实） */}
      <Sheet open={!!permAgent} onOpenChange={() => setPermAgent(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          {permAgent && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <span className={cn('w-9 h-9 rounded-lg bg-gradient-to-br text-white flex items-center justify-center text-sm font-semibold', agentColor[permAgent.id])}>{permAgent.name.replace(/\d+\s*/, '').slice(0, 1)}</span>
                  {permAgent.name} · {permAgent.preset}
                </SheetTitle>
                <SheetDescription>{permAgent.desc}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2"><Wrench className="w-3.5 h-3.5 text-indigo-500" />可用工具</div>
                  <div className="space-y-1.5">
                    {(agentTools[permAgent.id] ?? []).map(t => (
                      <div key={t} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                        <span className="text-xs text-slate-700">{t}</span><Pill tone="green">启用</Pill>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2"><BookOpen className="w-3.5 h-3.5 text-cyan-500" />可访问知识库（MCP 标准）</div>
                  <div className="flex flex-wrap gap-1.5">
                    {permAgent.knowledge.length ? permAgent.knowledge.map(k => <Pill key={k} tone="cyan">{k}</Pill>) : <span className="text-xs text-slate-400">暂无标准文件</span>}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">知识库经 MCP 只读查询提供，维护入口在「标准与规范」页面。</p>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setPermAgent(null)}>关闭</Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setPermAgent(null)}><CheckCircle2 className="w-4 h-4 mr-1" />知道了</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
