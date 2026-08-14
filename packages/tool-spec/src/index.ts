/**
 * Model-facing project-delivery spec tools over the durable spec store. The
 * tools resolve the host `specStore` service through `ctx.get`, so they mount
 * in a stage preset's scope layer and let an agent read and write the same
 * structured, decision-audited documents the Web GUI drives over the Remote
 * contract.
 * @module @deepseek-ai/dsh-tool-spec
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { SpecId } from '@deepseek-ai/dsh-spec'
import type {
  SpecCheck,
  SpecKind,
  SpecPending,
  SpecSection,
  SpecService,
} from '@deepseek-ai/dsh-spec'

export const name = 'tool-spec'
export const inject = ['tools']

/** Text output shared by every spec tool: canonical value is a compact JSON string. */
const TEXT_OUTPUT = {
  schema: { type: 'string' as const },
  render: (_args: unknown, value: string) => [{ type: 'text' as const, text: value }],
}

const SECTION_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    id: { type: 'string' as const, required: true as const },
    title: { type: 'string' as const, required: true as const },
    status: { type: 'string' as const, required: true as const, description: 'complete | partial | missing' },
    content: { type: 'array' as const, required: true as const, items: { type: 'string' as const } },
  },
}

const CHECK_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    type: { type: 'string' as const, required: true as const, description: 'blocking | risk | suggestion' },
    title: { type: 'string' as const, required: true as const },
    desc: { type: 'string' as const, required: true as const },
    action: { type: 'string' as const, required: true as const },
  },
}

const PENDING_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    q: { type: 'string' as const, required: true as const },
    from: { type: 'string' as const, required: true as const },
    who: { type: 'string' as const, required: true as const },
  },
}

/** Resolve the host spec store or fail a broken composition loudly. */
function requireStore(ctx: Context): SpecService {
  const store = ctx.get('specStore')
  if (store === undefined) throw new Error('tool-spec: specStore service is not composed')
  return store
}

/** Stringify one spec result so every branch reads as stable text. */
function stringify(value: unknown): string {
  return JSON.stringify(value)
}

/** Register the four model-facing spec tools. */
export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'spec_list',
    description: 'List project-delivery spec documents (requirements/services/implementation/review), newest first.',
    parameters: {
      projectId: { type: 'string', description: 'Optional project id to restrict the listing.' },
    },
    output: TEXT_OUTPUT,
    isConcurrencySafe: () => true,
    execute: async args => stringify(requireStore(ctx).list({
      ...(args.projectId === undefined ? {} : { projectId: args.projectId }),
    })),
  }))

  ctx.tools.register(defineTool({
    name: 'spec_read',
    description: 'Read one project-delivery spec document by id, including its sections, checks, pendings, and decision log.',
    parameters: {
      specId: { type: 'string', required: true, description: 'Spec id, e.g. p1/requirements.' },
    },
    output: TEXT_OUTPUT,
    isConcurrencySafe: () => true,
    execute: async args => stringify(requireStore(ctx).get({ specId: SpecId(args.specId) })),
  }))

  ctx.tools.register(defineTool({
    name: 'spec_save',
    description: 'Create or replace one spec document, resetting it to submitted for the next human gate. The tool resolves the current version, so callers never pass ifVersion.',
    parameters: {
      specId: { type: 'string', required: true, description: 'Spec id, e.g. p1/requirements.' },
      kind: { type: 'string', required: true, description: 'requirements | services | implementation | review' },
      title: { type: 'string', required: true },
      projectId: { type: 'string', description: 'Optional owning project id.' },
      sections: { type: 'array', items: SECTION_SCHEMA, description: 'Numbered sections with complete/partial/missing status.' },
      checks: { type: 'array', items: CHECK_SCHEMA, description: 'blocking/risk/suggestion findings.' },
      pendings: { type: 'array', items: PENDING_SCHEMA, description: 'Open questions awaiting a named human.' },
    },
    output: TEXT_OUTPUT,
    execute: async (args) => {
      const store = requireStore(ctx)
      const current = store.get({ specId: SpecId(args.specId) })
      const currentVersion = current.ok ? current.value.version : 0
      const result = await store.put({
        specId: SpecId(args.specId),
        kind: args.kind as SpecKind,
        title: args.title,
        ...(args.projectId === undefined ? {} : { projectId: args.projectId }),
        sections: args.sections as unknown as SpecSection[],
        checks: args.checks as unknown as SpecCheck[],
        pendings: args.pendings as unknown as SpecPending[],
        ifVersion: currentVersion,
      })
      return stringify(result)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'spec_decide',
    description: 'Record one human-gate decision (approved/rejected/revised) on a spec and transition its status. The tool resolves the current version.',
    parameters: {
      specId: { type: 'string', required: true, description: 'Spec id, e.g. p1/requirements.' },
      action: { type: 'string', required: true, description: 'approved | rejected | revised' },
      comment: { type: 'string', description: 'Optional decision note.' },
    },
    output: TEXT_OUTPUT,
    execute: async (args) => {
      const store = requireStore(ctx)
      const current = store.get({ specId: SpecId(args.specId) })
      if (!current.ok) return stringify(current)
      const result = await store.decide({
        specId: SpecId(args.specId),
        action: args.action as 'approved' | 'rejected' | 'revised',
        ...(args.comment === undefined ? {} : { comment: args.comment }),
        ifVersion: current.value.version,
      })
      return stringify(result)
    },
  }))
}
