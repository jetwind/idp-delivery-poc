import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js/lib/common'
import 'highlight.js/styles/github.css'
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText, FileCode, FileJson, Loader2,
  Eye, Code2, GitCompareArrows, Plus, Trash2, CheckCheck, MessageSquare, AlertTriangle, X,
} from 'lucide-react'
import {
  getFlowFiles, getFlowFile, getAuditFindings, createAuditFinding, deleteAuditFinding, updateAuditFinding, getFileDiff,
  type FlowFile, type AuditFinding, type FileDiff,
} from '@/api/flow'
import { cn } from '@/lib/utils'

interface TreeNode {
  name: string
  path: string
  type: 'dir' | 'file'
  children?: TreeNode[]
  size?: number
}

/** 把扁平的相对路径列表构造成目录树（目录由文件路径推断）。 */
function buildTree(files: FlowFile[]): TreeNode[] {
  const root: TreeNode = { name: '', path: '', type: 'dir', children: [] }
  for (const f of files) {
    const parts = f.path.split('/')
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const isFile = i === parts.length - 1
      const fullPath = parts.slice(0, i + 1).join('/')
      const children = node.children ?? (node.children = [])
      let child = children.find(c => c.name === parts[i] && c.type === (isFile ? 'file' : 'dir'))
      if (!child) {
        child = { name: parts[i], path: fullPath, type: isFile ? 'file' : 'dir', size: isFile ? f.size : undefined }
        if (!isFile) child.children = []
        children.push(child)
      }
      if (!isFile) node = child
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
    for (const n of nodes) if (n.children) sort(n.children)
  }
  sort(root.children ?? [])
  return root.children ?? []
}

const CODE_EXTS = new Set([
  'java', 'js', 'jsx', 'ts', 'tsx', 'vue', 'py', 'sh', 'bash', 'yml', 'yaml',
  'xml', 'html', 'htm', 'css', 'scss', 'sql', 'properties', 'gradle', 'kt',
  'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'diff', 'ini', 'toml', 'makefile',
])

/** 扩展名 → highlight.js 语言 id（.vue 退化为 xml/html 高亮，够用）。 */
const HLJS_LANG: Record<string, string> = {
  java: 'java', js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  vue: 'xml', py: 'python', sh: 'bash', bash: 'bash', yml: 'yaml', yaml: 'yaml',
  xml: 'xml', html: 'xml', htm: 'xml', css: 'css', scss: 'scss', sql: 'sql',
  properties: 'properties', gradle: 'groovy', kt: 'kotlin', go: 'go', rs: 'rust',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', diff: 'diff', ini: 'ini', toml: 'ini',
  makefile: 'makefile', json: 'json', md: 'markdown',
}

type PreviewKind = 'markdown' | 'json' | 'code' | 'text'

function detectKind(path: string): PreviewKind {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'json') return 'json'
  if (CODE_EXTS.has(ext)) return 'code'
  return 'text'
}

function langFor(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return HLJS_LANG[ext] ?? 'plaintext'
}

function highlight(code: string, lang: string): string {
  if (lang && lang !== 'plaintext' && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang }).value
    } catch { /* 高亮失败回退纯文本 */ }
  }
  return hljs.highlightAuto(code).value
}

function tryPrettyJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch { /* 非合法 JSON 时原样展示 */ }
  return content
}

function humanSize(size?: number): string {
  if (size === undefined) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

/** 递归目录树节点（可折叠目录，点击文件选中）。 */
function TreeNodeView({ node, depth, selected, expanded, onToggle, onSelect }: {
  node: TreeNode
  depth: number
  selected: string | null
  expanded: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string) => void
}) {
  const pad = { paddingLeft: `${depth * 14 + 8}px` }
  if (node.type === 'file') {
    const active = selected === node.path
    const ext = node.name.split('.').pop()?.toLowerCase() ?? ''
    const Icon = node.name.endsWith('.json') ? FileJson : CODE_EXTS.has(ext) || node.name.endsWith('.md') ? FileCode : FileText
    return (
      <button onClick={() => onSelect(node.path)} style={pad}
        className={cn('w-full flex items-center gap-1.5 py-1 pr-2 rounded text-left text-xs font-mono truncate',
          active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50')}>
        <Icon className={cn('w-3.5 h-3.5 shrink-0', active ? 'text-indigo-500' : 'text-slate-400')} />
        <span className="truncate">{node.name}</span>
      </button>
    )
  }
  const isOpen = expanded.has(node.path)
  return (
    <div>
      <button onClick={() => onToggle(node.path)} style={pad}
        className="w-full flex items-center gap-1 py-1 pr-2 rounded text-left text-xs text-slate-700 hover:bg-slate-50">
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
        {isOpen ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" /> : <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {isOpen && node.children?.map(c => (
        <TreeNodeView key={c.path} node={c} depth={depth + 1} selected={selected} expanded={expanded} onToggle={onToggle} onSelect={onSelect} />
      ))}
    </div>
  )
}

