import { useState } from 'react'
import { Pill, Avatar } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  PencilLine, FileStack, UploadCloud, FolderSearch, Sparkles, ChevronRight, CheckCircle2,
  FileText, Table2, X, Bot,
} from 'lucide-react'

const categories = ['产品知识库', '行业知识', '技术规范', '最佳实践', '项目沉淀资产']
const types = ['规范文档', '行业标准', '业务规则', '需求模板', '方案模板', '接口案例', '测试案例', '问题案例', '实践总结']
const agentOptions = ['Ava（需求分析师）', 'Neo（方案架构师）', 'Rex（开发主管）', 'Dev-07（Coding Agent）', 'Tess（测试工程师）', 'Echo（复盘分析师）']

const templates = [
  { name: '业务规则模板', desc: '规则背景 / 规则条目 / 适用场景 / 例外说明', cat: '项目沉淀资产' },
  { name: '需求模板', desc: '业务背景 / 目标 / 范围 / 功能点 / 验收口径', cat: '项目沉淀资产' },
  { name: '方案模板', desc: '架构总览 / 服务划分 / 数据设计 / 关键机制 / 非功能', cat: '最佳实践' },
  { name: '接口案例模板', desc: '集成背景 / 接口清单 / 字段映射 / 异常与对账', cat: '项目沉淀资产' },
  { name: '问题案例模板', desc: '现象 / 环境 / 根因分析 / 处置步骤 / 预防建议', cat: '项目沉淀资产' },
]
const projectObjects = [
  { name: '多级包装关联规则', from: '全域产品追溯平台 · 设计规格 §2', tag: '推荐' },
  { name: '窜货预警规则集', from: '全域产品追溯平台 · 需求规格 §5', tag: '' },
  { name: 'SAP 中间表集成方案', from: 'SAP 集成中台 · 交付成果', tag: '' },
  { name: '仓间调拨扫码容错用例', from: '全域产品追溯平台 · 测试验收规格', tag: '' },
]
const sourceFiles = [
  { name: '多级包装关联规则-0717.docx', size: '86 KB', icon: FileText, extracted: 3 },
  { name: 'GS1-应用标识符表.xlsx', size: '1.2 MB', icon: Table2, extracted: 0 },
]

type Step = 'method' | 'form'

