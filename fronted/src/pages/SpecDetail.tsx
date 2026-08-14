import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { specDataMap } from '@/mock/specs'
import { Pill, Bar, AIPill, statusTone } from '@/components/common'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Sparkles, Wand2, ShieldCheck, PencilLine, GitCompareArrows, Send, CircleAlert, AlertTriangle,
  Lightbulb, CheckCircle2, FileText, ChevronLeft, Clock3, User, Globe, ClipboardList, Rocket,
} from 'lucide-react'

const checkIcon = { 阻断问题: CircleAlert, 风险问题: AlertTriangle, 优化建议: Lightbulb }
const checkColor = { 阻断问题: 'text-rose-500', 风险问题: 'text-amber-600', 优化建议: 'text-cyan-600' }
const methodColor: Record<string, string> = { GET: 'text-emerald-600 bg-emerald-50', POST: 'text-blue-600 bg-blue-50', PUT: 'text-amber-600 bg-amber-50', DELETE: 'text-rose-600 bg-rose-50' }

export default function SpecDetail() {
  const nav = useNavigate()
  const { id = 'req' } = useParams()
  const spec = specDataMap[id] ?? specDataMap.req
  const [sec, setSec] = useState(spec.sections[0].id)
  const current = spec.sections.find(s => s.id === sec) ?? spec.sections[0]
  const completeness = Math.round(spec.sections.filter(s => s.status === '完整').length / spec.sections.length * 100)
  const notStarted = spec.status === '未开始'

  return (
    <div>
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/projects/p1/specs')} className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800"><ChevronLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold text-slate-900">{spec.name}</h1>
              <span className="font-mono text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{spec.version}</span>
              <Pill tone={statusTone(spec.status)} dot>{spec.status}</Pill>
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />负责人 {spec.owner}</span>
              <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" />更新于 {spec.updated}</span>
              {spec.evalScore > 0 && <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" />Gate {spec.gate} · Evaluation {spec.evalScore} 分</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={notStarted}><GitCompareArrows className="w-3.5 h-3.5 mr-1" />Diff</Button>
          <Button variant="outline" size="sm" disabled={notStarted}><PencilLine className="w-3.5 h-3.5 mr-1" />编辑</Button>
          <Button variant="outline" size="sm" className="border-violet-200 text-violet-600 hover:bg-violet-50" disabled={notStarted}><Wand2 className="w-3.5 h-3.5 mr-1" />AI 补全</Button>
          <Button variant="outline" size="sm" className="border-violet-200 text-violet-600 hover:bg-violet-50" disabled={notStarted}><ShieldCheck className="w-3.5 h-3.5 mr-1" />AI 检查</Button>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700"><Sparkles className="w-3.5 h-3.5 mr-1" />AI 生成</Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={notStarted}><Send className="w-3.5 h-3.5 mr-1" />提交确认</Button>
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr_320px] gap-4 items-start">
        {/* 左侧目录 */}
        <div className="bg-white rounded-lg border border-slate-200/80 p-3 sticky top-[76px]">
          <div className="text-xs font-medium text-slate-400 px-2 pb-2">规格章节</div>
          <div className="space-y-0.5">
            {spec.sections.map(s => (
              <button key={s.id} onClick={() => setSec(s.id)}
                className={cn('w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                  sec === s.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50')}>
                <FileText className={cn('w-3.5 h-3.5 shrink-0', sec === s.id ? 'text-indigo-500' : 'text-slate-300')} />
                <span className="flex-1 truncate">{s.title}</span>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                  s.status === '完整' ? 'bg-emerald-400' : s.status === '待补充' ? 'bg-amber-400' : 'bg-rose-400')} />
              </button>
            ))}
          </div>
          <div className="mt-3 px-2 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500">完整度</span><span className="font-medium text-emerald-600">{notStarted ? 0 : completeness}%</span></div>
            <Bar value={notStarted ? 0 : completeness} tone="bg-emerald-500" />
            <div className="mt-2.5 space-y-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />完整 {spec.sections.filter(s => s.status === '完整').length} 章</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />待补充 {spec.sections.filter(s => s.status === '待补充').length} 章</div>
              <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />缺失 {spec.sections.filter(s => s.status === '缺失').length} 章</div>
            </div>
          </div>
        </div>

        {/* 中间正文 */}
        <div className="bg-white rounded-lg border border-slate-200/80 min-h-[640px]">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">{current.title}</h2>
            <Pill tone={current.status === '完整' ? 'green' : current.status === '待补充' ? 'amber' : 'red'}>{current.status}</Pill>
          </div>
          <div className="px-8 py-6 space-y-3.5">
            {current.content.map((p, i) => (
              <p key={i} className={cn('text-[13.5px] leading-7',
                p.startsWith('【') ? (current.status === '缺失' || p.includes('缺失') || p.includes('未开始') ? 'text-rose-500 bg-rose-50/60 border border-dashed border-rose-200' : 'text-amber-600 bg-amber-50/60 border border-dashed border-amber-200') + ' rounded-md px-3 py-2' : 'text-slate-700')}>{p}</p>
            ))}
            {current.status !== '完整' && (
              <button className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-violet-600 hover:text-violet-700 border border-dashed border-violet-300 rounded-md px-3 py-2 hover:bg-violet-50 transition-colors">
                <Sparkles className="w-3.5 h-3.5" />基于项目上下文，由 AI 补充本章节
              </button>
            )}
          </div>
        </div>

        {/* 右侧：按规格类型差异化 */}
        <div className="space-y-4 sticky top-[76px]">
          {/* 接口规格专属：接口清单 */}
          {spec.apiList && (
            <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800"><Globe className="w-3.5 h-3.5 text-cyan-500" />接口清单</span>
                <span className="text-[11px] text-slate-400">{spec.apiList.filter(a => a.status === '已定义').length}/{spec.apiList.length} 已定义</span>
              </div>
              <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-50">
                {spec.apiList.map(a => (
                  <div key={a.path} className="px-4 py-2.5 hover:bg-slate-50/70 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className={cn('font-mono text-[10px] font-bold rounded px-1.5 py-0.5 w-11 text-center', methodColor[a.method])}>{a.method}</span>
                      <span className="font-mono text-[11px] text-slate-700 truncate flex-1">{a.path}</span>
                      {a.status === '待补充' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400 pl-[52px]">{a.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 测试规格专属：用例场景分布 */}
          {spec.testCases && (
            <div className="bg-white rounded-lg border border-slate-200/80">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800"><ClipboardList className="w-3.5 h-3.5 text-emerald-500" />用例场景分布</span>
                <span className="text-[11px] text-slate-400">{spec.testCases.reduce((a, b) => a + b.count, 0)} 条用例</span>
              </div>
              <div className="p-4 space-y-2.5">
                {spec.testCases.map(t => (
                  <div key={t.scene}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{t.scene}</span>
                      <span className="text-slate-400">{t.count} 条 · 覆盖 {t.coverage}</span>
                    </div>
                    <Bar value={parseInt(t.coverage)} tone={parseInt(t.coverage) >= 85 ? 'bg-emerald-500' : parseInt(t.coverage) >= 70 ? 'bg-amber-500' : 'bg-rose-500'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 发布交付规格专属：依赖状态 */}
          {notStarted && (
            <div className="bg-white rounded-lg border border-slate-200/80 p-4">
              <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800 mb-3"><Rocket className="w-3.5 h-3.5 text-amber-500" />启动编制的前置条件</div>
              <div className="space-y-2">
                {[
                  { name: '需求规格', status: '已确认', ok: true },
                  { name: '设计规格', status: '已确认', ok: true },
                  { name: '接口规格', status: '编制中 · 2 阻断问题', ok: false },
                  { name: '测试验收规格', status: '编制中 · 1 阻断问题', ok: false },
                ].map(d => (
                  <div key={d.name} className="flex items-center gap-2.5 text-xs">
                    {d.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <CircleAlert className="w-3.5 h-3.5 text-rose-400" />}
                    <span className="text-slate-700">{d.name}</span>
                    <span className={cn('ml-auto', d.ok ? 'text-emerald-600' : 'text-rose-500')}>{d.status}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-4.5 text-slate-400">前置规格全部确认后，可由 AI 基于发布最佳实践一键生成本规格建议稿。</p>
            </div>
          )}

          {/* AI 检查 */}
          {spec.checks.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-800"><AIPill>AI 检查</AIPill>Evaluation 结果</span>
                <span className="text-xs text-slate-500">{spec.evalScore} 分</span>
              </div>
              <div className="p-3 space-y-2.5">
                {spec.checks.map(c => {
                  const Icon = checkIcon[c.type]
                  return (
                    <div key={c.title} className="rounded-lg border border-slate-100 bg-white p-3">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn('w-3.5 h-3.5', checkColor[c.type])} />
                        <span className={cn('text-[11px] font-medium', checkColor[c.type])}>{c.type}</span>
                      </div>
                      <div className="mt-1.5 text-xs font-medium text-slate-800 leading-5">{c.title}</div>
                      <p className="mt-1 text-[11px] leading-4.5 text-slate-500">{c.desc}</p>
                      <button className={cn('mt-2 text-[11px] font-medium hover:underline', checkColor[c.type])}>{c.action} →</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 待确认事项 */}
          {spec.pendings.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200/80">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-slate-800">待确认事项</span>
                <Pill tone="amber">{spec.pendings.length}</Pill>
              </div>
              <div className="p-3 space-y-2.5">
                {spec.pendings.map(p => (
                  <div key={p.q} className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                    <div className="text-xs font-medium text-slate-800 leading-5">{p.q}</div>
                    <div className="mt-1.5 text-[11px] text-slate-400">{p.from}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{p.who}</span>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-6 text-[11px] px-2">驳回</Button>
                        <Button size="sm" className="h-6 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" />确认</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
