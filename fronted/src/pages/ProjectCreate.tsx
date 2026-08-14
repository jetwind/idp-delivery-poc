import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Section, Pill, Avatar } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { orgCandidates, allRoles, zentaoProjects } from '@/mock/data'
import { cn } from '@/lib/utils'
import {
  Check, FolderGit2, GitBranch, FolderTree, ChevronRight, Search, Workflow, FileStack,
  Sparkles, RefreshCcw, Link2, Lock, Package,
} from 'lucide-react'

const projSteps = ['选择禅道项目', '确认基本信息', '成员与角色', '交付模板', '仓库与初始化']
const prodSteps = ['基本信息', '成员与角色', '交付模板', '仓库与初始化']

const flowTemplates = [
  { name: '标准项目流程', desc: '需求澄清 → 方案设计 → 开发实现 → 测试验证 → 发布交付 → 项目复盘，含 9 个 AI 节点、5 个人工 Gate', stages: 6, nodes: 19, tag: '推荐' },
  { name: '定制项目流程', desc: '在标准流程基础上增加客户联合评审与多轮 UAT 节点', stages: 7, nodes: 24 },
  { name: '轻量项目流程', desc: '适用于小型改造，合并方案与设计阶段，精简 Gate', stages: 4, nodes: 11 },
]
const specTemplates = [
  { name: '标准交付规格包', desc: '需求 / 设计 / 接口 / 测试验收 / 发布交付 五类规格', items: 5, tag: '推荐' },
  { name: '集成项目规格包', desc: '标准包 + 集成映射规格 + 数据迁移规格', items: 7 },
  { name: '运维交付规格包', desc: '巡检 / SLA / 应急预案规格', items: 3 },
]
const initDirs = ['requirement/', 'design/', 'api/', 'testing/', 'release/', 'docs/', 'meeting/']
const prodFlowTemplates = [
  { name: '产品演进流程', desc: '需求池 → 版本规划 → 研发迭代 → 测试发布 → 运营复盘，持续演进不设终点', stages: 5, nodes: 15, tag: '推荐' },
  { name: '标准项目流程', desc: '需求澄清 → 方案设计 → 开发实现 → 测试验证 → 发布交付 → 项目复盘', stages: 6, nodes: 19 },
  { name: '轻量迭代流程', desc: '适用于小步快跑的产品迭代，精简 Gate', stages: 4, nodes: 10 },
]
const prodSpecTemplates = [
  { name: '产品规格包', desc: '产品需求 / 设计 / 接口 / 测试 / 发布 五类规格', items: 5, tag: '推荐' },
  { name: '标准交付规格包', desc: '面向交付场景的完整规格包', items: 5 },
]

