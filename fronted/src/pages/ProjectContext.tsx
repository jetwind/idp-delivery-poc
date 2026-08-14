import { useState } from 'react'
import { useNavigate } from 'react-router'
import { contextItems, contextCompleteness } from '@/mock/data'
import { PageHeader, Section, Pill, Bar, Ring, statusTone, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { UploadCloud, Sparkles, AlertCircle, CheckCircle2, Link2, FileUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const cats = ['全部', '项目基础上下文', '业务上下文', '工程上下文', '企业知识']
const overall = Math.round(contextCompleteness.reduce((a, b) => a + b.score, 0) / contextCompleteness.length)

const missing = [
  { title: '验收要求缺失', desc: '「验收要求」上下文为空，测试验收规格编制与测试放行 Gate 缺少判定依据。', action: '上传 / 录入' },
  { title: '业务规则存在 2 项待确认', desc: '退货场景码状态回滚、跨仓调拨归属规则由 AI 提取，需业务确认后成为可信上下文。', action: '前往确认' },
  { title: 'SAP 接口字段映射歧义', desc: '物料主数据 MATNR 映射规则不明确，建议补充客户侧字段说明文档。', action: '补充资料' },
]

export default function ProjectContext() {
  const nav = useNavigate()
  const [cat, setCat] = useState('全部')
  const list = contextItems.filter(i => cat === '全部' || i.category === cat)

  return (
    <div>
      <PageHeader
        title="项目上下文"
        desc="管理 AI 理解项目所需的完整上下文 · 来源可追溯 · 确认后成为可信上下文"
        extra={<>
          <Button variant="outline" size="sm"><UploadCloud className="w-3.5 h-3.5 mr-1" />上传资料</Button>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700"><Sparkles className="w-3.5 h-3.5 mr-1" />AI 重新提取</Button>
        </>}
      />

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* 完整度 */}
        <Section title="上下文完整度" desc="AI 按维度评估">
          <div className="flex items-center gap-5 pt-1">
            <Ring value={overall} label="总分" />
            <div className="flex-1 space-y-2.5">
              {contextCompleteness.map(c => (
                <div key={c.dim}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-600">{c.dim}</span><span className={cn('font-medium', c.score >= 80 ? 'text-emerald-600' : c.score >= 60 ? 'text-amber-600' : 'text-rose-600')}>{c.score}</span></div>
                  <Bar value={c.score} tone={c.score >= 80 ? 'bg-emerald-500' : c.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'} />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 缺失项识别 */}
        <Section title="缺失项识别" desc="AI 自动指出缺少的关键信息" className="col-span-2"
          extra={<Pill tone="red">{missing.length} 项</Pill>}>
          <div className="space-y-2.5 pt-1">
            {missing.map(m => (
              <div key={m.title} className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-slate-800">{m.title}</div>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{m.desc}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 border-amber-200 text-amber-700 hover:bg-amber-100"
                  onClick={() => nav(m.action === '前往确认' ? '/projects/p1/specs/req' : '/projects/p1/tasks/n12/complete')}>{m.action}</Button>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* 上下文清单 */}
      <Section pad={false}
        title="上下文清单" desc={`共 ${contextItems.length} 项 · 自动同步 10 项 · 待确认 ${contextItems.filter(i => i.status === '待确认').length} 项`}
        extra={<Button variant="outline" size="sm" className="h-7 text-xs"><FileUp className="w-3.5 h-3.5 mr-1" />补充资料</Button>}>
        <div className="flex gap-1.5 px-5 pb-3">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={cn('px-3 h-7 rounded-md text-xs transition-colors', cat === c ? 'bg-indigo-600 text-white font-medium' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
              {c}
            </button>
          ))}
        </div>
        <T className="border-t border-slate-100">
          <thead><tr><th className={cn(thCls, 'pl-5')}>分类</th><th className={thCls}>内容</th><th className={thCls}>数据来源</th><th className={thCls}>维护方式</th><th className={thCls}>状态</th><th className={thCls}>更新时间</th><th className={cn(thCls, 'pr-5')}>操作</th></tr></thead>
          <tbody>
            {list.map(i => (
              <tr key={i.name} className="hover:bg-slate-50/70">
                <td className={cn(tdCls, 'pl-5')}><span className="text-xs text-slate-500">{i.category}</span></td>
                <td className={tdCls}>
                  <span className="font-medium text-slate-800">{i.name}</span>
                  {i.status === '缺失' && <span className="ml-2 text-[11px] text-rose-500">建议尽快补充</span>}
                </td>
                <td className={tdCls}>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Link2 className="w-3 h-3" />{i.source}</span>
                </td>
                <td className={tdCls}><span className="text-xs text-slate-500">{i.maintain}</span></td>
                <td className={tdCls}><Pill tone={statusTone(i.status)} dot>{i.status}</Pill></td>
                <td className={tdCls}><span className="text-xs text-slate-400">{i.updated}</span></td>
                <td className={cn(tdCls, 'pr-5')}>
                  {i.status === '待确认'
                    ? <Button size="sm" variant="outline" className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"><CheckCircle2 className="w-3.5 h-3.5 mr-1" />确认</Button>
                    : i.status === '缺失'
                      ? <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700" onClick={() => nav('/projects/p1/tasks/n12/complete')}>补充</Button>
                      : <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => nav('/knowledge')}>来源追溯</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </T>
      </Section>
    </div>
  )
}
