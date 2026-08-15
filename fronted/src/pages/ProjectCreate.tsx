import { useState } from 'react'
import { useNavigate } from 'react-router'
import { createProject } from '@/api/flow'
import { PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'

export default function ProjectCreate() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [requirement, setRequirement] = useState('')
  const [cwd, setCwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!name.trim() || !requirement.trim() || !cwd.trim()) {
      setErr('请填写项目名称、需求描述与工作目录'); return
    }
    setBusy(true); setErr(null)
    try {
      const r = await createProject(name.trim(), requirement.trim(), cwd.trim())
      nav(`/projects/${r.project.id}/flow`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-[760px] mx-auto">
      <PageHeader
        title="新增项目"
        desc="填写项目名称与原始需求，创建后进入 AI 交付流水线（需求→设计→任务→编码→测试）"
        extra={<Button variant="outline" size="sm" onClick={() => nav('/projects')}><ArrowLeft className="w-4 h-4 mr-1" />返回</Button>}
      />

      <div className="bg-white rounded-lg border border-slate-200/80 px-6 py-5 space-y-4">
        <label className="block">
          <span className="text-xs text-slate-500 mb-1.5 block">项目名称 <b className="text-rose-500">*</b></span>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="如：一物一码追溯码管理" />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1.5 block">原始需求 <b className="text-rose-500">*</b></span>
          <Textarea
            rows={5}
            value={requirement}
            onChange={e => setRequirement(e.target.value)}
            placeholder="用几句话描述要交付的内容，例如：实现一个追溯码工具库：生成追溯码（企业前缀-商品代码-序列号-校验位）与解析追溯码，Node.js 纯函数、无外部依赖，自带可运行的 npm test。"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-500 mb-1.5 block">工作目录 <b className="text-rose-500">*</b></span>
          <Input
            value={cwd}
            onChange={e => setCwd(e.target.value)}
            className="font-mono text-xs"
            placeholder="agent 干活的地方，如 D:\ccn-work\src\github\deepseek-harness-delivery\examples\003"
          />
          <p className="mt-1.5 text-[11px] text-slate-400">本地已存在目录或可 clone 的 git URL；产物会写到这里并按阶段 git commit。</p>
        </label>

        {err && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{err}</div>
        )}

        <div className="flex justify-end pt-1">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" disabled={busy} onClick={submit}>
            {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            创建并进入流水线
          </Button>
        </div>
      </div>
    </div>
  )
}
