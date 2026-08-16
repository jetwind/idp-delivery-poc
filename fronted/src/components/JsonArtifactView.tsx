import { type AuditFinding } from '@/api/flow'
import { cn } from '@/lib/utils'
import { Flag } from 'lucide-react'

/** 阶段产物 JSON 字段名 → 中文标签（渲染预览模板用）。 */
const LABELS: Record<string, string> = {
  title: '标题', background: '背景与目标', userStories: '用户故事',
  role: '角色', want: '期望', value: '价值', priority: '优先级',
  functionalRequirements: '功能需求', id: 'ID', description: '描述', acceptanceCriteria: '验收标准',
  nonFunctional: '非功能需求', outOfScope: '范围外',
  businessDesign: '业务设计', architecture: '架构设计', modules: '模块设计',
  name: '名称', responsibility: '职责', interfaces: '接口', dataStructures: '数据结构', dependencies: '依赖',
  serviceAttribution: '服务归属', service: '服务', type: '类型', stack: '技术栈',
  services: '服务清单', tasks: '任务列表', taskRings: '任务环',
  changes: '改动点', taskId: '任务ID', verification: '验证方式',
  buildCommand: '构建命令', testCommand: '测试命令',
  summary: '测试结论', unitTest: '单元测试', command: '命令', total: '总数', passed: '通过', failed: '失败',
  interfaceTest: '接口测试', e2eTest: 'E2E 测试', defects: '缺陷清单', risks: '风险',
}

/** 枚举值 → 中文。 */
const ENUM_LABEL: Record<string, string> = {
  must: 'Must', should: 'Should', could: 'Could', wont: "Won't",
  new: '新建', upgrade: '升级',
  high: '高', medium: '中', low: '低',
}

