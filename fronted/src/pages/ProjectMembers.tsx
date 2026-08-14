import { useState } from 'react'
import { members, orgCandidates, allRoles } from '@/mock/data'
import { PageHeader, Pill, Avatar, T, thCls, tdCls } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { UserPlus, Search, ShieldCheck, PencilLine, Trash2 } from 'lucide-react'

export default function ProjectMembers() {
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])

  return (
    <div>
      <PageHeader
        title="项目成员"
        desc={`共 ${members.length} 名成员 · 权限按项目角色自动关联`}
        extra={<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setAddOpen(true)}><UserPlus className="w-4 h-4 mr-1" />添加成员</Button>}
      />

      <div className="bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <T>
          <thead>
            <tr>
              <th className={thCls}>成员</th>
              <th className={thCls}>部门</th>
              <th className={thCls}>项目角色</th>
              <th className={thCls}>关联权限</th>
              <th className={thCls}>加入时间</th>
              <th className={thCls}>操作</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.name} className="hover:bg-slate-50/70">
                <td className={tdCls}>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} />
                    <div>
                      <div className="font-medium text-slate-800 flex items-center gap-1.5">{m.name}
                        {m.active && <span className="text-[10px] text-emerald-600 bg-emerald-50 rounded px-1">我</span>}
                      </div>
                      <div className="text-xs text-slate-400">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className={tdCls}>{m.dept}</td>
                <td className={tdCls}>
                  <div className="flex gap-1.5 flex-wrap">
                    {m.roles.map(r => <Pill key={r} tone={r === '项目经理' ? 'indigo' : 'blue'}>{r}</Pill>)}
                  </div>
                </td>
                <td className={tdCls}>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    {m.roles.includes('项目经理') ? '项目全量权限' : m.roles.some(r => r.includes('负责人')) ? '规格确认 / Gate 决策' : '规格查看 / 任务执行'}
                  </span>
                </td>
                <td className={tdCls}><span className="text-xs text-slate-500">{m.joined}</span></td>
                <td className={tdCls}>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditTarget(m.name)}><PencilLine className="w-3.5 h-3.5 mr-1" />配置角色</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => setRemoveTarget(m.name)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </T>
      </div>

      {/* 添加成员抽屉 */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-[420px]">
          <SheetHeader>
            <SheetTitle>添加项目成员</SheetTitle>
            <SheetDescription>从组织架构中选择人员加入项目</SheetDescription>
          </SheetHeader>
          <div className="mt-4 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input placeholder="搜索姓名 / 部门" className="pl-8" />
          </div>
          <div className="mt-3 space-y-1">
            {orgCandidates.map(m => (
              <label key={m.name} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-slate-50 cursor-pointer">
                <Checkbox checked={picked.includes(m.name)} onCheckedChange={c => setPicked(c ? [...picked, m.name] : picked.filter(x => x !== m.name))} />
                <Avatar name={m.name} size="sm" />
                <span className="text-[13px]">{m.name}</span>
                <span className="text-xs text-slate-400 ml-auto">{m.dept}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setAddOpen(false)}>添加 {picked.length > 0 && `（${picked.length}）`}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 配置角色弹窗 */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>配置角色 · {editTarget}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-2">
            {allRoles.map(r => (
              <label key={r} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-[13px] cursor-pointer hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50">
                <input type="checkbox" defaultChecked={members.find(m => m.name === editTarget)?.roles.includes(r)} className="accent-indigo-600" />{r}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>取消</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setEditTarget(null)}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移除确认 */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除成员 {removeTarget}？</AlertDialogTitle>
            <AlertDialogDescription>移除后该成员将失去项目访问权限，其名下未完成任务将转交项目经理重新分配。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700">确认移除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
