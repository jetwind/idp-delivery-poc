import { useRef, useState } from 'react'
import { Paperclip, Loader2, X } from 'lucide-react'
import { uploadAttachment } from '@/api/flow'
import { cn } from '@/lib/utils'

export interface Attachment {
  name: string
  rel: string
}

/** 把附件相对路径列表拼成「【附件】」块，追加到需求/反馈文本末尾给 agent。 */
export function attachmentBlock(atts: Attachment[]): string {
  if (atts.length === 0) return ''
  return '\n\n【附件】\n' + atts.map(a => `- ${a.rel}`).join('\n')
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error(`读取文件失败：${file.name}`))
    r.readAsDataURL(file)
  })
}

/** 附件选择/上传组件：把文件上传到工作目录 attachments/，向上回传相对路径列表。 */
export default function AttachmentPicker({ cwd, onChange, disabled }: {
  cwd: string
  onChange: (attachments: Attachment[]) => void
  disabled?: boolean
}) {
  const [items, setItems] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true); setErr(null)
    try {
      const next = [...items]
      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file)
        const r = await uploadAttachment(cwd, file.name, base64)
        next.push({ name: r.name, rel: r.rel })
      }
      setItems(next)
      onChange(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  function remove(i: number) {
    const next = items.filter((_, idx) => idx !== i)
    setItems(next)
    onChange(next)
  }

  return (
    <div>
      <input ref={inputRef} type="file" multiple hidden
        onChange={e => { void handleFiles(e.target.files); e.target.value = '' }} />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || uploading || !cwd}
          className={cn('inline-flex items-center gap-1 h-7 px-2.5 rounded text-xs border',
            'text-slate-500 border-slate-200 hover:bg-slate-50', (disabled || !cwd) && 'opacity-50')}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          添加附件
        </button>
        {items.length > 0 && <span className="text-[11px] text-slate-400">{items.length} 个附件</span>}
      </div>
      {err && <div className="mt-1 text-[11px] text-rose-500">{err}</div>}
      {items.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {items.map((it, i) => (
            <div key={it.rel} className="flex items-center gap-1.5 text-xs">
              <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-slate-600 truncate">{it.name}</span>
              <button type="button" onClick={() => remove(i)} className="ml-auto text-slate-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
