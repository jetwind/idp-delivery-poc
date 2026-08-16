import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js/lib/common'
import 'highlight.js/styles/github.css'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, FileCode, FileJson, Loader2 } from 'lucide-react'
import { getFlowFiles, getFlowFile, type FlowFile } from '@/api/flow'
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
    const Icon = node.name.endsWith('.json') ? FileJson : CODE_EXTS.has(node.name.split('.').pop()?.toLowerCase() ?? '') || node.name.endsWith('.md') ? FileCode : FileText
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

/** 右侧格式化预览：markdown 渲染 / JSON 美化 / 代码高亮 / 纯文本带行号。 */
function FilePreview({ path, content }: { path: string; content: string }) {
  const kind = detectKind(path)
  if (kind === 'markdown') {
    return (
      <div className="markdown-body text-[13px] leading-6 text-slate-700">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{ code: MarkdownCode as never }}
        >{content}</ReactMarkdown>
      </div>
    )
  }
  if (kind === 'json') {
    const pretty = tryPrettyJson(content)
    return (
      <pre className="text-xs font-mono leading-5"><code dangerouslySetInnerHTML={{ __html: highlight(pretty, 'json') }} /></pre>
    )
  }
  if (kind === 'code') {
    return (
      <pre className="text-xs font-mono leading-5 overflow-x-auto"><code dangerouslySetInnerHTML={{ __html: highlight(content, langFor(path)) }} /></pre>
    )
  }
  // 纯文本：带行号。
  const lines = content.split('\n')
  return (
    <div className="text-xs font-mono leading-5">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="w-10 shrink-0 text-right pr-3 text-slate-300 select-none">{i + 1}</span>
          <span className="flex-1 whitespace-pre-wrap break-words text-slate-700">{line}</span>
        </div>
      ))}
    </div>
  )
}

export default function WorkspaceFileBrowser({ threadId }: { threadId: string }) {
  const [files, setFiles] = useState<FlowFile[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [truncated, setTruncated] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await getFlowFiles(threadId)
        if (!alive) return
        setFiles(r.files)
        setExpanded(prev => {
          const next = new Set(prev)
          for (const f of r.files) {
            const parts = f.path.split('/')
            for (let i = 1; i < parts.length; i++) next.add(parts.slice(0, i).join('/'))
          }
          return next
        })
      } catch { /* 忽略单次失败 */ }
    }
    load()
    const t = setInterval(load, 3000)
    return () => { alive = false; clearInterval(t) }
  }, [threadId])

  async function open(path: string) {
    setSelected(path); setLoading(true); setErr(null)
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

  const tree = useMemo(() => buildTree(files), [files])
  const selectedFile = files.find(f => f.path === selected)

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 mb-4">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <span className="text-[13px] font-semibold text-slate-800">工作区文件</span>
          {files.length > 0 && <span className="text-xs text-slate-400">{files.length} 个文件</span>}
        </div>
      </div>
      <div className="flex min-h-[320px] max-h-[560px]">
        {/* 左：目录树 */}
        <div className="w-[280px] shrink-0 border-r border-slate-100 overflow-y-auto p-2">
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
              <div className="sticky top-0 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur border-b border-slate-100">
                <span className="text-xs font-mono text-slate-600 truncate">{selected}</span>
                {selectedFile && <span className="text-[11px] text-slate-400 shrink-0">{humanSize(selectedFile.size)}</span>}
                {truncated && <span className="text-[11px] text-amber-600 shrink-0">已截断</span>}
                {detectKind(selected) !== 'text' && detectKind(selected) !== 'markdown' && (
                  <span className="ml-auto text-[11px] font-mono text-indigo-500 shrink-0">{langFor(selected)}</span>
                )}
              </div>
              <div className="p-4">
                <FilePreview path={selected} content={content} />
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 p-4">点击左侧文件预览内容（支持 markdown / 代码高亮 / JSON 美化）</div>
          )}
        </div>
      </div>
    </div>
  )
}
