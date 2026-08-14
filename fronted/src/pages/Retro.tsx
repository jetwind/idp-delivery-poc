import { useNavigate } from 'react-router'
import { retro } from '@/mock/data3'
import { PageHeader, Section, Pill, AIPill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { CheckCircle2, PencilLine, EyeOff, Sparkles, RefreshCcw, PackagePlus, Target, GitPullRequest, KeyRound, Bug, RotateCcw, ShieldAlert, MessageSquareHeart, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

const dimIcons: Record<string, any> = {
  目标达成: Target, 需求变化: GitPullRequest, 关键决策: KeyRound, 主要问题: Bug,
  返工原因: RotateCcw, 质量问题: ShieldAlert, 客户反馈: MessageSquareHeart, 经验总结: GraduationCap,
}

export default function Retro() {
  const nav = useNavigate()
  return (
    <div>
      <PageHeader
        title="复盘与资产沉淀"
        desc="AI 项目复盘 · 将项目经验沉淀为企业可复用资产"
        extra={<Button size="sm" className="bg-violet-600 hover:bg-violet-700"><RefreshCcw className="w-3.5 h-3.5 mr-1" />重新生成复盘</Button>}
      />

      {/* AI 总结 */}
      <div className="rounded-lg border border-violet-200/70 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-5 mb-4 shadow-lg shadow-indigo-600/20">
        <div className="flex items-center gap-2 mb-2"><AIPill>AI 项目复盘</AIPill><span className="text-xs text-indigo-100">基于 47 项 AI 任务、9 次 Human Gate、14 项 CR 自动生成</span></div>
        <p className="text-[13.5px] leading-6 text-indigo-50">{retro.summary}</p>
      </div>

      {/* 复盘维度 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {retro.dims.map(d => {
          const Icon = dimIcons[d.name]
          return (
            <div key={d.name} className="bg-white rounded-lg border border-slate-200/80 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon className="w-3.5 h-3.5" /></span>
                <span className="text-[13px] font-semibold text-slate-800">{d.name}</span>
              </div>
              <p className="mt-2.5 text-xs leading-5 text-slate-500 line-clamp-4" title={d.content}>{d.content}</p>
            </div>
          )
        })}
      </div>

      {/* 资产候选 */}
      <Section title="项目资产候选" desc="AI 识别的可复用资产 · 确认后进入企业知识库"
        extra={<div className="flex gap-2 text-xs">
          <Pill tone="amber">待处理 {retro.assets.filter(a => a.status === '待处理').length}</Pill>
          <Pill tone="green">已沉淀 {retro.assets.filter(a => a.status === '已沉淀').length}</Pill>
          <Pill tone="slate">已忽略 {retro.assets.filter(a => a.status === '已忽略').length}</Pill>
        </div>}>
        <div className="space-y-2 pt-1">
          {retro.assets.map(a => (
            <div key={a.name} className={cn('flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors',
              a.status === '待处理' ? 'border-slate-200 hover:border-indigo-200' : 'border-slate-100 opacity-70')}>
              <Pill tone="violet" className="w-[68px] justify-center shrink-0">{a.type}</Pill>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-slate-800">{a.name}</div>
                <div className="mt-0.5 text-xs text-slate-400">{a.desc}</div>
              </div>
              {a.status === '待处理' ? (
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs"><EyeOff className="w-3.5 h-3.5 mr-1" />忽略</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs"><PencilLine className="w-3.5 h-3.5 mr-1" />修改后沉淀</Button>
                  <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => nav('/knowledge')}><PackagePlus className="w-3.5 h-3.5 mr-1" />确认沉淀</Button>
                </div>
              ) : (
                <Pill tone={a.status === '已沉淀' ? 'green' : 'slate'} className="shrink-0">
                  {a.status === '已沉淀' && <CheckCircle2 className="w-3 h-3 mr-1" />}{a.status}
                </Pill>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-md px-3.5 py-2.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
          确认沉淀的资产将提交入库审核，经知识管理员审批发布后进入企业知识库，供后续项目的数字员工自动引用。
        </div>
      </Section>
    </div>
  )
}
