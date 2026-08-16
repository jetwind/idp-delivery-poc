import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { createVersion, deliverVersion, getProject, suggestVersionName, type Project, type Version } from '@/api/flow'
import { useProject } from '@/hooks/project'
import { PageHeader, Pill } from '@/components/common'
import AttachmentPicker, { type Attachment, attachmentBlock } from '@/components/AttachmentPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ArrowLeft, Plus, Play, GitBranch, Loader2, CheckCircle2, History } from 'lucide-react'

const stageNames = ['01 需求', '02 详细设计', '03 任务', '04 编码', '05 测试']

export default function ProjectDetail() {
  const { pid } = useParams()
  const nav = useNavigate()
  const { setProjectId } = useProject()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newReq, setNewReq] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [delivering, setDelivering] = useState<string | null>(null)

  async function load() {
    if (!pid) return
    try {
      const r = await getProject(pid)
      setProject(r.project)
      setProjectId(pid)
    } catch { /* 忽略单次失败 */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [pid])

  function openVersion(v: Version) {
    nav(`/projects/${pid}/versions/${v.id}/flow`)
  }

  async function openCreate() {
    setErr(null); setNewReq(''); setNewNote(''); setNewAttachments([])
    if (pid) {
      try { setNewName((await suggestVersionName(pid)).name) } catch { setNewName('') }
    }
    setCreateOpen(true)
  }

  async function submitCreate() {
    if (!pid || !newReq.trim()) { setErr('请填写该版本的需求描述'); return }
    setBusy(true); setErr(null)
    try {
      const fullReq = newReq.trim() + attachmentBlock(newAttachments)
      await createVersion(pid, newName.trim(), fullReq, newNote.trim())
      setCreateOpen(false)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function deliver(v: Version) {
    if (!window.confirm(`标记 ${v.name} 为已交付，并在项目 git 仓库打 tag？`)) return
    setDelivering(v.id)
    try {
      await deliverVersion(v.id)
      await load()
    } catch { /* 忽略单次失败 */ } finally {
      setDelivering(null)
    }
  }

  const versions = project?.versions ?? []
  const versionById = new Map(versions.map(v => [v.id, v.name]))

  return (
    <div>
      <PageHeader
        title={project?.name ?? '项目详情'}
        desc={project ? `工作目录：${project.cwd}` : ''}
        extra={<Button variant="outline" size="sm" onClick={() => nav('/projects')}><ArrowLeft className="w-4 h-4 mr-1" />返回项目列表</Button>}
      />

      <div className="bg-white rounded-lg border border-slate-200/80 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800"><History className="w-4 h-4 text-indigo-500" />版本列表（{versions.length}）</div>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />新建版本</Button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />加载中…</div>
        ) : versions.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">暂无版本</div>
        ) : (
          <div className="space-y-2">
            {versions.map(v => (
              <div key={v.id} className="rounded-lg border border-slate-100 p-3.5 flex items-center gap-3 hover:border-indigo-200">
                <GitBranch className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="w-24 shrink-0 font-mono text-[13px] font-semibold text-indigo-600">{v.name}</div>
                <Pill tone={v.status === '已交付' ? 'green' : v.status === '进行中' ? 'blue' : 'slate'} dot>{v.status}</Pill>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-700 truncate">{v.requirement_text}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {v.thread_id ? `阶段：${stageNames[v.stage_index] ?? v.stage_index}` : '未启动流水线'}
                    {v.baseline_version_id && ` · 基于 ${versionById.get(v.baseline_version_id) ?? '?'}`}
                    {v.note && ` · ${v.note}`}
                  </div>
                </div>
                {v.status !== '已交付' && (
                  <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 shrink-0" disabled={delivering === v.id} onClick={() => deliver(v)}>
                    {delivering === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}标记交付
                  </Button>
                )}
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shrink-0" onClick={() => openVersion(v)}>
                  <Play className="w-3.5 h-3.5 mr-1" />{v.thread_id ? '继续' : '进入流水线'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>新建版本</SheetTitle>
            <SheetDescription>客户新需求 = 在同一项目里新建版本，基于上一版本基线继续，不新建项目。</SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            {project?.current_version && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs text-indigo-700">
                基线：<span className="font-mono font-semibold">{project.current_version.name}</span>
                <span className="text-indigo-500">（新版本将在其基础上增量演进，不覆盖基线）</span>
              </div>
            )}
            <label className="block">
              <span className="text-xs text-slate-500 mb-1.5 block">版本号</span>
              <Input value={newName} onChange={e => setNewName(e.target.value)} className="font-mono" placeholder="如 v1.1.0" />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500 mb-1.5 block">本版本需求 <b className="text-rose-500">*</b></span>
              <Textarea rows={4} value={newReq} onChange={e => setNewReq(e.target.value)} placeholder="这一版要交付的新需求…" />
            </label>
            <div>
              <span className="text-xs text-slate-500 mb-1.5 block">需求附件（可选）</span>
              <AttachmentPicker cwd={project?.cwd ?? ''} onChange={setNewAttachments} />
            </div>
            <label className="block">
              <span className="text-xs text-slate-500 mb-1.5 block">备注（可选）</span>
              <Input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="如：客户二期需求" />
            </label>
            {err && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{err}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={busy} onClick={submitCreate}>
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}创建版本
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