export default function ProjectCreate() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const isProduct = sp.get('type') === 'product'
  const steps = isProduct ? prodSteps : projSteps
  const flows = isProduct ? prodFlowTemplates : flowTemplates
  const specTpls = isProduct ? prodSpecTemplates : specTemplates
  const [step, setStep] = useState(0)
  const [ztId, setZtId] = useState<string | null>(null)
  const [kw, setKw] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['林书瑶', '何俊熙'])
  const [flow, setFlow] = useState(isProduct ? '产品演进流程' : '标准项目流程')
  const [spec, setSpec] = useState(isProduct ? '产品规格包' : '标准交付规格包')

  const zt = zentaoProjects.find(z => z.id === ztId) ?? null
  const ztList = zentaoProjects.filter(z => !kw || z.name.includes(kw) || z.client.includes(kw) || z.id.includes(kw))

  return (
    <div className="max-w-[1080px] mx-auto">
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-slate-900">{isProduct ? '新建产品' : '创建项目'}</h1>
          {isProduct && <Pill tone="cyan"><Package className="w-3 h-3 mr-1" />自有产品 · 直接创建</Pill>}
        </div>
        <p className="mt-1 text-[13px] text-slate-500">{isProduct ? '直接填写产品信息，建立团队并初始化 AI 原生演进体系' : '从禅道选择交付项目，建立团队并初始化 AI 原生交付体系'}</p>
      </div>

      {/* 步骤条 */}
      <div className="flex items-center mb-6">
        {steps.map((s, i) => (
          <div key={s} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
            <button onClick={() => i < step && setStep(i)} className="flex items-center gap-2.5">
              <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-200 text-slate-500')}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className={cn('text-[13px] whitespace-nowrap', i === step ? 'text-slate-900 font-medium' : 'text-slate-500')}>{s}</span>
            </button>
            {i < steps.length - 1 && <div className={cn('flex-1 h-px mx-3', i < step ? 'bg-emerald-400' : 'bg-slate-200')} />}
          </div>
        ))}
      </div>

      {step === 0 && !isProduct && (
        <Section title="从禅道选择项目" desc="项目基本信息以禅道为准，平台内自动同步、不可修改"
          extra={<>
            <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input value={kw} onChange={e => setKw(e.target.value)} placeholder="搜索项目名称 / 客户 / 编号" className="h-8 w-60 pl-8 text-xs" /></div>
            <Button variant="outline" size="sm" className="h-8 text-xs"><RefreshCcw className="w-3.5 h-3.5 mr-1" />同步禅道</Button>
          </>}>
          <div className="space-y-2 pt-1">
            {ztList.map(z => (
              <button key={z.id} onClick={() => z.status !== '已关闭' && setZtId(z.id)}
                disabled={z.status === '已关闭'}
                className={cn('w-full text-left rounded-lg border p-4 transition-all flex items-center gap-4',
                  ztId === z.id ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30' : 'border-slate-200 hover:border-slate-300',
                  z.status === '已关闭' && 'opacity-45 cursor-not-allowed')}>
                <span className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  ztId === z.id ? 'border-indigo-600' : 'border-slate-300')}>
                  {ztId === z.id && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-slate-800">{z.name}</span>
                    <Pill tone={z.status === '进行中' ? 'blue' : z.status === '未开始' ? 'slate' : 'slate'} dot={z.status === '进行中'}>{z.status}</Pill>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                    <span className="font-mono">{z.id}</span><span>{z.client}</span>
                    <span>负责人 {z.owner}</span><span>关联产品：{z.product}</span><span>需求 {z.reqs} 条</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">同步于 {z.synced}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-blue-50/70 border border-blue-100 rounded-md px-3.5 py-2.5">
            <Link2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
            未找到目标项目？请先在禅道中立项。平台与禅道每 10 分钟自动同步一次，项目编号、客户、周期等以禅道为准。
          </div>
        </Section>
      )}


      {step === 0 && isProduct && (
        <Section title="基本信息" desc="产品为公司自有资产，直接填写创建">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 pt-1">
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">产品名称 <b className="text-rose-500">*</b></span>
              <Input defaultValue="赋码云" /></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">产品编号</span>
              <Input defaultValue="PRD-CODING" className="font-mono" /></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">产品线 <b className="text-rose-500">*</b></span>
              <Select defaultValue="追溯产品线"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="追溯产品线">追溯产品线</SelectItem><SelectItem value="营销产品线">营销产品线</SelectItem><SelectItem value="数据产品线">数据产品线</SelectItem></SelectContent>
              </Select></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">产品负责人 <b className="text-rose-500">*</b></span>
              <Select defaultValue="赵启铭"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="赵启铭">赵启铭</SelectItem><SelectItem value="李婉清">李婉清</SelectItem><SelectItem value="何俊熙">何俊熙</SelectItem></SelectContent>
              </Select></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">演进阶段</span>
              <Select defaultValue="规划中"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="规划中">规划中</SelectItem><SelectItem value="研发中">研发中</SelectItem><SelectItem value="运营中">运营中</SelectItem></SelectContent>
              </Select></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">启动时间</span>
              <Input type="date" defaultValue="2026-08-01" /></label>
            <label className="block col-span-2"><span className="text-xs text-slate-500 mb-1.5 block">产品描述</span>
              <Textarea rows={3} defaultValue="面向中小工厂的轻量赋码 SaaS：产线数据采集、码管理与追溯查询一体化。" /></label>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-cyan-50 border border-cyan-100 rounded-md px-3.5 py-2.5">
            <Package className="w-3.5 h-3.5 text-cyan-600 mt-0.5 shrink-0" />
            产品无客户与交付周期概念，持续演进；AI 原生能力（规格 / 流程 / 版本基线 / 复盘）与交付项目一致。
          </div>
        </Section>
      )}

      {step === 1 && zt && (
        <Section title="确认基本信息" desc="从禅道同步，平台内不可修改"
          extra={<Pill tone="blue"><RefreshCcw className="w-3 h-3 mr-1" />禅道同步 · {zt.synced}</Pill>}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 pt-1">
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">项目名称</span>
              <div className="relative"><Input value={zt.name} readOnly className="bg-slate-50 text-slate-600 pr-8" /><Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" /></div></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">禅道项目编号</span>
              <div className="relative"><Input value={zt.id} readOnly className="bg-slate-50 text-slate-600 font-mono pr-8" /><Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" /></div></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">客户</span>
              <div className="relative"><Input value={zt.client} readOnly className="bg-slate-50 text-slate-600 pr-8" /><Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" /></div></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">项目负责人</span>
              <div className="relative"><Input value={zt.owner} readOnly className="bg-slate-50 text-slate-600 pr-8" /><Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" /></div></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">项目类型</span>
              <Select defaultValue={zt.type}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="标准交付项目">标准交付项目</SelectItem><SelectItem value="定制交付项目">定制交付项目</SelectItem><SelectItem value="运维服务项目">运维服务项目</SelectItem></SelectContent>
              </Select></label>
            <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">项目周期</span>
              <div className="relative"><Input value={zt.period} readOnly className="bg-slate-50 text-slate-600 pr-8" /><Lock className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" /></div></label>
            <label className="block col-span-2"><span className="text-xs text-slate-500 mb-1.5 block">项目描述（平台内补充，不回写禅道）</span>
              <Textarea rows={3} defaultValue={zt.desc} /></label>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-violet-50 border border-violet-100 rounded-md px-3.5 py-2.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
            创建后，AI 将自动拉取禅道中该项目的 {zt.reqs} 条需求作为初始业务上下文，形成需求追溯的起点。
          </div>
        </Section>
      )}
      {step === 1 && !zt && (
        <Section><div className="py-10 text-center text-sm text-slate-400">请先在第一步选择禅道项目</div></Section>
      )}

      {((!isProduct && step === 2) || (isProduct && step === 1)) && (
        <div className="grid grid-cols-[1fr_360px] gap-4">
          <Section title="从组织选择成员" desc="勾选后加入项目团队"
            extra={<div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" /><Input placeholder="搜索姓名 / 部门" className="h-8 w-52 pl-8 text-xs" /></div>}>
            <div className="space-y-1 pt-1">
              {orgCandidates.map(m => (
                <label key={m.name} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer border transition-colors',
                  selectedMembers.includes(m.name) ? 'border-indigo-200 bg-indigo-50/50' : 'border-transparent hover:bg-slate-50')}>
                  <Checkbox checked={selectedMembers.includes(m.name)}
                    onCheckedChange={(c) => setSelectedMembers(c ? [...selectedMembers, m.name] : selectedMembers.filter(x => x !== m.name))} />
                  <Avatar name={m.name} size="sm" />
                  <span className="text-[13px] text-slate-800">{m.name}</span>
                  <span className="text-xs text-slate-400">{m.dept}</span>
                </label>
              ))}
            </div>
          </Section>
          <Section title={`配置项目角色（${selectedMembers.length} 人）`} desc="为成员分配项目职责">
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 px-1 pb-2 border-b border-slate-100">
                <Avatar name={zt?.owner ?? '张明远'} size="sm" /><span className="text-[13px]">{zt?.owner ?? '张明远'}</span><Pill tone="indigo" className="ml-auto">项目经理</Pill>
              </div>
              {selectedMembers.map(name => (
                <div key={name} className="flex items-center gap-2">
                  <Avatar name={name} size="sm" />
                  <span className="text-[13px] text-slate-800 w-14">{name}</span>
                  <Select defaultValue={allRoles[(name.charCodeAt(0)) % allRoles.length]}>
                    <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{allRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
              <p className="text-[11px] text-slate-400 leading-5 pt-1">权限将按项目角色自动关联基础权限集，可在项目成员页调整。</p>
            </div>
          </Section>
        </div>
      )}

      {((!isProduct && step === 3) || (isProduct && step === 2)) && (
        <div className="space-y-4">
          <Section title="选择流程模板" desc="初始化项目交付 Workflow">
            <div className="grid grid-cols-3 gap-3 pt-1">
              {flows.map(t => (
                <button key={t.name} onClick={() => setFlow(t.name)}
                  className={cn('text-left rounded-lg border p-4 transition-all', flow === t.name ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30' : 'border-slate-200 hover:border-slate-300')}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-slate-800"><Workflow className="w-4 h-4 text-indigo-500" />{t.name}</span>
                    {t.tag && <Pill tone="violet">{t.tag}</Pill>}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 leading-5">{t.desc}</p>
                  <div className="mt-3 flex gap-2 text-[11px] text-slate-400"><span>{t.stages} 个阶段</span><span>·</span><span>{t.nodes} 个节点</span></div>
                </button>
              ))}
            </div>
          </Section>
          <Section title="选择规格模板" desc="初始化项目 Specification 结构">
            <div className="grid grid-cols-3 gap-3 pt-1">
              {specTpls.map(t => (
                <button key={t.name} onClick={() => setSpec(t.name)}
                  className={cn('text-left rounded-lg border p-4 transition-all', spec === t.name ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30' : 'border-slate-200 hover:border-slate-300')}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-slate-800"><FileStack className="w-4 h-4 text-cyan-600" />{t.name}</span>
                    {t.tag && <Pill tone="violet">{t.tag}</Pill>}
                  </div>
                  <p className="mt-2 text-xs text-slate-500 leading-5">{t.desc}</p>
                  <div className="mt-3 text-[11px] text-slate-400">{t.items} 类规格</div>
                </button>
              ))}
            </div>
          </Section>
        </div>
      )}

      {((!isProduct && step === 4) || (isProduct && step === 3)) && (
        <div className="grid grid-cols-2 gap-4">
          <Section title="创建项目仓库" desc="项目级 Git Repository，管理可版本化项目内容">
            <div className="space-y-4 pt-1">
              <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">Repo 名称</span>
                <div className="flex items-center gap-2"><FolderGit2 className="w-4 h-4 text-slate-400" /><Input defaultValue={zt ? `${zt.id.toLowerCase()}-trace-platform` : isProduct ? 'prd-coding-cloud' : ''} className="font-mono text-[13px]" /></div></label>
              <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">仓库地址（自动生成）</span>
                <Input readOnly value={zt ? `git@git.example.com:projects/${zt.id.toLowerCase()}-trace-platform.git` : isProduct ? 'git@git.example.com:products/prd-coding-cloud.git' : ''} className="font-mono text-xs bg-slate-50 text-slate-500" /></label>
              <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">默认分支</span>
                <div className="flex items-center gap-2"><GitBranch className="w-4 h-4 text-slate-400" /><Input defaultValue="main" className="font-mono w-40" /></div></label>
            </div>
          </Section>
          <Section title="初始化标准目录" desc="按规格模板自动生成项目目录结构">
            <div className="pt-1 rounded-md bg-[#0c1428] p-4 font-mono text-xs leading-6 text-slate-300">
              <div className="text-slate-500">{zt ? `${zt.id.toLowerCase()}-trace-platform/` : isProduct ? 'prd-coding-cloud/' : 'project-repo/'}</div>
              {initDirs.map(d => (
                <div key={d} className="flex items-center gap-2 pl-4"><FolderTree className="w-3 h-3 text-indigo-400" />{d}</div>
              ))}
              <div className="flex items-center gap-2 pl-4 text-slate-500"><ChevronRight className="w-3 h-3" />README.md</div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2 text-xs text-slate-500 bg-violet-50 border border-violet-100 rounded-md px-3 py-2.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                创建完成后，AI 自动建立项目上下文索引，按所选模板初始化交付 Workflow 与规格目录。
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-600 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                <span>同时自动生成<b className="text-indigo-700"> 初始基线 V0.1.0 </b>（仓库初始 Commit + 规格模板版本 + 禅道需求快照）——这是项目版本谱系的起点，之后每次「创建基线」冻结为新版本，首次生产发布形成 V1.0.0。</span>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* 底部操作 */}
      <div className="flex items-center justify-between mt-6 pb-4">
        <Button variant="ghost" onClick={() => step === 0 ? nav('/projects') : setStep(step - 1)}>
          {step === 0 ? '取消' : '上一步'}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">保存草稿</Button>
          {step < steps.length - 1
            ? <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={!isProduct && step === 0 && !ztId} onClick={() => setStep(step + 1)}>下一步</Button>
            : <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => nav(isProduct ? '/projects/pd3' : '/projects/p1')}><Check className="w-4 h-4 mr-1" />{isProduct ? '创建产品' : '创建项目'}</Button>}
        </div>
      </div>
    </div>
  )
}