function MarkdownCode({ className, children }: { className?: string; children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || '')
  const lang = match?.[1]
  if (lang) {
    const code = String(children ?? '').replace(/\n$/, '')
    return <pre className="my-2 overflow-x-auto rounded-lg bg-slate-100 p-3"><code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} /></pre>
  }
  return <code className="px-1.5 py-0.5 rounded bg-slate-100 text-rose-600 font-mono text-[12px]">{children}</code>
}

/** 格式化预览（无标注）：markdown 渲染 / JSON 美化 / 代码高亮 / 纯文本。 */
function FilePreview({ path, content }: { path: string; content: string }) {
  const kind = detectKind(path)
  if (kind === 'markdown') {
    return (
      <div className="markdown-body text-[13px] leading-6 text-slate-700">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: MarkdownCode as never }}>{content}</ReactMarkdown>
      </div>
    )
  }
  if (kind === 'json') {
    const pretty = tryPrettyJson(content)
    return <pre className="text-xs font-mono leading-5"><code dangerouslySetInnerHTML={{ __html: highlight(pretty, 'json') }} /></pre>
  }
  if (kind === 'code') {
    return <pre className="text-xs font-mono leading-5 overflow-x-auto"><code dangerouslySetInnerHTML={{ __html: highlight(content, langFor(path)) }} /></pre>
  }
  return <pre className="text-xs font-mono leading-5 text-slate-700 whitespace-pre-wrap break-words">{content}</pre>
}

/** 源码审阅视图：带行号，点行号添加审计意见；有意见的行高亮。 */
function SourceView({ content, findings, onAnnotate }: {
  content: string
  findings: AuditFinding[]
  onAnnotate: (line: number) => void
}) {
  const lines = content.split('\n')
  const byLine = new Map<number, AuditFinding[]>()
  for (const f of findings) {
    if (f.line == null) continue
    const arr = byLine.get(f.line) ?? []
    arr.push(f)
    byLine.set(f.line, arr)
  }
  return (
    <div className="text-xs font-mono leading-5">
      {lines.map((line, i) => {
        const lineNo = i + 1
        const hits = byLine.get(lineNo) ?? []
        return (
          <div key={i} className={cn('group flex hover:bg-slate-100/70', hits.length > 0 && 'bg-amber-50/60')}>
            <button onClick={() => onAnnotate(lineNo)}
              className="w-11 shrink-0 text-right pr-3 text-slate-300 group-hover:text-indigo-500 select-none"
              title="点击添加审计意见">
              {lineNo}
            </button>
            <span className="flex-1 whitespace-pre-wrap break-words text-slate-700">{line}</span>
            {hits.length > 0 && <span className="shrink-0 pr-1 text-[10px] text-amber-600">{hits.length} 条意见</span>}
          </div>
        )
      })}
    </div>
  )
}

