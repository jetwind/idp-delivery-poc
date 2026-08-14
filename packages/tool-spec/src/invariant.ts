/** Package-owned invariant companion. @module @deepseek-ai/dsh-tool-spec/invariant */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-tool-spec'

/** Cordis companion plugin name. */
export const name = 'tool-spec-invariant'
/** Services required before the companion can reserve and check package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this package only registers model-facing tools over
 * the host `specStore` service; the store's own invariant and domain schema
 * own the durable-authority checks.
 */
const install: InvariantInstaller = Object.assign(() => {}, { inject: ['tools'] })

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
