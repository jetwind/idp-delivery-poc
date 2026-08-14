import { useNavigate } from 'react-router'
import { members, services, pipelines, envDeploys } from '@/mock/data'
import { useProject } from '@/hooks/project'
import { Section, Pill, Bar, Field, Avatar, AIPill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Boxes, GitBranch, Repeat, Server, ChevronRight, Gauge, Clock3, CalendarDays, PencilLine } from 'lucide-react'

const stageFlow = ['需求', '方案', '开发', '测试', '交付', '复盘']

export default function ProjectOverview() {
  const nav = useNavigate()
  const { obj: p } = useProject()
  const cur = stageFlow.indexOf(p.stage) >= 0 ? stageFlow.indexOf(p.stage) : 1

  return (
    <div>
      {/* 项目头部 */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-6 py-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-900">{p.name}</h1>
              <Pill tone="blue" dot>{p.status}</Pill>
              <Pill tone={p.kind === '产品' ? 'cyan' : 'slate'}>{p.kind === '产品' ? '自有产品' : '标准交付项目'}</Pill>
            </div>
            <div className="mt-2 flex items-center gap-5 text-xs text-slate-500">
              <span className="font-mono">{p.code}</span>
              <span className="flex items-center gap-1"><Avatar name={p.owner} size="sm" />{p.owner}（负责人）</span>
              <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{p.period}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><PencilLine className="w-3.5 h-3.5 mr-1" />编辑信息</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => nav('/projects/p1/delivery')}>
              <Gauge className="w-3.5 h-3.5 mr-1" />进入交付总览
            </Button>
          </div>
        </div>
        {/* 阶段进度 */}
        <div className="mt-5 flex items-center">
          {stageFlow.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <span className={`w-6 h-6 rounded-full text-[11px] flex items-center justify-center font-medium ${i < cur ? 'bg-emerald-500 text-white' : i === cur ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-200 text-slate-500'}`}>{i < cur ? '✓' : i + 1}</span>
                <span className={`mt-1.5 text-xs ${i === cur ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>{s}</span>
              </div>
              {i < stageFlow.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-5 rounded ${i < cur ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 基础信息 */}
        <Section title="基础信息" className="col-span-2">
          <div className="grid grid-cols-3 gap-y-5 gap-x-6 pt-1">
            <Field label={p.kind === '产品' ? '产品线' : '客户'}>{p.sub}</Field>
            <Field label="项目编号"><span className="font-mono text-xs">{p.code}</span></Field>
            <Field label={p.kind === '产品' ? '对象类型' : '项目类型'}>{p.kind === '产品' ? '自有产品 · 持续演进' : '标准交付项目'}</Field>
            <div className="col-span-3"><Field label="项目描述">{p.desc}</Field></div>
          </div>
        </Section>

        {/* 当前版本 */}
        <Section title="当前版本" extra={<button className="text-xs text-indigo-600 hover:underline" onClick={() => nav('/projects/p1/releases')}>全部版本</button>}>
          {p.release !== '—' ? (
            <>
              <button onClick={() => nav('/projects/p1/releases/v130')} className="w-full text-left rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-4 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl font-semibold text-indigo-700">{p.release}</span>
                  <Pill tone="green" dot>{p.status === '已完成' ? '已发布' : '当前生产'}</Pill>
                </div>
                <div className="mt-2 text-xs text-slate-500">发布于 2026-06-28 · PROD 环境 · 8 个微服务</div>
                <div className="mt-2 flex items-center text-xs text-indigo-600">查看版本详情<ChevronRight className="w-3.5 h-3.5" /></div>
              </button>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Clock3 className="w-3.5 h-3.5" />预发布 V1.4.0-rc.1 正在 UAT 验证
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
              <div className="text-[13px] text-slate-500">尚无发布版本</div>
              <div className="mt-1 text-[11px] text-slate-400">项目创建时已生成初始基线 V0.1.0<br />首次发布前通过「创建基线」冻结新版本</div>
              <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => nav('/projects/p1/releases')}>查看版本谱系</Button>
            </div>
          )}
        </Section>

        {/* 项目团队 */}
        <Section title="项目团队" desc={`共 ${members.length} 名成员`} extra={<button className="text-xs text-indigo-600 hover:underline" onClick={() => nav('/projects/p1/members')}>管理成员</button>}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1">
            {members.slice(0, 6).map(m => (
              <div key={m.name} className="flex items-center gap-2.5">
                <Avatar name={m.name} />
                <div className="min-w-0">
                  <div className="text-[13px] text-slate-800">{m.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{m.roles.join(' / ')}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 工程资产摘要 */}
        <Section title="工程资产摘要" extra={<button className="text-xs text-indigo-600 hover:underline" onClick={() => nav('/projects/p1/assets')}>进入工程资产</button>}>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { icon: Boxes, label: '微服务', value: services.length, to: '/projects/p1/assets' },
              { icon: GitBranch, label: 'Git 仓库', value: services.length, to: '/projects/p1/assets' },
              { icon: Repeat, label: '流水线', value: pipelines.length, to: '/projects/p1/assets' },
              { icon: Server, label: '环境', value: envDeploys.length, to: '/projects/p1/assets' },
            ].map(it => (
              <button key={it.label} onClick={() => nav(it.to)} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3.5 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors text-left">
                <it.icon className="w-4.5 h-4.5 text-indigo-500" size={18} />
                <div><div className="text-lg font-semibold text-slate-800 leading-5">{it.value}</div><div className="text-xs text-slate-400">{it.label}</div></div>
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-400">其中新建 2 个服务 · 核心改造 2 个 · 接口适配 2 个 · 直接复用 2 个</div>
        </Section>

        {/* AI 交付摘要 */}
        <Section title="AI 交付摘要" extra={<AIPill />} className="row-span-1">
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-slate-500">当前阶段</span><span className="font-medium text-slate-800">{p.stage}阶段</span>
            </div>
            <div>
              <div className="flex items-center justify-between text-[13px] mb-1.5"><span className="text-slate-500">整体进度</span><span className="font-medium text-slate-800">{p.progress}%</span></div>
              <Bar value={p.progress} />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button onClick={() => nav('/projects/p1/gate')} className="rounded-md bg-amber-50 border border-amber-100 py-2.5 text-center hover:shadow-sm">
                <div className="text-lg font-semibold text-amber-600 leading-5">3</div><div className="text-[11px] text-amber-600/80">待确认</div>
              </button>
              <button onClick={() => nav('/projects/p1/workflow')} className="rounded-md bg-violet-50 border border-violet-100 py-2.5 text-center hover:shadow-sm">
                <div className="text-lg font-semibold text-violet-600 leading-5">2</div><div className="text-[11px] text-violet-600/80">AI 执行中</div>
              </button>
              <button onClick={() => nav('/projects/p1/delivery')} className="rounded-md bg-rose-50 border border-rose-100 py-2.5 text-center hover:shadow-sm">
                <div className="text-lg font-semibold text-rose-600 leading-5">{p.risks}</div><div className="text-[11px] text-rose-600/80">风险</div>
              </button>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => nav('/projects/p1/delivery')}>查看交付驾驶舱<ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
          </div>
        </Section>
      </div>
    </div>
  )
}
