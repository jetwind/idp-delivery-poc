import { useEffect, useState } from 'react'
import { deleteStandard, getStandardsTree, readStandard, writeStandard, getStagesSchema, setStageSchema, type StandardsStage, type StageSchemaInfo } from '@/api/flow'
import { PageHeader, Pill } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { FileText, Plus, Save, Trash2, Folder, RefreshCw, Loader2, Braces } from 'lucide-react'

export default function StandardsManagePage() {
  const [stages, setStages] = useState<StandardsStage[]>([])
  const [stage, setStage] = useState('')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [msgTone, setMsgTone] = useState<'ok' | 'err'>('ok')
  const [newName, setNewName] = useState('')
  const [newStage, setNewStage] = useState('')
  const [schemas, setSchemas] = useState<StageSchemaInfo[]>([])
  const [schemaStage, setSchemaStage] = useState('')
  const [schemaText, setSchemaText] = useState('')
  const [schemaDirty, setSchemaDirty] = useState(false)

  async function loadTree() {
    try {
      const r = await getStandardsTree()
      setStages(r.stages)
      if (!newStage && r.stages.length > 0) setNewStage(r.stages[0].stage)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e)); setMsgTone('err')
    }
  }

  async function loadSchemas() {
    try {
      const r = await getStagesSchema()
      setSchemas(r.schemas)
      if (!schemaStage && r.schemas.length > 0) setSchemaStage(r.schemas[0].stage)
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'err')
    }
  }

  async function openSchema(st: string) {
    const s = schemas.find(x => x.stage === st)
    if (!s) return
    setSchemaStage(st)
    setSchemaText(JSON.stringify(s.schema, null, 2))
    setSchemaDirty(false)
  }

  async function saveSchema() {
    if (!schemaStage || !schemaText.trim()) return
    setBusy(true); setMsg(null)
    try {
      const parsed = JSON.parse(schemaText)
      await setStageSchema(schemaStage, parsed)
      setSchemaDirty(false)
      show(`已保存 ${schemaStage} 的产物 Schema`)
      await loadSchemas()
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'err')
    } finally { setBusy(false) }
  }

  useEffect(() => { void loadTree(); void loadSchemas() }, [])

  function show(text: string, tone: 'ok' | 'err' = 'ok') { setMsg(text); setMsgTone(tone) }

  async function openFile(st: string, nm: string) {
    setBusy(true); setMsg(null)
    try {
      const r = await readStandard(st, nm)
      setStage(st); setName(nm); setContent(r.content); setDirty(false)
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'err')
    } finally { setBusy(false) }
  }

  async function save() {
    if (!stage || !name) return
    setBusy(true); setMsg(null)
    try {
      await writeStandard(stage, name, content)
      setDirty(false); show(`已保存 ${stage}/${name}`)
      await loadTree()
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'err')
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!stage || !name) return
    if (!window.confirm(`删除标准文件 ${stage}/${name}？`)) return
    setBusy(true); setMsg(null)
    try {
      await deleteStandard(stage, name)
      setStage(''); setName(''); setContent(''); setDirty(false)
      show(`已删除 ${stage}/${name}`)
      await loadTree()
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'err')
    } finally { setBusy(false) }
  }

  async function create() {
    const s = newStage
    const raw = newName.trim()
    if (!s || !raw) { show('请选择阶段并填写文件名', 'err'); return }
    const nm = raw.endsWith('.md') ? raw : raw + '.md'
    setBusy(true); setMsg(null)
    try {
      await writeStandard(s, nm, '')
      setNewName(''); show(`已创建 ${s}/${nm}`)
      await loadTree()
      setStage(s); setName(nm); setContent(''); setDirty(false)
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), 'err')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <PageHeader
        title="标准与规范维护"
        desc="维护各阶段的标准/领域知识文件；保存后经 MCP 实时提供给 harness agent（下次查询即生效）"
        extra={<Button variant="outline" size="sm" onClick={() => { void loadTree(); show('已刷新') }}><RefreshCw className="w-3.5 h-3.5 mr-1" />刷新</Button>}
      />

      {msg && (
        <div className={cn('mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
          msgTone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-600')}>
          {msg}
        </div>
      )}

      <Tabs defaultValue="docs">
        <TabsList className="bg-transparent border-b border-slate-100 rounded-none w-full justify-start h-10 p-0 gap-6 mb-4">
          <TabsTrigger value="docs" className="rounded-none h-10 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]">标准文档</TabsTrigger>
          <TabsTrigger value="schema" className="rounded-none h-10 px-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 text-slate-500 text-[13px]">产物 Schema</TabsTrigger>
        </TabsList>

        <TabsContent value="docs">
      <div className="flex gap-4 items-start">
        {/* 左侧：阶段文件树 + 新建 */}
        <div className="w-[280px] shrink-0 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200/80">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <Folder className="w-4 h-4 text-slate-500" />
              <span className="text-[13px] font-semibold text-slate-800">阶段标准</span>
            </div>
            <div className="p-2 max-h-[420px] overflow-y-auto">
              {stages.map(s => (
                <div key={s.stage} className="mb-1">
                  <div className="px-2 py-1 text-[11px] font-semibold text-slate-500">{s.name}（{s.files.length}）</div>
                  {s.files.length === 0 && <div className="px-4 py-1 text-xs text-slate-400">暂无文件</div>}
                  {s.files.map(f => {
                    const active = stage === s.stage && name === f
                    return (
                      <button key={f} onClick={() => openFile(s.stage, f)}
                        className={cn('w-full text-left px-4 py-1 rounded text-xs font-mono truncate block',
                          active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50')}>
                        {f}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* 新建文件 */}
          <div className="bg-white rounded-lg border border-slate-200/80 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-indigo-500" />
              <span className="text-[13px] font-semibold text-slate-800">新建标准文件</span>
            </div>
            <select value={newStage} onChange={e => setNewStage(e.target.value)}
              className="w-full h-8 mb-2 rounded-md border border-slate-200 px-2 text-xs bg-white">
              {stages.map(s => <option key={s.stage} value={s.stage}>{s.name}</option>)}
            </select>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="文件名（如 my-standard.md）"
              className="w-full h-8 mb-2 rounded-md border border-slate-200 px-2 text-xs font-mono" />
            <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={busy} onClick={create}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              创建
            </Button>
          </div>
        </div>

        {/* 右侧：编辑器 */}
        <div className="flex-1 min-w-0 bg-white rounded-lg border border-slate-200/80">
          {stage && name ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <Pill tone="violet">{stage}</Pill>
                  <span className="text-[13px] font-mono text-slate-700 truncate">{name}</span>
                  {dirty && <span className="text-xs text-amber-500">未保存</span>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy || !dirty} onClick={save}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                    保存
                  </Button>
                  <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" disabled={busy} onClick={remove}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />删除
                  </Button>
                </div>
              </div>
              <Textarea
                value={content}
                onChange={e => { setContent(e.target.value); setDirty(true) }}
                className="min-h-[460px] border-0 rounded-none font-mono text-[13px] leading-6 focus-visible:ring-0 resize-none"
                placeholder="# 标准标题&#10;&#10;在这里编辑 Markdown 标准内容…"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-[420px] text-sm text-slate-400">
              从左侧选择标准文件查看/编辑，或在左下角新建
            </div>
          )}
        </div>
      </div>
        </TabsContent>

        {/* 产物 Schema 配置 */}
        <TabsContent value="schema">
          <div className="flex gap-4 items-start">
            <div className="w-[280px] shrink-0 bg-white rounded-lg border border-slate-200/80">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                <Braces className="w-4 h-4 text-indigo-500" />
                <span className="text-[13px] font-semibold text-slate-800">阶段产物 Schema</span>
              </div>
              <div className="p-2">
                {schemas.map(s => {
                  const active = schemaStage === s.stage
                  return (
                    <button key={s.stage} onClick={() => openSchema(s.stage)}
                      className={cn('w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between',
                        active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50')}>
                      <span>{s.title}</span>
                      <span className="text-[10px] text-slate-400">{s.required.length} 必填</span>
                    </button>
                  )
                })}
              </div>
              <p className="px-4 pb-3 text-[11px] text-slate-400">结构化产物约定：agent 按 schema 产出 JSON，图侧 jsonschema 校验。</p>
            </div>
            <div className="flex-1 min-w-0 bg-white rounded-lg border border-slate-200/80">
              {schemaStage ? (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Braces className="w-4 h-4 text-slate-500" />
                      <span className="text-[13px] font-mono text-slate-700">{schemaStage} 的 JSON Schema</span>
                      {schemaDirty && <span className="text-xs text-amber-500">未保存</span>}
                    </div>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy || !schemaDirty} onClick={saveSchema}>
                      {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                      保存 Schema
                    </Button>
                  </div>
                  <Textarea
                    value={schemaText}
                    onChange={e => { setSchemaText(e.target.value); setSchemaDirty(true) }}
                    className="min-h-[460px] border-0 rounded-none font-mono text-[12.5px] leading-5 focus-visible:ring-0 resize-none"
                    placeholder='{"type":"object","required":[...],"properties":{...}}'
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-[420px] text-sm text-slate-400">从左侧选择阶段查看/编辑 Schema</div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