function primitiveText(value: unknown, schema: Record<string, unknown>): string {
  if (value === undefined || value === null) return '—'
  if (schema?.enum) return ENUM_LABEL[String(value)] ?? String(value)
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

function hitCount(findings: AuditFinding[], ref: string): number {
  return findings.filter(f => f.ref === ref).length
}

/** 每个可标注元素右侧的「标记」按钮（hover 显示，已有意见时常显）。 */
function AnnotateButton({ ref, label, findings, onAnnotate }: {
  ref: string
  label: string
  findings: AuditFinding[]
  onAnnotate: (ref: string, label: string) => void
}) {
  const n = hitCount(findings, ref)
  return (
    <button onClick={e => { e.stopPropagation(); onAnnotate(ref, label) }}
      className={cn('inline-flex items-center gap-0.5 h-5 px-1.5 rounded text-[10px] border shrink-0 transition-opacity',
        n > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'opacity-0 group-hover:opacity-100 text-slate-400 border-slate-200 hover:bg-slate-50')}
      title="标记审计意见">
      <Flag className="w-3 h-3" />{n > 0 ? n : ''}
    </button>
  )
}

function JsonNode({ label, value, schema, path, findings, onAnnotate, depth }: {
  label: string
  value: unknown
  schema: Record<string, unknown>
  path: string
  findings: AuditFinding[]
  onAnnotate: (ref: string, label: string) => void
  depth: number
}) {
  const type = schema?.type as string | undefined
  const hits = hitCount(findings, path)

  if (type === 'array') {
    const itemSchema = (schema.items || {}) as Record<string, unknown>
    const itemType = itemSchema.type as string | undefined
    const items = Array.isArray(value) ? value : []
    return (
      <section className={cn('mb-3', depth > 0 && 'ml-2')}>
        <div className={cn('group flex items-center gap-1.5 mb-1', hits > 0 && 'bg-amber-50/40 rounded px-1 -mx-1')}>
          <span className="text-[12px] font-semibold text-slate-700">{label}</span>
          <span className="text-[11px] text-slate-400">{items.length} 项</span>
          <AnnotateButton ref={path} label={label} findings={findings} onAnnotate={onAnnotate} />
        </div>
        {items.length === 0 && <div className="text-[11px] text-slate-400 ml-2">（空）</div>}
        {itemType === 'object' ? (
          items.map((item, i) => {
            const itemPath = `${path}[${i}]`
            const props = (itemSchema.properties || {}) as Record<string, unknown>
            return (
              <div key={i} className="group mb-1.5 rounded-lg border border-slate-100 bg-white p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-indigo-500">#{i + 1}</span>
                  <AnnotateButton ref={itemPath} label={`${label} #${i + 1}`} findings={findings} onAnnotate={onAnnotate} />
                </div>
                {Object.entries(props).map(([k, sub]) => (
                  <JsonNode key={k} label={LABELS[k] ?? k} value={(item as Record<string, unknown>)?.[k]}
                    schema={sub as Record<string, unknown>} path={`${itemPath}.${k}`}
                    findings={findings} onAnnotate={onAnnotate} depth={depth + 1} />
                ))}
              </div>
            )
          })
        ) : (
          items.map((item, i) => {
            const itemPath = `${path}[${i}]`
            return (
              <div key={i} className={cn('group flex items-start gap-1.5 py-0.5 rounded px-1', hitCount(findings, itemPath) > 0 && 'bg-amber-50/40')}>
                <span className="text-slate-300 text-[11px] w-4 shrink-0">{i + 1}.</span>
                <span className="flex-1 text-slate-700 whitespace-pre-wrap break-words">{primitiveText(item, itemSchema)}</span>
                <AnnotateButton ref={itemPath} label={`${label}[${i}]`} findings={findings} onAnnotate={onAnnotate} />
              </div>
            )
          })
        )}
      </section>
    )
  }

  if (type === 'object') {
    const props = (schema.properties || {}) as Record<string, unknown>
    return (
      <section className={cn('mb-3', depth > 0 && 'ml-2')}>
        <div className={cn('group flex items-center gap-1.5 mb-1', hits > 0 && 'bg-amber-50/40 rounded px-1 -mx-1')}>
          <span className="text-[12px] font-semibold text-slate-700">{label}</span>
          <AnnotateButton ref={path} label={label} findings={findings} onAnnotate={onAnnotate} />
        </div>
        {Object.entries(props).map(([k, sub]) => (
          <JsonNode key={k} label={LABELS[k] ?? k} value={(value as Record<string, unknown>)?.[k]}
            schema={sub as Record<string, unknown>} path={`${path}.${k}`}
            findings={findings} onAnnotate={onAnnotate} depth={depth + 1} />
        ))}
      </section>
    )
  }

  // 基础类型（string / number / boolean）
  return (
    <div className={cn('group flex items-start gap-1.5 py-0.5 rounded px-1', hits > 0 && 'bg-amber-50/40')}>
      <span className="text-slate-400 text-[11px] w-16 shrink-0">{label}</span>
      <span className="flex-1 text-slate-700 whitespace-pre-wrap break-words">{primitiveText(value, schema)}</span>
      <AnnotateButton ref={path} label={label} findings={findings} onAnnotate={onAnnotate} />
    </div>
  )
}

/** 阶段产物 JSON 的预览模板：按 schema 渲染，每个元素可点「标记」挂审计意见。 */
export default function JsonArtifactView({ json, schema, findings, onAnnotate }: {
  json: Record<string, unknown>
  schema: Record<string, unknown>
  findings: AuditFinding[]
  onAnnotate: (ref: string, label: string) => void
}) {
  const props = (schema.properties || {}) as Record<string, unknown>
  return (
    <div className="text-[13px] leading-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-1 pb-1.5 border-b border-slate-100">{String(schema.title ?? '')}</h3>
      {Object.entries(props).map(([k, sub]) => (
        <JsonNode key={k} label={LABELS[k] ?? k} value={json?.[k]}
          schema={sub as Record<string, unknown>} path={k}
          findings={findings} onAnnotate={onAnnotate} depth={0} />
      ))}
    </div>
  )
}
