import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getProjects, type Project } from '@/api/flow'

const STORAGE_KEY = 'dsh.currentProjectId'

interface ProjectCtx {
  /** 真实项目列表（来自编排层 /projects）。 */
  projects: Project[]
  /** 当前选中的项目（无则 null）。 */
  current: Project | null
  /** 切换当前项目（persist 到 localStorage）。 */
  setProjectId: (id: string | null) => void
  loading: boolean
}

const Ctx = createContext<ProjectCtx>({ projects: [], current: null, setProjectId: () => {}, loading: false })

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [id, setId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getProjects().then(r => {
      if (!alive) return
      const list = r.projects
      setProjects(list)
      setId(prev => {
        if (prev && list.some(p => p.id === prev)) return prev
        return list[0]?.id ?? null
      })
    }).catch(() => { /* 后端不可用时保持空列表 */ }).finally(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [])

  function setProjectId(newId: string | null) {
    setId(newId)
    try {
      if (newId) localStorage.setItem(STORAGE_KEY, newId)
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* 忽略存储失败 */ }
  }

  const current = projects.find(p => p.id === id) ?? null

  return <Ctx.Provider value={{ projects, current, setProjectId, loading }}>{children}</Ctx.Provider>
}

export function useProject() {
  return useContext(Ctx)
}
