/**
 * Public request, value, and failure vocabulary for project-delivery spec
 * documents. This module contains types only so generated Remote clients can
 * consume it without importing Host runtime code.
 * @module @deepseek-ai/dsh-spec/types
 */

import type { Branded } from '@deepseek-ai/dsh-brand'

/** Opaque identity of one spec document (caller-chosen, e.g. `p1/requirements`). */
export type SpecId = Branded<'SpecId'>

/** The delivery artifacts Phase 1 produces and hands off between stages. */
export type SpecKind = 'requirements' | 'services' | 'implementation' | 'review'

/** Completion state of one spec section. */
export type SpecSectionStatus = 'complete' | 'partial' | 'missing'

/** Severity of one spec check; blocking gates the next stage. */
export type SpecCheckType = 'blocking' | 'risk' | 'suggestion'

/** Lifecycle state of one spec document. */
export type SpecStatus = 'submitted' | 'approved' | 'rejected'

/** One human-gate decision action. */
export type SpecDecisionAction = 'approved' | 'rejected' | 'revised'

/** One numbered section of a spec document. */
export interface SpecSection {
  readonly id: string
  readonly title: string
  readonly status: SpecSectionStatus
  readonly content: readonly string[]
}

/** One blocking/risk/suggestion finding on a spec. */
export interface SpecCheck {
  readonly type: SpecCheckType
  readonly title: string
  readonly desc: string
  readonly action: string
}

/** One open question awaiting a named human. */
export interface SpecPending {
  readonly q: string
  readonly from: string
  readonly who: string
}

/** One appended human-gate decision; immutable once recorded. */
export interface SpecDecision {
  readonly action: SpecDecisionAction
  readonly who?: string
  readonly comment?: string
  readonly at: number
}

/** Durable shape of one spec document. */
export interface SpecRecord {
  readonly id: SpecId
  readonly kind: SpecKind
  readonly projectId?: string
  readonly title: string
  readonly version: number
  readonly status: SpecStatus
  readonly sections: readonly SpecSection[]
  readonly checks: readonly SpecCheck[]
  readonly pendings: readonly SpecPending[]
  readonly decisions: readonly SpecDecision[]
  readonly createdAt: number
  readonly updatedAt: number
}

/** List specs, optionally restricted to one project. */
export interface SpecListRequest {
  readonly projectId?: string
}

/** Fresh immutable spec snapshots, newest first. */
export interface SpecListValue {
  readonly specs: readonly SpecRecord[]
}

/** Read one spec by id. */
export interface SpecGetRequest {
  readonly specId: SpecId
}

/** Create or replace the content of one spec document. */
export interface SpecPutRequest {
  readonly specId: SpecId
  readonly kind: SpecKind
  readonly title: string
  readonly projectId?: string
  readonly sections?: readonly SpecSection[]
  readonly checks?: readonly SpecCheck[]
  readonly pendings?: readonly SpecPending[]
  /** Observed current version; `0` requires that the spec does not exist yet. */
  readonly ifVersion: number
}

/** Record one human-gate decision on a submitted spec. */
export interface SpecDecideRequest {
  readonly specId: SpecId
  readonly action: SpecDecisionAction
  readonly who?: string
  readonly comment?: string
  /** Observed current version the decision applies to. */
  readonly ifVersion: number
}

/** No spec document exists for the requested id. */
export interface SpecNotFound {
  readonly code: 'spec-not-found'
  readonly specId: SpecId
}

/** A material mutation did not match the addressed spec's current version. */
export interface SpecVersionConflict {
  readonly code: 'version-conflict'
  readonly current: number | null
}

/** Failures shared by the public spec operations. */
export type SpecFailure = SpecNotFound | SpecVersionConflict

/** Successful public operation result. */
export interface SpecSuccess<T> {
  readonly ok: true
  readonly value: T
}

/** Rejected public operation result with a stable business failure. */
export interface SpecRejected<E extends SpecFailure> {
  readonly ok: false
  readonly error: E
}

/** Result returned by the spec `list` operation. */
export type SpecListResult = SpecSuccess<SpecListValue>

/** Result returned by the spec `get` operation. */
export type SpecGetResult = SpecSuccess<SpecRecord> | SpecRejected<SpecNotFound>

/** Result returned by the spec `put` operation. */
export type SpecPutResult = SpecSuccess<SpecRecord> | SpecRejected<SpecVersionConflict>

/** Result returned by the spec `decide` operation. */
export type SpecDecideResult = SpecSuccess<SpecRecord> | SpecRejected<SpecNotFound | SpecVersionConflict>