/** 基线 diff 视图（只读）。 */
function DiffView({ diff }: { diff: FileDiff }) {
  if (!diff.has_baseline) {
    return <div className="text-xs text-slate-400 p-4">该版本无基线（首个版本），无法对比。</div>
  }
  if (diff.is_new) {
    return <div className="text-xs text-slate-400 p-4">该文件为相对基线的新增文件，无变更对比。</div>
  }
  if (diff.is_unchanged) {
    return <div className="text-xs text-slate-400 p-4">相对基线 {diff.baseline_name} 无变更。</div>
  }
  return (
    <div className="text-xs font-mono leading-5">
      {diff.diff.map((l, i) => (
        <div key={i} className={cn('flex',
          l.type === 'add' ? 'bg-emerald-50 text-emerald-700' : l.type === 'del' ? 'bg-rose-50 text-rose-600' : 'text-slate-600')}>
          <span className="w-6 shrink-0 text-right pr-2 select-none text-slate-300">{l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '}</span>
          <span className="flex-1 whitespace-pre-wrap break-words">{l.text}</span>
        </div>
      ))}
    </div>
  )
}

export default function WorkspaceFileBrowser({ threadId, versionId, stage }: {
  threadId: string
  versionId: string
  stage?: string
}) {
  const [files, setFiles] = useState<FlowFile[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const knownDirsRef = useRef<Set<string>>(new Set())

  // 视图状态
  const [sourceMode, setSourceMode] = useState(false)
  const [diff, setDiff] = useState<FileDiff | null>(null)
  const [diffMode, setDiffMode] = useState(false)
  const [diffLoading, setDiffLoading] = useState(false)

  // 审计意见（当前阶段）
  const [findings, setFindings] = useState<AuditFinding[]>([])
  const [annotateLine, setAnnotateLine] = useState<number | null>(null)
  const [newComment, setNewComment] = useState('')
  const [newSeverity, setNewSeverity] = useState<'blocking' | 'suggestion'>('suggestion')
  const [findingsBusy, setFindingsBusy] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await getFlowFiles(threadId)
        if (!alive) return
        setFiles(r.files)
        const dirs = new Set<string>()
        for (const f of r.files) {
          const parts = f.path.split('/')
          for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'))
        }
        const fresh: string[] = []
        for (const d of dirs) {
          if (!knownDirsRef.current.has(d)) {
            knownDirsRef.current.add(d)
            fresh.push(d)
          }
        }
        if (fresh.length > 0) {
          setExpanded(prev => {
            const next = new Set(prev)
            for (const d of fresh) next.add(d)
            return next
          })
        }
      } catch { /* 忽略单次失败 */ }
    }
    load()
    const t = setInterval(load, 3000)
    return () => { alive = false; clearInterval(t) }
  }, [threadId])

  const reloadFindings = async () => {
    if (!versionId || !stage) return
    try {
      const r = await getAuditFindings(versionId, stage)
      setFindings(r.findings)
    } catch { /* 忽略单次失败 */ }
  }

  useEffect(() => {
    setFindings([])
    void reloadFindings()
  }, [versionId, stage])

  async function open(path: string) {
    setSelected(path); setLoading(true); setErr(null)
    setDiff(null); setDiffMode(false); setSourceMode(false); setAnnotateLine(null)
    try {
      const r = await getFlowFile(threadId, path)
      setContent(r.content); setTruncated(r.truncated)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e)); setContent('')
    } finally {
      setLoading(false)
    }
  }

  function toggle(path: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  async function loadDiff() {
    if (!selected || !versionId) return
    setDiffLoading(true); setErr(null)
    try {
      const d = await getFileDiff(versionId, selected)
      setDiff(d); setDiffMode(true); setSourceMode(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setDiffLoading(false)
    }
  }

  async function submitFinding() {
    if (!selected || annotateLine == null || !newComment.trim() || !versionId || !stage) return
    setFindingsBusy(true)
    try {
      await createAuditFinding(versionId, { stage, path: selected, line: annotateLine, severity: newSeverity, comment: newComment.trim() })
      await reloadFindings()
      setAnnotateLine(null); setNewComment(''); setNewSeverity('suggestion')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setFindingsBusy(false)
    }
  }

  async function removeFinding(f: AuditFinding) {
    setFindingsBusy(true)
    try {
      await deleteAuditFinding(versionId, f.id)
      await reloadFindings()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setFindingsBusy(false)
    }
  }

  async function toggleResolve(f: AuditFinding) {
    setFindingsBusy(true)
    try {
      await updateAuditFinding(versionId, f.id, { status: f.status === 'open' ? 'resolved' : 'open' })
      await reloadFindings()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setFindingsBusy(false)
    }
  }

  const tree = useMemo(() => buildTree(files), [files])
  const selectedFile = files.find(f => f.path === selected)
  const openFindings = findings.filter(f => f.status === 'open')

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 mb-4">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-[13px] font-semibold text-slate-800">工作区文件</span>
          {files.length > 0 && <span className="text-xs text-slate-400">{files.length} 个文件</span>}
          {stage && openFindings.length > 0 && (
            <span className="text-xs text-amber-600">{openFindings.length} 条未处理意见</span>
          )}
        </div>
      </div>
      <div className="flex min-h-[320px] max-h-[600px]">
        {/* 左：目录树 */}
        <div className="w-[260px] shrink-0 border-r border-slate-100 overflow-y-auto p-2">
          {tree.length === 0 ? (
            <div className="text-xs text-slate-400 px-2 py-2">尚无文件（agent 还未产出）</div>
          ) : (
            tree.map(n => (
              <TreeNodeView key={n.path} node={n} depth={0} selected={selected} expanded={expanded} onToggle={toggle} onSelect={open} />
            ))
          )}
        </div>
        {/* 右：预览 */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-slate-50/50">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 p-4"><Loader2 className="w-4 h-4 animate-spin" />加载中…</div>
          ) : err ? (
            <div className="text-xs text-rose-500 p-4">{err}</div>
          ) : selected ? (
            <div>
              <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur border-b border-slate-100">
                <span className="text-xs font-mono text-slate-600 truncate">{selected}</span>
                {selectedFile && <span className="text-[11px] text-slate-400 shrink-0">{humanSize(selectedFile.size)}</span>}
                {truncated && <span className="text-[11px] text-amber-600 shrink-0">已截断</span>}
                <div className="ml-auto flex items-center gap-1 shrink-0">
                  <button onClick={() => { setSourceMode(s => !s); setDiffMode(false) }}
                    className={cn('inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium border',
                      sourceMode ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50')}>
                    {sourceMode ? <Code2 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {sourceMode ? '源码' : '预览'}
                  </button>
                  <button onClick={loadDiff} disabled={diffLoading}
                    className={cn('inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-medium border',
                      diffMode ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50')}>
                    {diffLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitCompareArrows className="w-3 h-3" />}
                    对比基线
                  </button>
                </div>
              </div>
              {/* 标注表单 */}
              {annotateLine != null && stage && (
                <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-slate-700">在第 {annotateLine} 行添加审计意见（{selected}）</span>
                    <button onClick={() => setAnnotateLine(null)} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex gap-1.5 mb-2">
                    <button onClick={() => setNewSeverity('blocking')}
                      className={cn('h-6 px-2 rounded text-[11px] font-medium border',
                        newSeverity === 'blocking' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'text-slate-500 border-slate-200')}>
                      阻断
                    </button>
                    <button onClick={() => setNewSeverity('suggestion')}
                      className={cn('h-6 px-2 rounded text-[11px] font-medium border',
                        newSeverity === 'suggestion' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'text-slate-500 border-slate-200')}>
                      建议
                    </button>
                  </div>
                  <textarea value={newComment} onChange={e => setNewComment(e.target.value)} rows={2}
                    placeholder="这条意见要 agent 怎么改？"
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  <div className="mt-2 flex justify-end gap-2">
                    <button onClick={() => setAnnotateLine(null)} className="h-7 px-3 rounded text-xs text-slate-500 border border-slate-200">取消</button>
                    <button onClick={submitFinding} disabled={findingsBusy || !newComment.trim()}
                      className="inline-flex items-center gap-1 h-7 px-3 rounded text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50">
                      {findingsBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}添加意见
                    </button>
                  </div>
                </div>
              )}
              <div className="p-4">
                {diffMode && diff ? (
                  <DiffView diff={diff} />
                ) : sourceMode || detectKind(selected) === 'text' ? (
                  <SourceView content={content} findings={findings} onAnnotate={line => stage && setAnnotateLine(line)} />
                ) : (
                  <FilePreview path={selected} content={content} />
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 p-4">点击左侧文件预览内容（支持 markdown / 代码高亮 / JSON 美化 / 基线 diff / 行级审计）</div>
          )}
        </div>
      </div>

      {/* 审计意见面板（当前阶段） */}
      {stage && findings.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span className="text-[13px] font-semibold text-slate-800">审计意见</span>
            <span className="text-xs text-slate-400">{findings.length} 条（{openFindings.length} 未处理）</span>
          </div>
          <div className="space-y-1.5">
            {findings.map(f => (
              <div key={f.id} className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
                f.status === 'resolved' ? 'border-slate-100 opacity-60' : 'border-amber-100 bg-amber-50/40')}>
                {f.severity === 'blocking'
                  ? <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                  : <MessageSquare className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-slate-600">{f.path}{f.line ? ` : ${f.line}` : ''}
                    <span className={cn('ml-2 px-1 rounded', f.severity === 'blocking' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700')}>
                      {f.severity === 'blocking' ? '阻断' : '建议'}
                    </span>
                  </div>
                  <div className="mt-0.5 text-slate-700">{f.comment}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleResolve(f)} title={f.status === 'open' ? '标记已处理' : '重新打开'}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-emerald-600">
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => removeFinding(f)} title="删除"
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
