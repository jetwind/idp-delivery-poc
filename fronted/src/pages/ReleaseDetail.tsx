import { useNavigate } from 'react-router'
import { releaseDetail as r } from '@/mock/data3'
import { Section, Pill, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronLeft, GitCompareArrows, FileText, ArrowRight } from 'lucide-react'

export default function ReleaseDetail() {
  const nav = useNavigate()
  return (
    <div>
      {/* 头部 */}
      <div className="bg-white rounded-lg border border-slate-200/80 px-6 py-5 mb-4 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button onClick={() => nav('/projects/p1/releases')} className="mt-1 w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800"><ChevronLeft className="w-4 h-4" /></button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold font-mono text-slate-900">Project Release {r.version}</h1>
              <Pill tone="green" dot>{r.status}</Pill>
              <Pill tone="violet">{r.env}</Pill>
            </div>
            <div className="mt-1.5 text-xs text-slate-400">发布于 {r.releasedAt} · 发布人 {r.releasedBy} · 含 {r.swBaseline.length} 个微服务 · 关联 {r.crs.length} 个 CR</div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => nav('/projects/p1/releases/compare')}><GitCompareArrows className="w-3.5 h-3.5 mr-1" />与历史版本对比</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* 规格基线 */}
        <Section title="项目规格基线" extra={<FileText className="w-4 h-4 text-slate-300" />}>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {r.specBaseline.map(s => (
              <div key={s.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5">
                <span className="text-[13px] text-slate-700">{s.name}</span>
                <span className="font-mono text-xs text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">{s.version}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 测试基线 */}
        <Section title="测试基线">
          <div className="grid grid-cols-4 gap-2.5 pt-1">
            {[['用例总数', r.tests.total], ['通过', r.tests.passed], ['失败', r.tests.failed], ['覆盖率', r.tests.coverage]].map(([k, v]) => (
              <div key={k as string} className="rounded-lg bg-slate-50 px-3 py-3 text-center">
                <div className="text-lg font-semibold text-slate-800 leading-6">{v}</div>
                <div className="text-[11px] text-slate-400">{k}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500 leading-5">结论：{r.tests.conclusion}</p>
        </Section>

        {/* 软件基线 */}
        <Section title="软件基线" desc="微服务版本与 Commit" className="col-span-2" pad={false}>
          <T className="border-t border-slate-100 mt-1">
            <thead><tr>
              <th className={cn(thCls, 'pl-5')}>微服务</th><th className={thCls}>版本</th><th className={thCls}>Commit</th>
              <th className={thCls}>镜像 Digest</th><th className={thCls}>构建</th><th className={cn(thCls, 'pr-5')}>构建时间</th>
            </tr></thead>
            <tbody>
              {r.swBaseline.map(s => {
                const b = r.builds.find(x => x.service === s.service)
                const img = r.images.find(x => x.service === s.service)
                return (
                  <tr key={s.service} className="hover:bg-slate-50/70">
                    <td className={cn(tdCls, 'pl-5 font-mono text-xs')}>{s.service}</td>
                    <td className={tdCls}><span className="font-mono text-xs text-indigo-600">{s.version}</span></td>
                    <td className={tdCls}><span className="font-mono text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{s.commit}</span></td>
                    <td className={tdCls}><span className="font-mono text-[11px] text-slate-400">{img ? img.digest : '—'}</span></td>
                    <td className={tdCls}>{b ? <Pill tone="green">{b.build} {b.result}</Pill> : <span className="text-xs text-slate-300">随上次构建</span>}</td>
                    <td className={cn(tdCls, 'pr-5')}><span className="text-xs text-slate-400">{b ? b.time : '—'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </T>
        </Section>

        {/* 变更记录 */}
        <Section title="变更记录" desc={`本版本关联 ${r.crs.length} 个 CR`}>
          <div className="space-y-2 pt-1">
            {r.crs.map(c => (
              <div key={c} className="flex items-center gap-2.5 text-[13px] text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />{c}
              </div>
            ))}
          </div>
        </Section>

        {/* 追溯链路 */}
        <Section title="追溯链路" desc="Requirement → Task → Commit → Build → Release">
          <div className="space-y-2.5 pt-1">
            {r.trace.map(t => (
              <div key={t.req} className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <Pill tone="blue">{t.req}</Pill><ArrowRight className="w-3 h-3 text-slate-300" />
                <Pill tone="slate">{t.task}</Pill><ArrowRight className="w-3 h-3 text-slate-300" />
                <Pill tone="cyan">{t.commit}</Pill><ArrowRight className="w-3 h-3 text-slate-300" />
                <Pill tone="violet">{t.build}</Pill><ArrowRight className="w-3 h-3 text-slate-300" />
                <Pill tone="green">{t.release}</Pill>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
