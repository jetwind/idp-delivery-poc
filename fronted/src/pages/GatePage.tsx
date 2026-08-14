import { evalResult, humanGate } from '@/mock/data2'
import { PageHeader, Section, Pill, Bar, Ring, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ShieldCheck, CircleAlert, AlertTriangle, Lightbulb, CheckCircle2, PencilLine, Undo2, History, Sparkles } from 'lucide-react'

const issueIcon: Record<string, any> = { 阻断问题: CircleAlert, 风险问题: AlertTriangle, 优化建议: Lightbulb }
const issueTone: Record<string, string> = { 阻断问题: 'red', 风险问题: 'amber', 优化建议: 'cyan' }

export default function GatePage() {
  return (
    <div>
      <PageHeader title="Evaluation / Human Gate" desc="AI 质量评估 + 人工最终确认与授权 · 决策全程留痕" />

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Evaluation 面板 */}
        <Section title="Evaluation 质量评估" desc={`评估对象：${evalResult.target} · ${evalResult.time}`}
          extra={<Pill tone="violet"><Sparkles className="w-3 h-3 mr-1" />自动评估</Pill>}>
          <div className="flex items-center gap-6 pt-1">
            <Ring value={evalResult.score} label="综合得分" size={104} />
            <div className="flex-1 space-y-2.5">
              {evalResult.dims.map(d => (
                <div key={d.name} title={d.desc}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{d.name}</span>
                    <span className={cn('font-medium', d.score >= 85 ? 'text-emerald-600' : d.score >= 70 ? 'text-amber-600' : 'text-rose-600')}>{d.score}</span>
                  </div>
                  <Bar value={d.score} tone={d.score >= 85 ? 'bg-emerald-500' : d.score >= 70 ? 'bg-amber-500' : 'bg-rose-500'} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5">
            <div className="text-xs font-medium text-slate-500 mb-2">问题清单（{evalResult.issues.length}）</div>
            <div className="space-y-2">
              {evalResult.issues.map(i => (
                <div key={i.title} className="flex items-start gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5">
                  {(() => { const I = issueIcon[i.type]; return <I className={cn('w-4 h-4 mt-0.5 shrink-0', i.type === '阻断问题' ? 'text-rose-500' : i.type === '风险问题' ? 'text-amber-500' : 'text-cyan-500')} /> })()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Pill tone={issueTone[i.type] as any}>{i.type}</Pill>
                      <span className="text-xs text-slate-400">{i.source}</span>
                    </div>
                    <div className="mt-1 text-[13px] text-slate-800">{i.title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">规则：{i.rule}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">处理规则：阻断问题解决前不能进入下一阶段；风险问题需人工确认是否接受；优化建议不阻断流程。</p>
          </div>
        </Section>

        {/* Human Gate 面板 */}
        <div className="space-y-4">
          <Section title="Human Gate 待确认" desc={humanGate.id} extra={<Pill tone="amber" dot>待决策</Pill>}>
            <div className="pt-1 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 px-3.5 py-3"><div className="text-[11px] text-slate-400">待确认对象</div><div className="mt-1 text-[13px] font-medium text-slate-800">{humanGate.object}</div></div>
                <div className="rounded-lg bg-slate-50 px-3.5 py-3"><div className="text-[11px] text-slate-400">确认版本</div><div className="mt-1 font-mono text-[13px] font-medium text-indigo-600">{humanGate.version}</div></div>
                <div className="rounded-lg bg-slate-50 px-3.5 py-3"><div className="text-[11px] text-slate-400">Evaluation</div><div className="mt-1 text-[13px] font-medium text-emerald-600">{humanGate.evalScore} 分 · 通过</div></div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">待决策事项（{humanGate.decisions.length}）</div>
                <div className="space-y-2.5">
                  {humanGate.decisions.map(d => (
                    <div key={d.q} className="rounded-lg border border-slate-200 p-3.5">
                      <div className="text-[13px] font-medium text-slate-800 leading-5">{d.q}</div>
                      <p className="mt-1 text-xs text-slate-500 leading-5">{d.options}</p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <Pill tone={d.status === '待决策' ? 'amber' : 'green'} dot>{d.status}</Pill>
                        {d.status === '待决策' && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs">拒绝</Button>
                            <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700">采纳</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 mb-1.5">确认意见</div>
                <Textarea rows={2} placeholder="填写确认意见（将计入决策记录）…" />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-4 h-4 mr-1" />确认通过</Button>
                <Button variant="outline" className="flex-1"><PencilLine className="w-4 h-4 mr-1" />修改后通过</Button>
                <Button variant="outline" className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"><Undo2 className="w-4 h-4 mr-1" />退回</Button>
              </div>
            </div>
          </Section>

          {/* 决策记录 */}
          <Section title="决策记录" desc="确认人 · 时间 · 版本 · 意见" extra={<History className="w-4 h-4 text-slate-300" />}>
            <T className="pt-1">
              <thead><tr><th className={thCls}>确认人</th><th className={thCls}>动作</th><th className={thCls}>对象 / 版本</th><th className={thCls}>时间</th><th className={thCls}>意见</th></tr></thead>
              <tbody>
                {humanGate.history.map(h => (
                  <tr key={h.time}>
                    <td className={tdCls}>{h.who}</td>
                    <td className={tdCls}><Pill tone={h.action === '确认通过' ? 'green' : 'amber'}>{h.action}</Pill></td>
                    <td className={tdCls}><span className="text-xs">{h.target}</span></td>
                    <td className={tdCls}><span className="text-xs text-slate-400">{h.time}</span></td>
                    <td className={tdCls}><span className="text-xs text-slate-500 line-clamp-1 max-w-[220px]" title={h.comment}>{h.comment}</span></td>
                  </tr>
                ))}
              </tbody>
            </T>
          </Section>

          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-xs leading-5 text-slate-600">Human Gate 通过后，Workflow 自动进入下一阶段，确认动作、版本与意见将写入决策记录并纳入项目基线，不可篡改。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
