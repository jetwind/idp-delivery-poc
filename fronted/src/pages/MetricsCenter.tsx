import { metricsOverview, projectMetrics, aiEfficiency, qualityMetrics, costMetrics } from '@/mock/data7'
import { PageHeader, Pill, Bar, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router'
import {
  LayoutDashboard, FolderKanban, Sparkles, ShieldCheck, Download,
  TrendingUp, CircleDollarSign, Target, AlertTriangle,
} from 'lucide-react'

function healthTone(h: number) {
  return h >= 85 ? 'text-emerald-600' : h >= 70 ? 'text-indigo-600' : h >= 60 ? 'text-amber-600' : 'text-rose-600'
}
function healthBar(h: number) {
  return h >= 85 ? 'bg-emerald-500' : h >= 70 ? 'bg-indigo-500' : h >= 60 ? 'bg-amber-500' : 'bg-rose-500'
}

export default function MetricsCenter() {
  const nav = useNavigate()
  const o = metricsOverview
  const maxCost = Math.max(...costMetrics.byProject.map(p => p.cost))
  const maxMonthly = Math.max(...costMetrics.monthly.map(m => m.v))
  const maxTrend = Math.max(...aiEfficiency.trend.map(t => t.tasks))

  return (
    <div>
      <PageHeader
        title="度量中心"
        desc="管理人员视角 · 多项目经营、AI 效能、质量与成本的统一度量"
        extra={<Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-1" />导出月报</Button>}
      />

      {/* 顶部核心指标带 */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        {[
          { label: '在管项目', value: o.projects.total, sub: `进行中 ${o.projects.running} · 暂停 ${o.projects.paused}`, tone: 'text-slate-800' },
          { label: '本月 AI 任务', value: o.ai.monthTasks, sub: '环比 +6.8%', tone: 'text-violet-600' },
          { label: 'AI 结果接受率', value: `${o.ai.acceptance}%`, sub: '人工确认后采纳', tone: 'text-indigo-600' },
          { label: 'Gate 首轮通过率', value: `${o.ai.gateFirstPass}%`, sub: `平均确认时长 5.2h`, tone: 'text-cyan-600' },
          { label: 'Evaluation 均分', value: o.quality.evalAvg, sub: `规格确认率 ${o.quality.specConfirmedRate}%`, tone: 'text-emerald-600' },
          { label: '本月 AI 成本', value: `¥${o.cost.monthAiCost.toLocaleString()}`, sub: `预算 ¥${o.cost.budget.toLocaleString()}`, tone: 'text-amber-600' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-lg border border-slate-200/80 px-4 py-3.5">
            <div className="text-[11px] text-slate-400">{m.label}</div>
            <div className={cn('mt-1 text-[20px] leading-6 font-semibold tracking-tight', m.tone)}>{m.value}</div>
            <div className="mt-0.5 text-[11px] text-slate-400">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-5 pb-5">
        <Tabs defaultValue="projects">
          <TabsList className="bg-transparent border-b border-slate-100 rounded-none w-full justify-start h-11 p-0 gap-6">
            <TabsTrigger value="projects" className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]"><FolderKanban className="w-3.5 h-3.5 mr-1.5" />项目经营对比</TabsTrigger>
            <TabsTrigger value="ai" className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]"><Sparkles className="w-3.5 h-3.5 mr-1.5" />AI 效能度量</TabsTrigger>
            <TabsTrigger value="quality" className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]"><ShieldCheck className="w-3.5 h-3.5 mr-1.5" />质量与风险</TabsTrigger>
            <TabsTrigger value="cost" className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]"><CircleDollarSign className="w-3.5 h-3.5 mr-1.5" />成本与 ROI</TabsTrigger>
          </TabsList>

          {/* 项目经营对比 */}
          <TabsContent value="projects" className="mt-4">
            <T>
              <thead><tr>
                <th className={thCls}>项目</th><th className={thCls}>负责人</th><th className={thCls}>阶段</th>
                <th className={thCls}>进度</th><th className={thCls}>健康度</th><th className={thCls}>风险</th>
                <th className={thCls}>AI 任务</th><th className={thCls}>接受率</th><th className={thCls}>Eval 均分</th>
                <th className={thCls}>AI 成本</th><th className={thCls}>周期</th>
              </tr></thead>
              <tbody>
                {projectMetrics.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/70 cursor-pointer" onClick={() => nav(`/projects/${p.id}`)}>
                    <td className={tdCls}><span className="font-medium text-slate-800">{p.name}</span></td>
                    <td className={tdCls}>{p.owner}</td>
                    <td className={tdCls}><Pill tone={p.stage === '复盘' ? 'green' : p.stage === '需求' ? 'slate' : 'blue'}>{p.stage}</Pill></td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2 w-[110px]"><Bar value={p.progress} className="flex-1" /><span className="text-xs text-slate-500">{p.progress}%</span></div>
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2 w-[100px]">
                        <Bar value={p.health} className="flex-1" tone={healthBar(p.health)} />
                        <span className={cn('text-xs font-semibold', healthTone(p.health))}>{p.health}</span>
                      </div>
                    </td>
                    <td className={tdCls}>{p.risks > 0 ? <span className="text-rose-600 font-medium text-xs">{p.risks} 项</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                    <td className={tdCls}><span className="text-xs">{p.aiTasks}</span></td>
                    <td className={tdCls}><span className={cn('text-xs', p.acceptance >= 85 ? 'text-emerald-600 font-medium' : p.acceptance >= 75 ? 'text-slate-700' : 'text-amber-600 font-medium')}>{p.acceptance}%</span></td>
                    <td className={tdCls}><span className={cn('text-xs', p.evalAvg >= 85 ? 'text-emerald-600' : p.evalAvg >= 80 ? 'text-slate-700' : 'text-amber-600')}>{p.evalAvg}</span></td>
                    <td className={tdCls}><span className="font-mono text-xs">¥{p.aiCost.toLocaleString()}</span></td>
                    <td className={tdCls}><span className={cn('text-xs', p.cycle.includes('滞后') ? 'text-rose-600' : p.cycle.includes('提前') ? 'text-emerald-600' : 'text-slate-500')}>{p.cycle}</span></td>
                  </tr>
                ))}
              </tbody>
            </T>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-rose-100 bg-rose-50/50 px-4 py-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div className="text-xs leading-5 text-rose-700"><b>需关注：SAP 集成中台实施</b>——健康度 55、滞后 12 天、AI 接受率仅 71%，建议介入排查上游资料与方案返工原因。</div>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3 flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="text-xs leading-5 text-emerald-700"><b>标杆：智慧仓储 WMS 升级</b>——接受率 89%、Eval 均分 91、提前 3 天，其上下文完整度做法可横向推广。</div>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 flex items-start gap-2.5">
                <Target className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <div className="text-xs leading-5 text-indigo-700"><b>规律发现</b>：上下文完整度 ≥ 85 的项目，AI 接受率平均高 11pt、返工率低 8pt——建议将完整度纳入立项检查。</div>
              </div>
            </div>
          </TabsContent>

          {/* AI 效能 */}
          <TabsContent value="ai" className="mt-4">
            <div className="grid grid-cols-[1fr_340px] gap-5 items-start">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">各交付阶段 AI 效能（近 6 个月）</div>
                <T>
                  <thead><tr>
                    <th className={thCls}>阶段</th><th className={thCls}>任务数</th><th className={thCls}>AI 自动化率</th>
                    <th className={thCls}>平均周期</th><th className={thCls}>预估节省</th>
                  </tr></thead>
                  <tbody>
                    {aiEfficiency.byStage.map(s => (
                      <tr key={s.stage} className="hover:bg-slate-50/70">
                        <td className={tdCls}><span className="font-medium text-slate-800">{s.stage}</span></td>
                        <td className={tdCls}><span className="text-xs">{s.tasks}</span></td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-2 w-[140px]">
                            <Bar value={s.aiAuto} className="flex-1" tone="bg-violet-500" />
                            <span className="text-xs font-medium text-violet-600">{s.aiAuto}%</span>
                          </div>
                        </td>
                        <td className={tdCls}><span className="text-xs">{s.avgDays} 天</span></td>
                        <td className={tdCls}><span className="text-xs text-emerald-600">{s.saved}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </T>
                <div className="mt-5">
                  <div className="text-xs font-medium text-slate-500 mb-2.5">AI 任务量与接受率趋势</div>
                  <div className="flex items-end gap-4 h-40">
                    {aiEfficiency.trend.map(t => (
                      <div key={t.m} className="flex-1 flex flex-col items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">{t.acceptance}%</span>
                        <span className="text-[11px] font-medium text-slate-600">{t.tasks}</span>
                        <div className="w-full max-w-[52px] rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400 relative" style={{ height: `${(t.tasks / maxTrend) * 100}%` }}>
                          <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 border border-white" />
                        </div>
                        <span className="text-[10px] text-slate-400">{t.m}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-indigo-500 to-violet-400" />任务数</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />接受率</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">数字员工效能榜（本月）</div>
                <div className="space-y-2.5">
                  {aiEfficiency.topAgents.map((a, i) => (
                    <div key={a.name} className="rounded-lg border border-slate-100 p-3.5">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center',
                          i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500')}>{i + 1}</span>
                        <span className="text-[13px] font-medium text-slate-800 flex-1">{a.name}</span>
                        <span className="text-xs text-slate-400">{a.tasks} 任务</span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                        <span>接受率 <b className={a.acceptance >= 85 ? 'text-emerald-600' : 'text-slate-700'}>{a.acceptance}%</b></span>
                        <span>成本 <b className="text-slate-700 font-mono">¥{a.cost}</b></span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{a.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 质量与风险 */}
          <TabsContent value="quality" className="mt-4">
            <div className="grid grid-cols-3 gap-5 items-start">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">Evaluation 得分分布（本月 26 次评估）</div>
                <div className="space-y-2.5">
                  {qualityMetrics.evalDist.map(d => (
                    <div key={d.range} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-12">{d.range}</span>
                      <div className="flex-1 h-5 rounded bg-slate-50 overflow-hidden">
                        <div className={cn('h-full rounded flex items-center justify-end pr-2', d.tone)} style={{ width: `${(d.count / 11) * 100}%`, minWidth: 28 }}>
                          <span className="text-[10px] font-semibold text-white">{d.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-lg border border-slate-100 p-3.5">
                  <div className="text-xs font-medium text-slate-700 mb-2">Human Gate 统计</div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    {[[qualityMetrics.gates.total, '累计 Gate'], [qualityMetrics.gates.passed, '直接通过'], [qualityMetrics.gates.modified, '修改后通过'], [qualityMetrics.gates.rejected, '退回']].map(([v, l]) => (
                      <div key={l as string} className="rounded-md bg-slate-50 py-2.5"><div className="text-[16px] font-semibold text-slate-800">{v}</div><div className="text-[10px] text-slate-400">{l}</div></div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">平均确认时长 {qualityMetrics.gates.avgHours}h，较上月缩短 1.3h。</p>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">阻断问题 TOP 规则（跨项目）</div>
                <div className="space-y-2">
                  {qualityMetrics.blockedTop.map(b => (
                    <div key={b.rule} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5">
                      <span className="w-6 h-6 rounded bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center shrink-0">{b.hits}</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-slate-800">{b.rule}</div>
                        <div className="text-[11px] text-slate-400">影响 {b.projects}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-md bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] leading-4.5 text-amber-700">
                  TOP 阻断规则建议转化为 Evaluation 规则库的企业级检查项，前置到规格模板中预防。
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">风险排行</div>
                <div className="space-y-2.5">
                  {qualityMetrics.riskBoard.map(r => (
                    <div key={r.project} className="rounded-lg border border-slate-100 p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-slate-800 flex-1">{r.project}</span>
                        <Pill tone={r.high >= 2 ? 'red' : 'amber'}>{r.risks} 项 · 高 {r.high}</Pill>
                      </div>
                      <div className="mt-1.5 text-xs text-slate-500 leading-5">{r.top}</div>
                      <div className="mt-1 text-[11px] text-slate-400">责任人：{r.owner}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 成本与 ROI */}
          <TabsContent value="cost" className="mt-4">
            <div className="grid grid-cols-4 gap-3 mb-5">
              {costMetrics.value.map(v => (
                <div key={v.k} className={cn('rounded-lg border px-4 py-4', v.k === 'ROI' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/60')}>
                  <div className="text-xs text-slate-400">{v.k}</div>
                  <div className={cn('mt-1 text-[22px] font-semibold', v.k === 'ROI' ? 'text-emerald-600' : 'text-slate-800')}>{v.v}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400 leading-4">{v.d}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="text-xs font-medium text-slate-500 mb-3">AI 成本月度趋势（元）</div>
                <div className="flex items-end gap-3 h-44">
                  {costMetrics.monthly.map(m => (
                    <div key={m.m} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-600">{(m.v / 1000).toFixed(1)}k</span>
                      <div className="w-full max-w-[48px] rounded-t-md bg-gradient-to-t from-amber-500 to-orange-400" style={{ height: `${(m.v / maxMonthly) * 100}%` }} />
                      <span className="text-[10px] text-slate-400">{m.m}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500 mb-3">按项目分布（本月）</div>
                <div className="space-y-2.5">
                  {costMetrics.byProject.map(p => (
                    <div key={p.name} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-36 truncate">{p.name}</span>
                      <Bar value={(p.cost / maxCost) * 100} className="flex-1" tone="bg-amber-500" />
                      <span className="text-xs font-mono text-slate-500 w-16 text-right">¥{p.cost.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs leading-5 text-indigo-700">
                  <LayoutDashboard className="w-3.5 h-3.5 inline mr-1" />
                  成本随 AI 任务量增长而上升（环比 +14.6%），但任务均成本连续 3 个月下降（-8%），规模效应显现。
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
