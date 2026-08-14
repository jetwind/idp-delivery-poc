/**
 * Durable storage-domain declaration for project-delivery spec documents.
 * @module @deepseek-ai/dsh-spec/src/spec
 */

import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type {
  SpecCheckType,
  SpecDecisionAction,
  SpecId,
  SpecKind,
  SpecSectionStatus,
  SpecStatus,
} from './types.ts'

const nonNegativeSafeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)

/** Spec id schema at the durable boundary; branding has no runtime representation. */
const specId = z.string().min(1).transform(value => value as SpecId)

/** Runtime schema for the closed spec-kind vocabulary. */
export const specKindSchema = z.union([
  z.literal('requirements'),
  z.literal('services'),
  z.literal('implementation'),
  z.literal('review'),
]) satisfies z.ZodType<SpecKind>

/** Runtime schema for one section's completion state. */
const specSectionStatusSchema = z.union([
  z.literal('complete'),
  z.literal('partial'),
  z.literal('missing'),
]) satisfies z.ZodType<SpecSectionStatus>

/** Runtime schema for one check severity. */
const specCheckTypeSchema = z.union([
  z.literal('blocking'),
  z.literal('risk'),
  z.literal('suggestion'),
]) satisfies z.ZodType<SpecCheckType>

/** Runtime schema for one spec lifecycle status. */
const specStatusSchema = z.union([
  z.literal('submitted'),
  z.literal('approved'),
  z.literal('rejected'),
]) satisfies z.ZodType<SpecStatus>

/** Runtime schema for one human-gate decision action. */
const specDecisionActionSchema = z.union([
  z.literal('approved'),
  z.literal('rejected'),
  z.literal('revised'),
]) satisfies z.ZodType<SpecDecisionAction>

/** Runtime schema for one section. */
export const specSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: specSectionStatusSchema,
  content: z.array(z.string()),
})

/** Runtime schema for one check. */
export const specCheckSchema = z.object({
  type: specCheckTypeSchema,
  title: z.string().min(1),
  desc: z.string(),
  action: z.string(),
})

/** Runtime schema for one pending question. */
export const specPendingSchema = z.object({
  q: z.string().min(1),
  from: z.string(),
  who: z.string().min(1),
})

/** Runtime schema for one appended decision. */
export const specDecisionSchema = z.object({
  action: specDecisionActionSchema,
  who: z.string().optional(),
  comment: z.string().optional(),
  at: nonNegativeSafeInteger,
})

/** Runtime schema for one stored spec record. */
export const specRecordSchema = z.object({
  id: specId,
  kind: specKindSchema,
  projectId: z.string().min(1).optional(),
  title: z.string().min(1),
  version: z.number().int().min(1),
  status: specStatusSchema,
  sections: z.array(specSectionSchema),
  checks: z.array(specCheckSchema),
  pendings: z.array(specPendingSchema),
  decisions: z.array(specDecisionSchema),
  createdAt: nonNegativeSafeInteger,
  updatedAt: nonNegativeSafeInteger,
}).refine(record => record.updatedAt >= record.createdAt, {
  path: ['updatedAt'],
  message: 'spec updatedAt must not precede createdAt',
})

/** Durable spec record inferred from {@link specRecordSchema}. */
export type SpecRecordShape = z.infer<typeof specRecordSchema>

/** One spec document record per id. */
export const specDomainSpec = defineDomain({
  name: 'spec',
  version: 0,
  tables: {
    specs: domainTable<SpecId, SpecRecordShape>(specRecordSchema),
  },
})
