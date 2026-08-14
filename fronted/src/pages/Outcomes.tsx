import { outcomes } from '@/mock/data3'
import { PageHeader, Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Briefcase, DraftingCompass, Code2, ShieldCheck, Rocket, FolderOpen, ExternalLink, Download, AlertCircle } from 'lucide-react'

const icons: Record<string, any> = {
  业务成果: Briefcase, 设计成果: DraftingCompass, 软件成果: Code2,
  质量成果: ShieldCheck, 发布成果: Rocket, 交付材料: FolderOpen,
}
const colors: Record<string, string> = {
  业务成果: 'bg-blue-50 text-blue-600', 设计成果: 'bg-cyan-50 text-cyan-600', 软件成果: 'bg-violet-50 text-violet-600',
  质量成果: 'bg-emerald-50 text-emerald-600', 发布成果: 'bg-indigo-50 text-indigo-600', 交付材料: 'bg-amber-50 text-amber-600',
}

export default function Outcomes() {
  return (
    <div>
      <PageHeader
        title="交付成果"
        desc="汇总项目最终形成的各类成果 · 引用已有对象，不重复复制文件和数据"
        extra={<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"><Download className="w-4 h-4 mr-1" />导出交付清单</Button>}
      />

      <div className="grid grid-cols-3 gap-4">
        {outcomes.map(g => {
          const Icon = icons[g.type]
          const missing = g.items.filter(i => i.ref === '缺失').length
          return (
            <div key={g.type} className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2.5 px-5 pt-4 pb-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[g.type]}`}><Icon className="w-4 h-4" /></span>
                <h3 className="text-[14px] font-semibold text-slate-800">{g.type}</h3>
                <span className="ml-auto text-xs text-slate-400">{g.items.length} 项</span>
                {missing > 0 && <Pill tone="red">{missing} 缺失</Pill>}
              </div>
              <div className="px-5 pb-5 space-y-2">
                {g.items.map(it => (
                  <div key={it.name} className="flex items-center gap-2.5 rounded-lg border border-slate-100 px-3.5 py-2.5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-slate-800 truncate">{it.name}</div>
                      {it.ref === '缺失'
                        ? <div className="mt-0.5 flex items-center gap-1 text-[11px] text-rose-500"><AlertCircle className="w-3 h-3" />待补充</div>
                        : <div className="mt-0.5 text-[11px] text-slate-400">引用：{it.ref}</div>}
                    </div>
                    {it.ref !== '缺失' && <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
