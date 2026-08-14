/**
 * Durable, versioned project-delivery spec documents with an auditable
 * human-gate decision log. The Remote-decorated methods are the wire contract
 * the Web GUI drives over the api-proxy; the storage-domain form is the
 * durable data face.
 * @module @deepseek-ai/dsh-spec
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { specDomainSpec } from './spec.ts'
import type { SpecRecordShape } from './spec.ts'
import type {
  SpecDecideRequest,
  SpecDecideResult,
  SpecFailure,
  SpecGetRequest,
  SpecGetResult,
  SpecId as SpecIdBrand,
  SpecListRequest,
  SpecListResult,
  SpecListValue,
  SpecNotFound,
  SpecPutRequest,
  SpecPutResult,
  SpecRejected,
  SpecRecord,
  SpecSuccess,
  SpecVersionConflict,
} from './types.ts'

export type {
  SpecCheck,
  SpecCheckType,
  SpecDecideRequest,
  SpecDecideResult,
  SpecDecision,
  SpecDecisionAction,
  SpecFailure,
  SpecGetRequest,
  SpecGetResult,
  SpecKind,
  SpecListRequest,
  SpecListResult,
  SpecListValue,
  SpecNotFound,
  SpecPending,
  SpecPutRequest,
  SpecPutResult,
  SpecRejected,
  SpecRecord,
  SpecSection,
  SpecSectionStatus,
  SpecStatus,
  SpecSuccess,
  SpecVersionConflict,
} from './types.ts'

/** Identifies one spec document (see `src/types.ts` for the brand rationale). */
export type SpecId = SpecIdBrand

/** Brand a string as a {@link SpecId}. */
export function SpecId(id: string): SpecId {
  return id as SpecId
}

export {
  specDomainSpec,
  specCheckSchema,
  specDecisionSchema,
  specKindSchema,
  specPendingSchema,
  specRecordSchema,
  specSectionSchema,
} from './spec.ts'
export type { SpecRecordShape } from './spec.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    specStore: SpecService
  }
}

/** Build a frozen success branch. */
function success<T>(value: T): SpecSuccess<T> {
  return Object.freeze({ ok: true, value })
}

/** Build a frozen business-failure branch. */
function rejected<E extends SpecFailure>(error: E): SpecRejected<E> {
  return Object.freeze({ ok: false, error: Object.freeze(error) })
}

/** Deep-freeze one section, translating the durable shape to the public one. */
function snapshotSection(section: SpecRecordShape['sections'][number]): SpecRecord['sections'][number] {
  return Object.freeze({
    id: section.id,
    title: section.title,
    status: section.status,
    content: Object.freeze([...section.content]),
  })
}

/** Deep-freeze one check. */
function snapshotCheck(check: SpecRecordShape['checks'][number]): SpecRecord['checks'][number] {
  return Object.freeze({ ...check })
}

/** Deep-freeze one pending question. */
function snapshotPending(pending: SpecRecordShape['pendings'][number]): SpecRecord['pendings'][number] {
  return Object.freeze({ ...pending })
}

/** Deep-freeze one decision, omitting absent optional fields. */
function snapshotDecision(decision: SpecRecordShape['decisions'][number]): SpecRecord['decisions'][number] {
  return Object.freeze({
    action: decision.action,
    ...(decision.who === undefined ? {} : { who: decision.who }),
    ...(decision.comment === undefined ? {} : { comment: decision.comment }),
    at: decision.at,
  })
}