export default function KBCreate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<string | null>(null)
  const [pickedAgents, setPickedAgents] = useState<string[]>([])
  const [files, setFiles] = useState(sourceFiles)
  const [done, setDone] = useState<'draft' | 'review' | null>(null)

  const reset = () => { setStep('method'); setMethod(null); setDone(null); setPickedAgents([]) }
  const close = () => { onClose(); setTimeout(reset, 300) }
  const pick = (m: string) => { setMethod(m); setStep('form') }

  const methods = [
    { id: 'manual', icon: PencilLine, title: '手动录入', desc: '直接编写知识内容，适合规范、实践总结', tone: 'text-blue-500 bg-blue-50' },
    { id: 'template', icon: FileStack, title: '从模板创建', desc: '基于标准结构模板创建，适合规则/案例/模板类', tone: 'text-cyan-600 bg-cyan-50' },
    { id: 'upload', icon: UploadCloud, title: '上传文档', desc: 'Word/Excel/PDF 上传，AI 自动结构化为知识', tone: 'text-violet-600 bg-violet-50' },
    { id: 'extract', icon: FolderSearch, title: '从项目提取', desc: '从项目规格、交付成果中提取为可复用知识', tone: 'text-amber-600 bg-amber-50' },
  ]

  const finish = (t: 'draft' | 'review') => setDone(t)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>新建知识</SheetTitle>
          <SheetDescription>创建企业知识，发布后供数字员工在任务中引用</SheetDescription>
        </SheetHeader>

        {done ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <span className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-7 h-7" /></span>
            <h3 className="mt-4 text-[15px] font-semibold text-slate-800">
              {done === 'draft' ? '已保存为草稿' : '已提交入库审核'}
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500 max-w-[360px]">
              {done === 'draft'
                ? '知识已保存为草稿，可稍后编辑完善后提交审核或发布。'
                : 'AI 质量预检通过（86 分），已进入入库审核队列，由知识管理员审批后发布。'}
            </p>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={reset}>再建一条</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={close}>完成</Button>
            </div>
          </div>
        ) : step === 'method' ? (
          <div className="mt-5 space-y-2.5">
            {methods.map(m => (
              <button key={m.id} onClick={() => pick(m.id)}
                className="w-full flex items-center gap-3.5 rounded-lg border border-slate-200 px-4 py-3.5 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors text-left group">
                <span className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', m.tone)}><m.icon className="w-5 h-5" /></span>
                <span className="flex-1">
                  <span className="block text-[14px] font-medium text-slate-800">{m.title}</span>
                  <span className="block text-xs text-slate-400 mt-0.5">{m.desc}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
              </button>
            ))}
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-violet-50 border border-violet-100 rounded-md px-3.5 py-2.5 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
              无论哪种方式，知识都需结构化入库：草稿 → AI 质量预检 → 提交审核（规范类可直接发布）→ 版本化发布。
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* 返回 */}
            <button onClick={() => setStep('method')} className="text-xs text-slate-400 hover:text-slate-700">← 重新选择创建方式</button>

            {/* 模板选择 */}
            {method === 'template' && (
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">选择知识模板</div>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map(t => (
                    <label key={t.name} className="rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/40">
                      <div className="flex items-center gap-2">
                        <input type="radio" name="tpl" defaultChecked={t.name === '业务规则模板'} className="accent-indigo-600" />
                        <span className="text-[13px] font-medium text-slate-800">{t.name}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-slate-400">{t.desc}</p>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 上传文档 */}
            {method === 'upload' && (
              <div>
                <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                  <UploadCloud className="w-6 h-6 text-slate-300 mx-auto" />
                  <div className="mt-1.5 text-[13px] text-slate-600">点击上传或拖拽文件至此</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">支持 Word / Excel / PDF / PPT，单文件 ≤ 50MB</div>
                </div>
                {files.length > 0 && (
                  <div className="mt-2.5 space-y-1.5">
                    {files.map(f => (
                      <div key={f.name} className="flex items-center gap-2.5 rounded-md border border-slate-100 px-3 py-2">
                        <f.icon className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="flex-1 text-xs text-slate-700 truncate">{f.name}</span>
                        {f.extracted > 0
                          ? <span className="inline-flex items-center gap-1 text-[10.5px] text-violet-600"><Sparkles className="w-3 h-3" />AI 已提取 {f.extracted} 条规则草稿</span>
                          : <span className="text-[10.5px] text-slate-400">解析中…</span>}
                        <span className="text-[10px] text-slate-400">{f.size}</span>
                        <button onClick={() => setFiles(fs => fs.filter(x => x.name !== f.name))}><X className="w-3.5 h-3.5 text-slate-300 hover:text-rose-500" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 从项目提取 */}
            {method === 'extract' && (
              <div>
                <div className="text-xs font-medium text-slate-500 mb-2">选择项目对象（AI 将提取为结构化知识）</div>
                <div className="space-y-1.5">
                  {projectObjects.map(o => (
                    <label key={o.name} className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 cursor-pointer hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/40">
                      <input type="radio" name="po" defaultChecked={!!o.tag} className="accent-indigo-600" />
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-slate-800">{o.name} {o.tag && <Pill tone="violet" className="ml-1">推荐</Pill>}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{o.from}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 通用表单 */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2"><span className="text-xs text-slate-500 mb-1.5 block">知识名称 <b className="text-rose-500">*</b></span>
                <Input defaultValue={method === 'extract' ? '多级包装关联规则' : method === 'upload' ? '多级包装关联规则（文档提取）' : ''} placeholder="例如：防窜货业务规则集" /></label>
              <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">知识分类 <b className="text-rose-500">*</b></span>
                <Select defaultValue={method === 'extract' ? '项目沉淀资产' : method === 'template' ? '项目沉淀资产' : '技术规范'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select></label>
              <label className="block"><span className="text-xs text-slate-500 mb-1.5 block">知识类型</span>
                <Select defaultValue="业务规则">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select></label>
              <label className="block col-span-2"><span className="text-xs text-slate-500 mb-1.5 block">来源说明（来源可追溯）</span>
                <Input defaultValue={method === 'extract' ? '全域产品追溯平台 · 设计规格 §2' : ''} placeholder="例如：研发中心 · 技术委员会评审 / 全域产品追溯平台 · 复盘" /></label>
              <label className="block col-span-2"><span className="text-xs text-slate-500 mb-1.5 block">知识内容</span>
                <Textarea rows={5} defaultValue={method === 'upload' || method === 'extract'
                  ? '1. 盒-箱-托三级关联：装箱时建立父子关系，拆箱自动解除。\n2. 关联修正需双人复核，修正前后关系快照均保留可溯。\n3. 箱码破损时允许以盒码反查重新关联。'
                  : ''} placeholder="按条目编写知识内容…" /></label>
            </div>

            {/* 授权数字员工 */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2">
                <Bot className="w-3.5 h-3.5 text-violet-500" />授权数字员工（发布后这些员工可在任务中引用）
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {agentOptions.map(a => (
                  <label key={a} className="flex items-center gap-2 rounded-md border border-slate-100 px-3 py-2 text-xs cursor-pointer hover:border-indigo-200 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50/40">
                    <Checkbox checked={pickedAgents.includes(a)} onCheckedChange={c => setPickedAgents(s => c ? [...s, a] : s.filter(x => x !== a))} />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            {/* 维护人 */}
            <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3.5 py-2.5">
              <Avatar name="罗一帆" size="sm" />
              <div className="text-xs"><span className="text-slate-700 font-medium">罗一帆</span><span className="text-slate-400">（知识管理员 · 默认维护责任人，可调整）</span></div>
            </div>

            <div className="flex justify-end gap-2 pt-1 pb-2">
              <Button variant="ghost" onClick={close}>取消</Button>
              <Button variant="outline" onClick={() => finish('draft')}>保存草稿</Button>
              <Button variant="outline" className="border-violet-200 text-violet-600 hover:bg-violet-50"><Sparkles className="w-3.5 h-3.5 mr-1" />AI 质量预检</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => finish('review')}><CheckCircle2 className="w-4 h-4 mr-1" />提交审核</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
