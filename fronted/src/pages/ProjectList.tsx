import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { deleteProject, getProjects, type Project } from '@/api/flow'
import { PageHeader, Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Plus, Play, Trash2, Loader2, FolderGit2 } from 'lucide-react'

export default function ProjectList() {
  const nav = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    try {
      const r = await getProjects()
      setProjects(r.projects)
    } catch { /* 忽略单次失败 */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function remove(id: string) {
    if (!window.confirm('删除该项目及其流水线记录？')) return
    setBusyId(id)
    try {
      await deleteProject(id)
      await load()
    } catch { /* 删除失败不阻断 */ } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="项目与产品"
        desc="AI 原生交付项目 · 新增项目后点击进入 AI 流水线，可继续已有流水线或重新开始"
        extra={
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => nav('/projects/new')}>
            <Plus className="w-4 h-4 mr-1" />新增项目
          </Button>
        }
      />

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />加载中…</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-slate-300 py-16 text-center">
          <FolderGit2 className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="mt-3 text-sm text-slate-500">还没有项目</div>
          <p className="mt-1 text-xs text-slate-400">点击右上角「新增项目」，输入名称与需求即可启动 AI 交付流水线。</p>
          <Button size="sm" className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={() => nav('/projects/new')}>
            <Plus className="w-4 h-4 mr-1" />新增项目
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {projects.map(p => (
            <div key={p.id} className="rounded-lg border border-slate-200/80 bg-white p-4 hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">{p.name.slice(0, 1)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-slate-800 truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{p.id}</div>
                </div>
                <Pill tone={p.thread_id ? 'green' : 'slate'} dot={!!p.thread_id}>{p.thread_id ? '有流水线' : '未开始'}</Pill>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500 flex-1 line-clamp-3">{p.requirement_text}</p>
              <div className="mt-2 text-[11px] text-slate-400 font-mono truncate" title={p.cwd}>{p.cwd}</div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => nav(`/projects/${p.id}/flow`)}>
                  <Play className="w-3.5 h-3.5 mr-1" />{p.thread_id ? '继续流水线' : '进入流水线'}
                </Button>
                <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" disabled={busyId === p.id} onClick={() => remove(p.id)}>
                  {busyId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
