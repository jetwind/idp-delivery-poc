import { useState } from 'react'
import { services as baseServices, pipelines, envDeploys, type ServiceAsset } from '@/mock/data'
import LinkService from '@/components/LinkService'
import { toast } from 'sonner'
import { PageHeader, Pill, T, thCls, tdCls, statusTone } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, ExternalLink, GitBranch, Boxes, Repeat, Server } from 'lucide-react'
import { cn } from '@/lib/utils'

const roleTone: Record<string, any> = { 新建: 'violet', 核心改造: 'amber', 接口适配: 'cyan', 直接复用: 'slate' }

export default function ProjectAssets() {
  const [svcList, setSvcList] = useState<ServiceAsset[]>(baseServices)
  const [linkOpen, setLinkOpen] = useState(false)
  const onLinked = (svc: ServiceAsset) => {
    setSvcList(l => l.some(x => x.name === svc.name) ? l : [...l, svc])
    toast.success(`已关联 ${svc.name}`, { description: `项目作用：${svc.role}${svc.branch !== '—' ? ' · 已创建项目分支' : ''}` })
  }
  const unlink = (name: string) => {
    setSvcList(l => l.filter(x => x.name !== name))
    toast.success(`已解除关联 ${name}`, { description: '服务本身与平台数据不受影响' })
  }
  return (
    <div>
      <PageHeader
        title="工程资产"
        desc="关联平台已有微服务、Git、CI/CD 与环境 · 数据自动同步"
        extra={<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setLinkOpen(true)}><Plus className="w-4 h-4 mr-1" />关联微服务</Button>}
      />

      {/* 汇总卡 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { icon: Boxes, label: '微服务', value: svcList.length, sub: '新建 2 · 改造 2 · 适配 2 · 复用 2' },
          { icon: GitBranch, label: 'Git 仓库', value: svcList.length, sub: '开发分支 feature/PRJ-2026-0118' },
          { icon: Repeat, label: 'CI/CD 流水线', value: pipelines.length, sub: '最近执行 1 失败 · 1 运行中' },
          { icon: Server, label: '环境', value: envDeploys.length, sub: 'DEV / TEST / UAT / PROD' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-lg border border-slate-200/80 px-4 py-4 flex items-center gap-3.5">
            <span className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><c.icon className="w-5 h-5" /></span>
            <div>
              <div className="text-lg font-semibold text-slate-800 leading-6">{c.value} <span className="text-xs font-normal text-slate-400">{c.label}</span></div>
              <div className="text-[11px] text-slate-400">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-5 pb-5">
        <Tabs defaultValue="svc">
          <TabsList className="bg-transparent border-b border-slate-100 rounded-none w-full justify-start h-11 p-0 gap-6">
            {[['svc', '微服务'], ['git', 'Git'], ['cicd', 'CI/CD'], ['env', '环境']].map(([v, l]) => (
              <TabsTrigger key={v} value={v} className="rounded-none h-11 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]">{l}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="svc" className="mt-4">
            <T>
              <thead><tr><th className={thCls}>微服务</th><th className={thCls}>项目作用</th><th className={thCls}>当前版本</th><th className={thCls}>负责人</th><th className={thCls}>Git 仓库</th><th className={thCls}></th></tr></thead>
              <tbody>
                {svcList.map(s => (
                  <tr key={s.name} className="hover:bg-slate-50/70">
                    <td className={tdCls}>
                      <div className="font-medium text-slate-800 font-mono text-xs">{s.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.cnName}</div>
                    </td>
                    <td className={tdCls}><Pill tone={roleTone[s.role]}>{s.role}</Pill></td>
                    <td className={tdCls}><span className="font-mono text-xs">{s.version}</span></td>
                    <td className={tdCls}>{s.owner}</td>
                    <td className={tdCls}><span className="font-mono text-[11px] text-slate-500">{s.repo.replace('git@git.example.com:', '')}</span></td>
                    <td className={tdCls}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs">详情<ExternalLink className="w-3 h-3 ml-1" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => unlink(s.name)}>解除</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </T>
          </TabsContent>

          <TabsContent value="git" className="mt-4">
            <T>
              <thead><tr><th className={thCls}>仓库</th><th className={thCls}>所属服务</th><th className={thCls}>项目开发分支</th><th className={thCls}>最近提交</th><th className={thCls}></th></tr></thead>
              <tbody>
                {svcList.filter(s => s.branch !== '—').map(s => (
                  <tr key={s.name} className="hover:bg-slate-50/70">
                    <td className={tdCls}><span className="font-mono text-xs text-slate-800">{s.repo.replace('git@git.example.com:', '')}</span></td>
                    <td className={tdCls}>{s.cnName}</td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-indigo-600 bg-indigo-50 rounded px-2 py-0.5"><GitBranch className="w-3 h-3" />{s.branch}</span>
                    </td>
                    <td className={tdCls}><span className="text-xs text-slate-500">a3f8c21 · 2 小时前</span></td>
                    <td className={tdCls}><Button variant="ghost" size="sm" className="h-7 text-xs">查看提交</Button></td>
                  </tr>
                ))}
                {svcList.filter(s => s.branch === '—').map(s => (
                  <tr key={s.name} className="hover:bg-slate-50/70 opacity-70">
                    <td className={tdCls}><span className="font-mono text-xs text-slate-800">{s.repo.replace('git@git.example.com:', '')}</span></td>
                    <td className={tdCls}>{s.cnName}</td>
                    <td className={tdCls}><span className="text-xs text-slate-400">复用主干，无项目分支</span></td>
                    <td className={tdCls}><span className="text-xs text-slate-400">—</span></td>
                    <td className={tdCls}></td>
                  </tr>
                ))}
              </tbody>
            </T>
          </TabsContent>

          <TabsContent value="cicd" className="mt-4">
            <T>
              <thead><tr><th className={thCls}>流水线</th><th className={thCls}>关联服务</th><th className={thCls}>类型</th><th className={thCls}>最近状态</th><th className={thCls}>最近执行</th><th className={thCls}>耗时</th><th className={thCls}></th></tr></thead>
              <tbody>
                {pipelines.map(p => (
                  <tr key={p.name} className="hover:bg-slate-50/70">
                    <td className={tdCls}><span className="font-mono text-xs font-medium text-slate-800">{p.name}</span></td>
                    <td className={tdCls}><span className="text-xs">{p.service}</span></td>
                    <td className={tdCls}><Pill tone={p.type === '构建' ? 'blue' : p.type === '测试' ? 'cyan' : 'violet'}>{p.type}</Pill></td>
                    <td className={tdCls}><Pill tone={statusTone(p.lastStatus)} dot>{p.lastStatus}</Pill></td>
                    <td className={tdCls}><span className="text-xs text-slate-500">{p.lastTime}</span></td>
                    <td className={tdCls}><span className="text-xs font-mono text-slate-500">{p.duration}</span></td>
                    <td className={tdCls}><Button variant="ghost" size="sm" className="h-7 text-xs">执行记录</Button></td>
                  </tr>
                ))}
              </tbody>
            </T>
          </TabsContent>

          <TabsContent value="env" className="mt-4">
            <div className="grid grid-cols-4 gap-3">
              {envDeploys.map(e => (
                <div key={e.env} className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className={cn('px-4 py-3 flex items-center justify-between',
                    e.env === 'PROD' ? 'bg-emerald-50' : e.env === 'UAT' ? 'bg-violet-50' : e.env === 'TEST' ? 'bg-cyan-50' : 'bg-slate-50')}>
                    <span className="font-semibold text-slate-800 text-[13px]">{e.env}</span>
                    <Pill tone={e.env === 'PROD' ? 'green' : e.env === 'UAT' ? 'violet' : e.env === 'TEST' ? 'cyan' : 'slate'}>{e.services.length} 个组件</Pill>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {e.services.map(s => (
                      <div key={s.name} className="px-4 py-2.5">
                        <div className="font-mono text-[11px] text-slate-700 truncate">{s.name}</div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-mono text-[11px] text-indigo-600">{s.version}</span>
                          <span className="text-[10px] text-slate-400">{s.updated}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <LinkService open={linkOpen} onClose={() => setLinkOpen(false)} onLinked={onLinked} />
    </div>
  )
}
