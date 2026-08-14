/** Package-owned invariant companion. @module @deepseek-ai/dsh-project-delivery/invariant */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-project-delivery'

/** Cordis companion plugin name. */
export const name = 'project-delivery-invariant'
/** Services required before the companion can reserve and check package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this bundle is a patch-only layer with no runtime
 * API; the inserted rows' own invariants own their durable-authority checks.
 */
const install: InvariantInstaller = Object.assign(() => {}, { inject: [] })

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
