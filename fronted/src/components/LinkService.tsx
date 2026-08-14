import { useState } from 'react'
import { hiveServiceLibrary, services, type ServiceAsset } from '@/mock/data'
import { Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Search, Boxes, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react'

const branchesOf = () => ['develop', 'release/2.x', 'main'].map(b => ({ b, tag: b === 'develop' ? '默认开发' : b.startsWith('release') ? '当前稳定' : '主干' }))
const roles = [
  { v: '直接复用', d: '不修改代码，直接调用现有版本', tone: 'slate' },
  { v: '接口适配', d: '仅做接口/协议适配层改造', tone: 'cyan' },
  { v: '核心改造', d: '对服务核心逻辑进行项目化改造', tone: 'amber' },
  { v: '新建', d: '基于该服务模板新建项目专属服务', tone: 'violet' },
] as const

type Step = 'select' | 'role'

export default function LinkService({ open, onClose, onLinked }: {
  open: boolean; onClose: () => void; onLinked?: (svc: ServiceAsset) => void
}) {
  const [step, setStep] = useState<Step>('select')
  const [kw, setKw] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [roleMap, setRoleMap] = useState<Record<string, ServiceAsset['role']>>({})
  const [branchMap, setBranchMap] = useState<Record<string, string>>({})

  const linkedNames = services.map(s => s.name)
  const list = hiveServiceLibrary.filter(h => !kw || h.name.includes(kw) || h.cnName.includes(kw) || h.desc.includes(kw))
  const pickedServices = hiveServiceLibrary.filter(h => picked.includes(h.name))

  const reset = () => { setStep('select'); setKw(''); setPicked([]); setRoleMap({}); setBranchMap({}) }
  const close = () => { onClose(); setTimeout(reset, 300) }

  const confirm = () => {
    pickedServices.forEach(h => {
      onLinked?.({
        name: h.name, cnName: h.cnName, role: roleMap[h.name] ?? '直接复用',
        version: h.version, owner: h.owner,
        repo: `git@git.example.com:${h.name.split('-')[0]}/${h.name}.git`,
        branch: roleMap[h.name] && roleMap[h.name] !== '直接复用' ? `feature/PRJ-2026-0118 ← ${branchMap[h.name] ?? 'develop'}` : '—',
      })
    })
    close()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>关联微服务</SheetTitle>
          <SheetDescription>从微服务库中关联到当前项目，并声明项目作用</SheetDescription>
        </SheetHeader>

        {/* 步骤指示 */}
        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className={cn('flex items-center gap-1.5', step === 'select' ? 'text-indigo-600 font-medium' : 'text-emerald-600')}>
            {step === 'role' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">1</span>}
            选择服务 {picked.length > 0 && `（已选 ${picked.length}）`}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className={step === 'role' ? 'text-indigo-600 font-medium' : 'text-slate-400'}>
            <span className={cn('w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center mr-1.5', step === 'role' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500')}>2</span>
            声明项目作用
          </span>
        </div>

        {step === 'select' ? (
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input value={kw} onChange={e => setKw(e.target.value)} placeholder="搜索服务名称 / 中文名 / 描述" className="pl-8 h-9 text-[13px]" />
            </div>
            <div className="mt-3 space-y-1.5">
              {list.map(h => {
                const linked = linkedNames.includes(h.name)
                const checked = picked.includes(h.name)
                return (
                  <label key={h.name} className={cn('flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors',
                    linked ? 'border-slate-100 opacity-50 cursor-not-allowed' : checked ? 'border-indigo-400 bg-indigo-50/40 cursor-pointer' : 'border-slate-200 hover:border-slate-300 cursor-pointer')}>
                    <Checkbox disabled={linked} checked={checked}
                      onCheckedChange={(c) => setPicked(c ? [...picked, h.name] : picked.filter(x => x !== h.name))} />
                    <Boxes className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-slate-800">{h.name}</span>
                        <span className="text-xs text-slate-500">{h.cnName}</span>
                        {linked && <Pill tone="green">已关联</Pill>}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400 truncate">{h.desc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[11px] text-slate-500">{h.version}</div>
                      <div className="text-[10px] text-slate-400">{h.owner}</div>
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="mt-5 flex justify-between">
              <span className="text-xs text-slate-400 self-center">已选 {picked.length} 个服务</span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={close}>取消</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={picked.length === 0} onClick={() => setStep('role')}>
                  下一步：声明作用<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="space-y-3">
              {pickedServices.map(h => (
                <div key={h.name} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-indigo-500" />
                    <span className="font-mono text-xs font-medium text-slate-800">{h.name}</span>
                    <span className="text-xs text-slate-400">{h.cnName} · {h.version}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {roles.map(r => (
                      <button key={r.v} onClick={() => setRoleMap(m => ({ ...m, [h.name]: r.v }))}
                        className={cn('text-left rounded-md border px-3 py-2 transition-colors',
                          (roleMap[h.name] ?? '直接复用') === r.v ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/30' : 'border-slate-200 hover:border-slate-300')}>
                        <div className="flex items-center gap-1.5">
                          <Pill tone={r.tone as any}>{r.v}</Pill>
                        </div>
                        <div className="mt-1 text-[10.5px] leading-4 text-slate-400">{r.d}</div>
                      </button>
                    ))}
                  </div>
                  {(roleMap[h.name] ?? '直接复用') !== '直接复用' && (
                    <div className="mt-3 rounded-md bg-slate-50 border border-slate-100 px-3 py-2.5">
                      <div className="text-[11px] text-slate-500 mb-2">基于源分支创建项目分支</div>
                      <div className="flex flex-wrap gap-1.5">
                        {branchesOf().map(({ b, tag }) => (
                          <button key={b} onClick={() => setBranchMap(m => ({ ...m, [h.name]: b }))}
                            className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-mono transition-colors',
                              (branchMap[h.name] ?? 'develop') === b ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500/30' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')}>
                            {b}
                            <span className="text-[9.5px] font-normal text-slate-400">{tag}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="text-slate-400">将创建：</span>
                        <span className="font-mono text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
                          feature/PRJ-2026-0118 ← {branchMap[h.name] ?? 'develop'}
                        </span>
                      </div>
                    </div>
                  )}
                  {(roleMap[h.name] ?? '直接复用') === '直接复用' && (
                    <div className="mt-2.5 text-[11px] text-slate-400">复用主干版本 {h.version}，不创建项目分支。</div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-violet-50 border border-violet-100 rounded-md px-3.5 py-2.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
              声明「核心改造 / 接口适配 / 新建」的服务将自动创建项目开发分支 feature/PRJ-2026-0118 并纳入 AI 影响分析范围；「直接复用」不建分支。
            </div>
            <div className="mt-4 flex justify-end gap-2 pb-2">
              <Button variant="ghost" onClick={() => setStep('select')}>上一步</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={confirm}>
                <CheckCircle2 className="w-4 h-4 mr-1" />确认关联 {pickedServices.length} 个服务
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
