import { createContext, useContext, useState, type ReactNode } from 'react'
import { projects, currentProject, products, type Project, type Product } from '@/mock/data'

export interface ObjInfo {
  id: string
  kind: '项目' | '产品'
  name: string
  code: string
  owner: string
  status: string
  stage: string
  risks: number
  todos: number
  release: string
  progress: number
  period: string
  sub: string // 客户 或 产品线
  desc: string
}

interface ProjectCtx {
  obj: ObjInfo
  setObjId: (id: string) => void
}

function toObj(p: Project): ObjInfo {
  return { id: p.id, kind: '项目', name: p.name, code: p.code, owner: p.owner, status: p.status, stage: p.stage, risks: p.risks, todos: p.todos, release: p.release, progress: p.progress, period: p.period, sub: p.client, desc: p.desc }
}
function toObjFromProduct(p: Product): ObjInfo {
  return { id: p.id, kind: '产品', name: p.name, code: p.code, owner: p.owner, status: p.status, stage: p.stage, risks: p.risks, todos: p.todos, release: p.release, progress: p.progress, period: p.period, sub: p.line, desc: p.desc }
}

const Ctx = createContext<ProjectCtx>({ obj: toObj(currentProject), setObjId: () => {} })

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState(currentProject.id)
  const proj = projects.find(p => p.id === id)
  const prod = products.find(p => p.id === id)
  const obj: ObjInfo = proj ? toObj(proj) : prod ? toObjFromProduct(prod) : toObj(currentProject)
  return <Ctx.Provider value={{ obj, setObjId: setId }}>{children}</Ctx.Provider>
}

export function useProject() {
  return useContext(Ctx)
}
