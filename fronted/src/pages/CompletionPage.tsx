import { useState } from 'react'
import { useNavigate } from 'react-router'
import { completionTask as t } from '@/mock/data4'
import { Pill, Bar, AIPill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, Sparkles, UploadCloud, FileText, CheckCircle2, PencilLine, XCircle, Link2,
  MessageSquareText, Send, CircleAlert, ShieldCheck, Bot, User, Play,
} from 'lucide-react'

type Method = 'upload' | 'input'

export default function CompletionPage() {
  const nav = useNavigate()
  const [ready, setReady] = useState<string[]>(['c4'])
  const [method, setMethod] = useState<Record<string, Method>>({ c1: 'upload' })
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [msgs, setMsgs] = useState([
    { from: 'user', text: '退货时码要回到在库状态，但必须双人复核，已激活的码不能回滚。' },
    { from: 'ai', text: '已提取为 1 条规则草稿（含 3 个要点），加入左侧「退货场景码状态回滚规则」AI 预填区，确认后生效。' },
  ])

  const total = t.items.length
  const readyCount = ready.length
  const allReady = readyCount === total

  const markReady = (id: string) => setReady(r => (r.includes(id) ? r : [...r, id]))
  const sendMsg = () => {
    if (!chatInput.trim()) return
    setMsgs(m => [...m,
      { from: 'user', text: chatInput },
      { from: 'ai', text: '已收到。我会把这段描述结构化为草稿并加入待确认区——确认后才会成为可信上下文并纳入版本，对话本身不作为交付依据。' },
    ])
    setChatInput('')
  }

  return (
    <div>
      {/* 头部 */}
      <div className="bg-white rounded-lg border border-slate-200/80 px-6 py-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button onClick={() => nav('/projects/p1/workflow')} className="mt-1 w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800"><ChevronLeft className="w-4 h-4" /></button>
            <div>
              <div className="flex items-center gap-2.5">
                <AIPill>输入补全</AIPill>
                <h1 className="text-lg font-semibold text-slate-900">{t.name}</h1>
                <Pill tone="amber" dot>{t.status} · {t.paused}</Pill>
              </div>
              <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-400">
                <span>所属阶段：{t.stage}</span><span>节点类型：{t.type}</span><span>数字员工：{t.agent}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400 mb-1">输入就绪度</div>
              <div className="flex items-center gap-2">
                <Bar value={(readyCount / total) * 100} className="w-28" tone={allReady ? 'bg-emerald-500' : 'bg-amber-500'} />
                <span className="text-[13px] font-semibold text-slate-800">{readyCount}/{total}</span>
              </div>
            </div>
            <Button disabled={!allReady} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40" onClick={() => nav('/projects/p1/workflow')}>
              <Play className="w-4 h-4 mr-1" />完成补全 · 恢复执行
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-4 items-start">
        {/* 左列：AI 说明 + 补全项 */}
        <div className="space-y-4">
          {/* AI 说明 */}
          <div className="rounded-lg border border-violet-200/70 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-4">
            <div className="flex items-center gap-2 mb-1.5"><Bot className="w-4 h-4" /><span className="text-[13px] font-semibold">为什么需要这些信息</span></div>
            <p className="text-xs leading-5 text-indigo-100">{t.aiNote}</p>
          </div>

          {t.items.map(item => {
            const isReady = ready.includes(item.id)
            if (item.kind === 'ready' || isReady) {
              return (
                <div key={item.id} className="bg-white rounded-lg border border-emerald-200 px-5 py-4 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <div className="text-[13.5px] font-medium text-slate-800">{item.title}</div>
                    <div className="mt-0.5 text-xs text-slate-400">{item.kind === 'ready' ? item.source : '已补全 · 将成为可信上下文并纳入版本'}</div>
                  </div>
                  <Pill tone="green" dot>已就绪</Pill>
                </div>
              )
            }

            if (item.kind === 'missing-upload') {
              const m = method[item.id] ?? 'upload'
              return (
                <div key={item.id} className="bg-white rounded-lg border-l-4 border-l-rose-400 border border-slate-200/80 p-5">
                  <div className="flex items-center gap-2">
                    <CircleAlert className="w-4 h-4 text-rose-500" />
                    <span className="text-[14px] font-semibold text-slate-800">{item.title}</span>
                    <Pill tone="red" className="ml-1">缺失</Pill>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-slate-300" />{item.impact}</p>
                  <div className="mt-3 flex gap-1.5">
                    {([['upload', '上传文件', UploadCloud], ['input', '在线录入', FileText]] as const).map(([v, l, Icon]) => (
                      <button key={v} onClick={() => setMethod(s => ({ ...s, [item.id]: v }))}
                        className={cn('inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs transition-colors',
                          m === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                        <Icon className="w-3.5 h-3.5" />{l}
                      </button>
                    ))}
                  </div>
                  {m === 'upload' ? (
                    <div className="mt-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                      <UploadCloud className="w-6 h-6 text-slate-300 mx-auto" />
                      <div className="mt-2 text-[13px] text-slate-600">点击上传或拖拽文件至此</div>
                      <div className="mt-1 text-[11px] text-slate-400">支持 PDF / Word / Excel · 上传后 AI 将自动提取关键条款</div>
                    </div>
                  ) : (
                    <Textarea rows={4} className="mt-3 text-[13px]" placeholder="按条目录入验收要求，例如：1. 关联准确率 ≥ 99.95%；2. 窜货预警 T+1 输出…" />
                  )}
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => markReady(item.id)}>提交补全</Button>
                  </div>
                </div>
              )
            }

            if (item.kind === 'prefill') {
              return (
                <div key={item.id} className="bg-white rounded-lg border-l-4 border-l-amber-400 border border-slate-200/80 p-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    <span className="text-[14px] font-semibold text-slate-800">{item.title}</span>
                    <Pill tone="violet">AI 预填 · 待确认</Pill>
                    <button className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600"><Link2 className="w-3 h-3" />{item.source}</button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{item.impact}</p>
                  <div className="mt-3 rounded-lg bg-violet-50/60 border border-violet-100 px-4 py-3 space-y-1.5">
                    {item.draft!.map((d, i) => (
                      <div key={i} className="flex items-start gap-2 text-[13px] text-slate-700 leading-6">
                        <span className="w-4 h-4 rounded bg-violet-100 text-violet-600 text-[10px] font-semibold flex items-center justify-center mt-1 shrink-0">{i + 1}</span>{d}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50"><XCircle className="w-3.5 h-3.5 mr-1" />驳回</Button>
                    <Button size="sm" variant="outline"><PencilLine className="w-3.5 h-3.5 mr-1" />修改</Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => markReady(item.id)}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />确认采用</Button>
                  </div>
                </div>
              )
            }

            // missing-form
            return (
              <div key={item.id} className="bg-white rounded-lg border-l-4 border-l-rose-400 border border-slate-200/80 p-5">
                <div className="flex items-center gap-2">
                  <CircleAlert className="w-4 h-4 text-rose-500" />
                  <span className="text-[14px] font-semibold text-slate-800">{item.title}</span>
                  <Pill tone="red" className="ml-1">缺失</Pill>
                  <span className="ml-auto text-[11px] text-slate-400">带 <Pill tone="violet" className="mx-0.5">AI 建议</Pill> 的字段可直接确认</span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{item.impact}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {item.fields!.map(f => (
                    <label key={f.label} className="block">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">{f.label}{f.ai && <Pill tone="violet">AI 建议</Pill>}</span>
                      <Input defaultValue={f.value} className="text-[13px]" />
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => markReady(item.id)}>保存补全</Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 右列：对话辅助 + 原则 */}
        <div className="space-y-4 sticky top-[76px]">
          {/* 对话辅助 */}
          <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden">
            <button onClick={() => setChatOpen(o => !o)} className="w-full px-4 py-3.5 flex items-center gap-2.5 hover:bg-slate-50 transition-colors">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center"><MessageSquareText className="w-4 h-4" /></span>
              <div className="text-left flex-1">
                <div className="text-[13px] font-semibold text-slate-800">不确定怎么填？向 AI 描述</div>
                <div className="text-[11px] text-slate-400">对话仅作采集入口，产出结构化草稿后需人工确认</div>
              </div>
              <Pill tone={chatOpen ? 'violet' : 'slate'}>{chatOpen ? '收起' : '展开'}</Pill>
            </button>
            {chatOpen && (
              <div className="border-t border-slate-100">
                <div className="p-3.5 space-y-3 max-h-[300px] overflow-y-auto">
                  {msgs.map((m, i) => (
                    <div key={i} className={cn('flex gap-2', m.from === 'user' && 'flex-row-reverse')}>
                      <span className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                        m.from === 'ai' ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white' : 'bg-slate-200 text-slate-500')}>
                        {m.from === 'ai' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      </span>
                      <div className={cn('rounded-lg px-3 py-2 text-xs leading-5 max-w-[85%]',
                        m.from === 'ai' ? 'bg-violet-50 text-slate-700 border border-violet-100' : 'bg-indigo-600 text-white')}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-slate-100 flex gap-2">
                  <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
                    placeholder="用自然语言描述规则或要求…" className="h-8 text-xs" />
                  <Button size="sm" className="h-8 bg-violet-600 hover:bg-violet-700 px-2.5" onClick={sendMsg}><Send className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            )}
          </div>

          {/* 补全原则 */}
          <div className="bg-white rounded-lg border border-slate-200/80 p-4">
            <div className="text-[13px] font-semibold text-slate-800 mb-2.5">补全方式设计原则</div>
            <div className="space-y-2.5">
              {[
                ['AI 先预填，人只做确认', 'AI 从会议纪要、需求文档中提取草稿，确认成本远低于创作成本'],
                ['一切结构化入库', '补全内容按字段写入上下文并纳入版本，来源可追溯'],
                ['对话只是采集手段', '对话产出必须转为结构化草稿、经确认后生效，对话本身不是交付事实'],
              ].map(([t2, d], i) => (
                <div key={t2} className="flex gap-2.5">
                  <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <div className="text-xs font-medium text-slate-800">{t2}</div>
                    <div className="mt-0.5 text-[11px] leading-4.5 text-slate-400">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 阻断说明 */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3.5 flex gap-2.5">
            <CircleAlert className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs leading-5 text-amber-800">输入未就绪前，本节点保持「等待输入」状态，不会消耗 AI 执行配额；下游「自动测试」「测试放行」节点相应顺延。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
