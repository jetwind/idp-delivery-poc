import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'

/* 页面头部 */
export function PageHeader({ title, desc, extra }: { title: string; desc?: string; extra?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {desc && <p className="mt-1 text-[13px] text-slate-500">{desc}</p>}
      </div>
      {extra && <div className="flex items-center gap-2 shrink-0">{extra}</div>}
    </div>
  )
}

/* 区块卡片 */
export function Section({ title, desc, extra, children, className, pad = true }: {
  title?: string; desc?: string; extra?: ReactNode; children: ReactNode; className?: string; pad?: boolean
}) {
  return (
    <div className={cn('bg-white rounded-lg border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)}>
      {(title || extra) && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-800">{title}</h3>
            {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
          </div>
          {extra}
        </div>
      )}
      <div className={cn(pad && 'px-5 pb-5', !title && !extra && 'pt-5')}>{children}</div>
    </div>
  )
}

/* 通用徽章 */
const toneMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  red: 'bg-rose-50 text-rose-600 border-rose-200',
  slate: 'bg-slate-100 text-slate-500 border-slate-200',
  violet: 'bg-violet-50 text-violet-600 border-violet-200',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
}
export function Pill({ tone = 'slate', children, className, dot }: { tone?: keyof typeof toneMap; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 h-[22px] px-2 rounded-md border text-xs font-medium whitespace-nowrap', toneMap[tone], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  )
}

/* AI 标识徽章 */
export function AIPill({ children }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-medium">
      <Sparkles className="w-3 h-3" />{children ?? 'AI'}
    </span>
  )
}

/* 指标卡 */
export function Metric({ label, value, sub, tone = 'default', icon, onClick }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'violet'; icon?: ReactNode; onClick?: () => void
}) {
  const tones = {
    default: 'text-slate-900', blue: 'text-blue-600', green: 'text-emerald-600',
    amber: 'text-amber-600', red: 'text-rose-600', violet: 'text-violet-600',
  }
  return (
    <div onClick={onClick} className={cn('bg-white rounded-lg border border-slate-200/80 px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]', onClick && 'cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all')}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        {icon}
      </div>
      <div className={cn('mt-1.5 text-[22px] leading-7 font-semibold tracking-tight', tones[tone])}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

/* 状态 → 颜色映射 */
export function statusTone(s: string): keyof typeof toneMap {
  if (['进行中', '执行中', '运行中', '编制中', '预发布'].includes(s)) return 'blue'
  if (['已完成', '已确认', '已通过', '成功', '当前生产', '完整', '已同步', '已引用', '已沉淀'].includes(s)) return 'green'
  if (['待确认', '待处理', '暂停', '待补充', '待发布', '待决策', '采纳 AI 建议'].includes(s)) return 'amber'
  if (['初始基线'].includes(s)) return 'indigo'
  if (['失败', '阻断问题', '高', '缺失', '被阻断'].includes(s)) return 'red'
  if (['未开始', '草稿', '历史版本', '未触发'].includes(s)) return 'slate'
  return 'slate'
}

/* 进度条 */
export function Bar({ value, tone = 'bg-indigo-500', className }: { value: number; tone?: string; className?: string }) {
  return (
    <div className={cn('h-1.5 rounded-full bg-slate-100 overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

/* 环形进度（SVG） */
export function Ring({ value, size = 92, stroke = 8, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = value >= 90 ? '#10b981' : value >= 70 ? '#6366f1' : value >= 50 ? '#f59e0b' : '#f43f5e'
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eef2f7" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-semibold text-slate-800 leading-5">{value}</div>
        {label && <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>}
      </div>
    </div>
  )
}

/* 表格通用样式 */
export function T({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-x-auto', className)}><table className="w-full text-[13px]">{children}</table></div>
}
export const thCls = 'text-left text-xs font-medium text-slate-400 px-3 py-2.5 border-b border-slate-100 whitespace-nowrap'
export const tdCls = 'px-3 py-3 border-b border-slate-50 text-slate-700 align-middle'

/* 头像 */
const avatarColors = ['bg-indigo-500', 'bg-cyan-600', 'bg-violet-500', 'bg-emerald-600', 'bg-rose-500', 'bg-amber-600', 'bg-blue-600', 'bg-teal-600', 'bg-fuchsia-600']
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const i = name.charCodeAt(0) % avatarColors.length
  const s = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  return <span className={cn('inline-flex items-center justify-center rounded-full text-white font-medium shrink-0', avatarColors[i], s)}>{name.slice(0, 1)}</span>
}

/* 字段展示 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-[13px] text-slate-800 break-words">{children}</div>
    </div>
  )
}
