import { Loader2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 就地审计标注弹框：渲染在被标注元素/行的正下方。 */
export default function InlineAnnotationForm({ label, severity, onSeverity, comment, onComment, busy, onSubmit, onCancel }: {
  label: string
  severity: 'blocking' | 'suggestion'
  onSeverity: (s: 'blocking' | 'suggestion') => void
  comment: string
  onComment: (s: string) => void
  busy: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="my-1.5 rounded-lg border border-amber-200 bg-amber-50/80 p-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[11px] font-medium text-slate-700">{label}</span>
        <button onClick={onCancel} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="flex gap-1 mb-1.5">
        <button onClick={() => onSeverity('blocking')}
          className={cn('h-6 px-2 rounded text-[11px] font-medium border',
            severity === 'blocking' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'text-slate-500 border-slate-200')}>
          阻断
        </button>
        <button onClick={() => onSeverity('suggestion')}
          className={cn('h-6 px-2 rounded text-[11px] font-medium border',
            severity === 'suggestion' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'text-slate-500 border-slate-200')}>
          建议
        </button>
      </div>
      <textarea autoFocus value={comment} onChange={e => onComment(e.target.value)} rows={2}
        placeholder="这条意见要 agent 怎么改？"
        className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
      <div className="mt-1.5 flex justify-end gap-2">
        <button onClick={onCancel} className="h-7 px-3 rounded text-xs text-slate-500 border border-slate-200">取消</button>
        <button onClick={onSubmit} disabled={busy || !comment.trim()}
          className="inline-flex items-center gap-1 h-7 px-3 rounded text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}添加意见
        </button>
      </div>
    </div>
  )
}
