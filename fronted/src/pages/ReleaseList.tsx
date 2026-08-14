import { useState } from 'react'
import { useNavigate } from 'react-router'
import { releases } from '@/mock/data3'
import { services } from '@/mock/data'
import { specs } from '@/mock/data2'
import { PageHeader, Pill, statusTone, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { Plus, GitCompareArrows, CheckCircle2, Tag, GitCommitHorizontal, Container, FlaskConical, Repeat } from 'lucide-react'

const baselineGroups = [
  { icon: Tag, label: '项目仓库', items: ['prj-2026-0118-trace-platform · Commit a3f8c21 · Tag release/v1.4.0-rc.1'] },
  { icon: GitCommitHorizontal, label: '项目规格', items: specs.filter(s => s.version !== '—').map(s => `${s.name} ${s.version}`) },
  { icon: Container, label: '微服务与镜像', items: services.map(s => `${s.name} ${s.version}`) },
  { icon: Repeat, label: 'CI 构建记录', items: ['trace-code-service #498 成功', 'trace-pack-relation #162 成功', 'integration-test-daily #88 运行中'] },
  { icon: FlaskConical, label: '测试结果', items: ['自动化用例 1284 · 通过 1279 · 覆盖率 82.4%'] },
]

export default function ReleaseList() {
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <PageHeader
        title="版本与基线"
        desc="Project Release 统一管理跨多服务的项目交付版本 · 项目版本与服务版本分离"
        extra={<>
          <Button variant="outline" size="sm" onClick={() => nav('/projects/p1/releases/compare')}><GitCompareArrows className="w-3.5 h-3.5 mr-1" />版本对比</Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />创建基线</Button>
        </>}
      />

      {/* 版本生命周期说明 */}
      <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/40 px-5 py-4">
        <div className="text-xs font-medium text-slate-500 mb-3">项目版本生命周期</div>
        <div className="flex items-center gap-0 text-xs">
          {[
            { t: '项目创建', d: '自动生成初始基线 V0.1.0（仓库初始 Commit + 规格模板 + 禅道需求快照）', tone: 'bg-indigo-600 text-white' },
            { t: '创建基线', d: '每次冻结当前项目状态为新版本（UAT / 预发布）', tone: 'bg-violet-500 text-white' },
            { t: '首次生产发布', d: '形成 V1.0.0，进入生产版本序列', tone: 'bg-blue-500 text-white' },
            { t: '迭代演进', d: 'V1.1.0 → V1.3.0（当前生产）→ V1.4.0-rc.1（预发布）', tone: 'bg-emerald-500 text-white' },
          ].map((s2, i, arr) => (
            <div key={s2.t} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <span className={cn('w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center shrink-0', s2.tone)}>{i + 1}</span>
                <div>
                  <div className="font-medium text-slate-800 whitespace-nowrap">{s2.t}</div>
                  <div className="text-[11px] text-slate-400 leading-4 max-w-[220px]">{s2.d}</div>
                </div>
              </div>
              {i < arr.length - 1 && <div className="flex-1 h-px bg-indigo-200 mx-3 min-w-[20px]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <T>
          <thead><tr>
            <th className={thCls}>项目版本</th><th className={thCls}>状态</th><th className={thCls}>创建时间</th>
            <th className={thCls}>目标环境</th><th className={thCls}>创建人</th><th className={thCls}>服务数量</th><th className={thCls}>关联 CR</th><th className={thCls}>操作</th>
          </tr></thead>
          <tbody>
            {releases.map(r => (
              <tr key={r.version} className="hover:bg-slate-50/70 cursor-pointer" onClick={() => nav('/projects/p1/releases/v130')}>
                <td className={tdCls}><span className="font-mono font-semibold text-slate-800">{r.version}</span></td>
                <td className={tdCls}><Pill tone={statusTone(r.status)} dot>{r.status}</Pill></td>
                <td className={tdCls}><span className="text-xs text-slate-500">{r.created}</span></td>
                <td className={tdCls}>{r.env === '—' ? <span className="text-xs text-slate-300">—</span> : <Pill tone={r.env === 'PROD' ? 'green' : 'violet'}>{r.env}</Pill>}</td>
                <td className={tdCls}>{r.creator}</td>
                <td className={tdCls}><span className="text-xs">{r.serviceCount} 个服务</span></td>
                <td className={tdCls}>{r.cr > 0 ? <span className="text-xs text-indigo-600">{r.cr} 个 CR</span> : <span className="text-xs text-slate-300">—</span>}</td>
                <td className={tdCls}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); nav('/projects/p1/releases/v130') }}>版本详情</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </T>
      </div>

      {/* 创建基线抽屉 */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>创建项目基线</SheetTitle>
            <SheetDescription>自动采集当前项目状态，确认后生成 Project Release</SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            {baselineGroups.map(g => (
              <div key={g.label} className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border-b border-slate-100">
                  <g.icon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[13px] font-medium text-slate-800">{g.label}</span>
                  <Pill tone="green" className="ml-auto">已自动采集</Pill>
                </div>
                <div className="p-2.5 space-y-1">
                  {g.items.map(it => (
                    <label key={it} className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <Checkbox defaultChecked />
                      <span className="text-xs text-slate-600 font-mono truncate">{it}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
              <div className="text-xs text-slate-500 mb-2">确认后生成</div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-semibold text-indigo-700">Project Release V1.4.0</span>
                <Pill tone="violet">目标环境：UAT → PROD</Pill>
              </div>
            </div>

            <div className="flex justify-end gap-2 pb-2">
              <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setOpen(false)}>
                <CheckCircle2 className="w-4 h-4 mr-1" />确认并生成基线
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
