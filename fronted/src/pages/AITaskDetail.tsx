import { useNavigate } from 'react-router'
import { aiTaskDetail } from '@/mock/data2'
import { Section, Pill, AIPill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, Sparkles, CheckCircle2, Target, FileStack, Boxes, BookOpen, AlertTriangle,
  RotateCcw, UserRoundPen, ThumbsUp, CirclePlus, Loader2,
} from 'lucide-react'

const t = aiTaskDetail

export default function AITaskDetail() {
  const nav = useNavigate()
  return (
    <div>
      {/* 头部 */}
      <div className="bg-white rounded-lg border border-slate-200/80 px-6 py-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button onClick={() => nav('/projects/p1/workflow')} className="mt-1 w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800"><ChevronLeft className="w-4 h-4" /></button>
            <div>
              <div className="flex items-center gap-2.5">
                <AIPill>AI Task</AIPill>
                <h1 className="text-lg font-semibold text-slate-900">{t.name}</h1>
                <Pill tone="green" dot>{t.status}</Pill>
              </div>
              <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-400">
                <span>阶段：{t.stage}</span><span>数字员工：{t.agent}</span>
                <span>开始 {t.started}</span><span>耗时 {t.duration}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><RotateCcw className="w-3.5 h-3.5 mr-1" />重新执行</Button>
            <Button variant="outline" size="sm" onClick={() => nav('/projects/p1/tasks/n12/complete')}><CirclePlus className="w-3.5 h-3.5 mr-1" />补充信息重新执行</Button>
            <Button variant="outline" size="sm" className="border-amber-200 text-amber-600 hover:bg-amber-50"><UserRoundPen className="w-3.5 h-3.5 mr-1" />转人工</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><ThumbsUp className="w-3.5 h-3.5 mr-1" />接受结果</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 items-start">
        {/* 左列：目标与依据 */}
        <div className="space-y-4">
          <Section title="任务目标" extra={<Target className="w-4 h-4 text-slate-300" />}>
            <p className="text-[13px] leading-6 text-slate-700 pt-1">{t.goal}</p>
          </Section>
          <Section title="项目规格（执行依据）" extra={<FileStack className="w-4 h-4 text-slate-300" />}>
            <div className="space-y-2 pt-1">
              {t.specRefs.map(s => (
                <div key={s.name} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                  <span className="text-[13px] text-slate-700">{s.name}</span>
                  <span className="font-mono text-xs text-indigo-600">{s.version}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="工程上下文" extra={<Boxes className="w-4 h-4 text-slate-300" />}>
            <div className="space-y-1.5 pt-1">
              {t.engCtx.map(e => <div key={e} className="text-xs text-slate-600 font-mono bg-slate-50 rounded px-2.5 py-1.5">{e}</div>)}
            </div>
          </Section>
          <Section title="企业知识" extra={<BookOpen className="w-4 h-4 text-slate-300" />}>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {t.knowledge.map(k => <Pill key={k} tone="cyan">{k}</Pill>)}
            </div>
          </Section>
        </div>

        {/* 中列：执行状态 + 结果 */}
        <div className="space-y-4">
          <Section title="执行状态" desc="上下文获取 → 分析 → 执行 → 输出">
            <div className="space-y-0 pt-1">
              {t.steps.map((s, i) => (
                <div key={s.name} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {i < t.steps.length - 1 && <span className="absolute left-[11px] top-6 bottom-0 w-px bg-emerald-200" />}
                  <span className="w-[23px] h-[23px] rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 z-10"><CheckCircle2 className="w-3.5 h-3.5" /></span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-slate-800">{s.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">{s.time}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 leading-5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
          <Section title="执行结果" desc="结构化输出" extra={<Pill tone="violet">置信度 0.82</Pill>}>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {t.results.map(r => (
                <div key={r.key} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-3">
                  <div className="text-[11px] text-slate-400">{r.key}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-800 leading-6">{r.value}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{r.note}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* 右列：风险 + 执行日志 */}
        <div className="space-y-4">
          <Section title="AI 发现的风险" extra={<Pill tone="red">{t.risks.length}</Pill>}>
            <div className="space-y-2.5 pt-1">
              {t.risks.map(r => (
                <div key={r.title} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className={cn('w-3.5 h-3.5', r.level === '高' ? 'text-rose-500' : r.level === '中' ? 'text-amber-500' : 'text-slate-400')} />
                    <Pill tone={r.level === '高' ? 'red' : r.level === '中' ? 'amber' : 'slate'}>{r.level}风险</Pill>
                  </div>
                  <div className="mt-1.5 text-xs font-medium text-slate-800 leading-5">{r.title}</div>
                  <p className="mt-1 text-[11px] leading-4.5 text-slate-500">{r.desc}</p>
                </div>
              ))}
            </div>
          </Section>
          <Section title="执行日志">
            <div className="rounded-md bg-[#0c1428] p-3.5 font-mono text-[11px] leading-5.5 text-slate-400 max-h-[300px] overflow-y-auto">
              <p><span className="text-slate-600">09:12:04</span> <Sparkles className="inline w-3 h-3 text-violet-400" /> 任务创建，加载执行计划</p>
              <p><span className="text-slate-600">09:12:31</span> 拉取项目上下文 · 21 项业务 / 5 类工程</p>
              <p><span className="text-slate-600">09:15:43</span> 上下文校验通过，完整度 87%</p>
              <p><span className="text-slate-600">09:16:02</span> 解析需求规格 V1.5 · 37 个变更点</p>
              <p><span className="text-slate-600">09:24:18</span> 扫描代码索引 · 8 仓库 / 214 模块</p>
              <p><span className="text-slate-600">09:38:42</span> 影响面映射完成，生成改造建议 43 条</p>
              <p><span className="text-slate-600">09:54:00</span> 风险评估完成 · 高 1 / 中 1 / 低 1</p>
              <p><span className="text-slate-600">10:00:32</span> <span className="text-emerald-400">任务完成，等待人工接受结果</span></p>
              <p className="text-slate-600">10:00:32 <Loader2 className="inline w-3 h-3 animate-spin" /> awaiting human review…</p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