/** Copy and deep-freeze one stored record before it crosses the boundary. */
function snapshotRecord(record: SpecRecordShape): SpecRecord {
  return Object.freeze({
    id: record.id,
    kind: record.kind,
    ...(record.projectId === undefined ? {} : { projectId: record.projectId }),
    title: record.title,
    version: record.version,
    status: record.status,
    sections: Object.freeze(record.sections.map(snapshotSection)),
    checks: Object.freeze(record.checks.map(snapshotCheck)),
    pendings: Object.freeze(record.pendings.map(snapshotPending)),
    decisions: Object.freeze(record.decisions.map(snapshotDecision)),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}

/** Whether a supplied id names a decisionable action. */
function statusAfter(action: SpecRecord['decisions'][number]['action']): SpecRecord['status'] {
  switch (action) {
    case 'approved': return 'approved'
    case 'rejected': return 'rejected'
    case 'revised': return 'submitted'
  }
}

/** Return the authoritative current version needed to reconcile one conflict. */
function versionConflict(current: number | null): SpecVersionConflict {
  return { code: 'version-conflict', current }
}

/**
 * Storage-domain spec store. It never creates or resumes an Agent or Session;
 * spec documents are project-scoped durable records, and the decision log is
 * append-only per record.
 */
export class SpecService extends TypertRemoteService {
  static inject = ['storageDomain']

  private table?: KvTable<SpecRecord['id'], SpecRecordShape>
  private mutationAdmissionOpen = true

  /**
   * @param ctx - Host context carrying the storage-domain form.
   */
  constructor(ctx: Context) {
    super(ctx, 'specStore')
  }

  /** Open and own the one spec domain. */
  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(specDomainSpec)
    this.ctx.effect(() => async () => {
      this.mutationAdmissionOpen = false
      await domain.close()
    }, 'spec.domainClose')
    this.table = domain.table('specs')
  }

  /**
   * List spec documents, optionally restricted to one project, newest first.
   * @param request - optional project filter.
   * @returns fresh immutable spec snapshots.
   */
  @Remote('list')
  list(request: SpecListRequest): SpecListResult {
    const table = this.requireTable()
    const specs = [...table.entries()]
      .filter(([, record]) => request.projectId === undefined || record.projectId === request.projectId)
      .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
      .map(([, record]) => snapshotRecord(record))
    const value: SpecListValue = Object.freeze({ specs: Object.freeze(specs) })
    return success(value)
  }

  /**
   * Read one spec by id.
   * @param request - target spec id.
   * @returns the current spec, or `spec-not-found`.
   */
  @Remote('get')
  get(request: SpecGetRequest): SpecGetResult {
    const record = this.requireTable().get(request.specId)
    if (record === undefined) {
      return rejected<SpecNotFound>({ code: 'spec-not-found', specId: request.specId })
    }
    return success(snapshotRecord(record))
  }

  /**
   * Create or replace one spec document's content. A new id requires
   * `ifVersion: 0`; an existing id requires the observed current version.
   * Every material write bumps the version and resets the spec to
   * `submitted` for the next gate.
   * @param request - identity, content, and observed version.
   * @returns the committed spec or an explicit version conflict.
   */
  @Remote('put')
  put(request: SpecPutRequest): Promise<SpecPutResult> {
    return this.enqueue(async () => {
      const table = this.requireTable()
      const current = table.get(request.specId)
      if (request.ifVersion !== (current?.version ?? 0)) {
        return rejected(versionConflict(current?.version ?? null))
      }

      const now = Date.now()
      const record: SpecRecordShape = {
        id: request.specId,
        kind: request.kind,
        ...(request.projectId === undefined ? {} : { projectId: request.projectId }),
        title: request.title,
        version: current === undefined ? 1 : current.version + 1,
        status: 'submitted',
        sections: request.sections === undefined ? [] : request.sections.map(section => ({
          id: section.id,
          title: section.title,
          status: section.status,
          content: [...section.content],
        })),
        checks: request.checks === undefined ? [] : [...request.checks],
        pendings: request.pendings === undefined ? [] : [...request.pendings],
        decisions: current?.decisions === undefined ? [] : [...current.decisions],
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      }
      await table.put(request.specId, record)
      return success(snapshotRecord(record))
    })
  }

  /**
   * Append one human-gate decision to a spec and transition its status.
   * Decisions are immutable once recorded; the version bump makes the
   * decision a compare-and-set on the exact spec revision it judged.
   * @param request - target, action, optional actor/comment, and observed version.
   * @returns the updated spec or an explicit failure.
   */
  @Remote('decide')
  decide(request: SpecDecideRequest): Promise<SpecDecideResult> {
    return this.enqueue(async () => {
      const table = this.requireTable()
      const current = table.get(request.specId)
      if (current === undefined) {
        return rejected<SpecNotFound>({ code: 'spec-not-found', specId: request.specId })
      }
      if (request.ifVersion !== current.version) {
        return rejected(versionConflict(current.version))
      }

      const now = Date.now()
      const decision: SpecRecordShape['decisions'][number] = {
        action: request.action,
        ...(request.who === undefined ? {} : { who: request.who }),
        ...(request.comment === undefined ? {} : { comment: request.comment }),
        at: now,
      }
      const record: SpecRecordShape = {
        ...current,
        status: statusAfter(request.action),
        decisions: [...current.decisions, decision],
        version: current.version + 1,
        updatedAt: now,
      }
      await table.put(request.specId, record)
      return success(snapshotRecord(record))
    })
  }

  /** Queue a complete read/compare/write mutation behind the prior mutation. */
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.mutationAdmissionOpen) {
      return Promise.reject(new Error('spec: service is disposing'))
    }
    return operation()
  }

  /** Resolve the initialized durable table or fail a broken service lifecycle. */
  private requireTable(): KvTable<SpecRecord['id'], SpecRecordShape> {
    if (this.table === undefined) {
      throw new Error('spec: durable domain is not initialized')
    }
    return this.table
  }
}

export default SpecService
