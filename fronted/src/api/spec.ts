/**
 * specStore 后端数据 → 前端展示模型的映射层。
 *
 * 后端 SpecRecord 用英文枚举（status/section/check/decision），前端原型用中文枚举，
 * 这里做一一互转，并把 version(数字) → `V{n}`、updatedAt(毫秒) → 展示时间。
 * 后端没有的展示辅助字段（owner/evalScore）用合理默认值补齐：
 *   - owner 取最近一条门禁决策的 who，否则 '—'；
 *   - evalScore 后端无此概念，置 0（Evaluation 由前端另行呈现）。
 */

import type { Spec, SpecStatus } from '@/mock/data2'
import type { SpecData } from '@/mock/specs'
import type { ServiceAsset } from '@/mock/data'
import type {
  SpecCheckType, SpecDecisionAction, SpecRecord, SpecSection, SpecSectionStatus, SpecStatus as RSpecStatus,
} from './dsh'

export const specStatusLabel: Record<RSpecStatus, SpecStatus> = {
  submitted: '待确认',
  approved: '已确认',
  rejected: '待确认',
}

export const sectionStatusLabel: Record<SpecSectionStatus, '完整' | '待补充' | '缺失'> = {
  complete: '完整',
  partial: '待补充',
  missing: '缺失',
}

export const checkTypeLabel: Record<SpecCheckType, '阻断问题' | '风险问题' | '优化建议'> = {
  blocking: '阻断问题',
  risk: '风险问题',
  suggestion: '优化建议',
}

export const decisionActionLabel: Record<SpecDecisionAction, string> = {
  approved: '确认通过',
  rejected: '退回',
  revised: '修改后通过',
}

/** 毫秒时间戳 → `YYYY-MM-DD HH:mm`，0 表示空。 */
export function formatTime(ts: number): string {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function ownerOf(record: SpecRecord): string {
  return record.decisions.at(-1)?.who ?? '—'
}

function completenessOf(record: SpecRecord): number {
  if (record.sections.length === 0) return 0
  const done = record.sections.filter(s => s.status === 'complete').length
  return Math.round((done / record.sections.length) * 100)
}

function gateOf(record: SpecRecord): '已通过' | '待确认' | '未触发' {
  if (record.status === 'approved') return '已通过'
  if (record.status === 'rejected') return '待确认'
  return record.decisions.length > 0 ? '待确认' : '未触发'
}

/** SpecRecord → 规格列表行（Spec）。 */
export function recordToSpec(record: SpecRecord): Spec {
  return {
    id: record.id,
    name: record.title,
    version: record.version > 0 ? `V${record.version}` : '—',
    status: specStatusLabel[record.status],
    completeness: completenessOf(record),
    gate: gateOf(record),
    updated: formatTime(record.updatedAt),
    owner: ownerOf(record),
    summary: record.sections[0]?.content[0] ?? record.sections[0]?.title ?? '',
  }
}

/** SpecRecord → 规格详情（SpecData）。 */
export function recordToSpecData(record: SpecRecord): SpecData {
  return {
    id: record.id,
    name: record.title,
    version: record.version > 0 ? `V${record.version}` : '—',
    status: specStatusLabel[record.status],
    owner: ownerOf(record),
    updated: formatTime(record.updatedAt),
    evalScore: 0,
    gate: gateOf(record),
    sections: record.sections.map(s => ({
      id: s.id, title: s.title, status: sectionStatusLabel[s.status], content: [...s.content],
    })),
    checks: record.checks.map(c => ({
      type: checkTypeLabel[c.type], title: c.title, desc: c.desc, action: c.action,
    })),
    pendings: record.pendings.map(p => ({ q: p.q, from: p.from, who: p.who })),
  }
}

// ---- 服务关联（services 规格）的 section 映射 ----
// services 规格（kind=services）用每个 section 表示一个已关联服务：
//   id = 服务名，title = 中文名，content 顺序约定 [role, version, owner, repo, branch]。

/** ServiceAsset → services 规格的一个 section。 */
export function serviceToSection(svc: ServiceAsset): SpecSection {
  return {
    id: svc.name,
    title: svc.cnName,
    status: 'complete',
    content: [svc.role, svc.version, svc.owner, svc.repo, svc.branch],
  }
}

/** services 规格的一个 section → ServiceAsset。 */
export function sectionToService(section: SpecSection): ServiceAsset {
  const [role = '直接复用', version = '—', owner = '—', repo = '—', branch = '—'] = section.content
  return {
    name: section.id,
    cnName: section.title,
    role: (['新建', '核心改造', '接口适配', '直接复用'] as const).includes(role as never) ? role as ServiceAsset['role'] : '直接复用',
    version,
    owner,
    repo,
    branch,
  }
}
