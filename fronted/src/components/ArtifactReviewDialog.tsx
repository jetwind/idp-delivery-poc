import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  getFlowFile, getStagesSchema, getAuditFindings, createAuditFinding,
  type AuditFinding,
} from '@/api/flow'
import JsonArtifactView from '@/components/JsonArtifactView'
import InlineAnnotationForm from '@/components/InlineAnnotationForm'

/** 阶段产物 JSON 文件路径 → 阶段 id（与 WorkspaceFileBrowser 一致）。 */
const JSON_ARTIFACT_STAGE: Record<string, string> = {
  'specs/requirements.json': 'requirements',
  'docs/design.json': 'design',
  'specs/tasks.json': 'tasks',
  'specs/implementation.json': 'coding',
  'docs/test-report.json': 'testing',
}

/** gate 处点击某产物文件后弹出的预览+审计对话框。 */
export default function ArtifactReviewDialog({ open, onClose, threadId, versionId, stage, path }: {
  open: boolean
  onClose: () => void
  threadId: string
  versionId: string
  stage: string
  path: string | null
}) {
  const [content, setContent] = useState('')
  const [schema, setSchema] = useState<Record<string, unknown> | null>(null)
  const [findings, setFindings] = useState<AuditFinding[]>([])
  const [loading, setLoading] = useState(false)
  const [annotate, setAnnotate] = useState<{ ref?: string; line?: number; label: string } | null>(null)
  const [comment, setComment] = useState('')
  const [severity, setSeverity] = useState<'blocking' | 'suggestion'>('suggestion')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !path) return
    let alive = true
    setLoading(true); setAnnotate(null); setComment(''); setContent(''); setSchema(null)
    ;(async () => {
      try {
        const [file, schemas, fd] = await Promise.all([
          getFlowFile(threadId, path),
          getStagesSchema(),
          getAuditFindings(versionId, stage),
        ])
        if (!alive) return
        setContent(file.content)
        const s = schemas.schemas.find(x => x.stage === JSON_ARTIFACT_STAGE[path])
        setSchema(s ? (s.schema as Record<string, unknown>) : null)
        setFindings(fd.findings)
      } catch { /* 忽略单次失败 */ } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [open, path, threadId, versionId, stage])

  const isArtifact = !!path && !!JSON_ARTIFACT_STAGE[path]
  let parsedJson: Record<string, unknown> | null = null
  if (isArtifact) {
    try { parsedJson = JSON.parse(content) } catch { parsedJson = null }
  }

  async function submit() {
    if (!path || !comment.trim()) return
    setBusy(true)
    try {
      await createAuditFinding(versionId, {
        stage, path, line: annotate?.line ?? null, ref: annotate?.ref ?? null,
        severity, comment: comment.trim(),
      })
      const fd = await getAuditFindings(versionId, stage)
      setFindings(fd.findings)
      setAnnotate(null); setComment(''); setSeverity('suggestion')
    } catch { /* 忽略 */ } finally {
      setBusy(false)
    }
  }

  function renderForm(key: string) {
    if (!annotate) return null
    const active = annotate.ref === key || (annotate.line !== undefined && String(annotate.line) === key)
    if (!active) return null
    return (
      <InlineAnnotationForm
        label={annotate.label}
        severity={severity}
        onSeverity={setSeverity}
        comment={comment}
        onComment={setComment}
        busy={busy}
        onSubmit={submit}
        onCancel={() => setAnnotate(null)}
      />
    )
  }

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent className="w-[94vw] max-w-[1200px] sm:max-w-[1200px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-sm">{path ?? ''}</SheetTitle>
          <SheetDescription>预览并标注审计意见（JSON 产物为结构化模板）</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-6"><Loader2 className="w-4 h-4 animate-spin" />加载中…</div>
          ) : isArtifact && schema && parsedJson ? (
            <JsonArtifactView json={parsedJson} schema={schema} findings={findings}
              onAnnotate={(ref, label) => setAnnotate({ ref, label })}
              renderForm={renderForm} />
          ) : path?.endsWith('.md') ? (
            <div className="markdown-body text-[13px] leading-6 text-slate-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <pre className="text-xs font-mono leading-5 text-slate-700 whitespace-pre-wrap break-words">{content}</pre>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
