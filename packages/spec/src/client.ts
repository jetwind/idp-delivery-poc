/**
 * Client-side mount of the specStore Remote contract. Self-hosted so the spec
 * package exposes its Remote to the Web client without depending on dsh's
 * `api-remotes` assembly; `dsh.client` discovery picks this up because the
 * `spec-store` Loader entry names this package.
 * @module @deepseek-ai/dsh-spec/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type { TypertClientRemote } from '@deepseek-ai/dsh-typert-protocol'

declare module '@deepseek-ai/cordis' {
  interface Context {
    remote: TypertClientRemote
  }
}

/** Services required before the client Remote mount. */
export const inject = ['remote']

/**
 * Mount the spec Remote namespace on the client's typed Remote service. The
 * Remote descriptor is a build artifact (`./remote`), imported dynamically so
 * this module type-checks before tsdown emits it.
 * @param ctx - Client Cordis root carrying the typed API service.
 * @returns disposer that unmounts the namespace.
 */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const specRemote = await import('@deepseek-ai/dsh-spec/remote') as { default: Parameters<TypertClientRemote['$mount']>[0] }
  const dispose = await ctx.remote.$mount(specRemote.default)
  return async () => { await dispose() }
}
