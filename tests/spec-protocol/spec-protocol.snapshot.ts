import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { launchWebScaffold, type WebScaffold } from './scaffold.ts'

const OVERLAY = fileURLToPath(new URL('./spec-protocol.overlay.yml', import.meta.url))

interface WireResponse {
  readonly result: { readonly ok: boolean; readonly value: { readonly ok: boolean; readonly value: Record<string, unknown> } }
}

describe('spec store Host Remote protocol', () => {
  let scaffold: WebScaffold

  beforeAll(async () => {
    scaffold = await launchWebScaffold({ extraOverlayPath: OVERLAY })
  })

  afterAll(async () => {
    await scaffold?.close()
  })

  it('round-trips list, put, get, and decide through the shipped Web Host', async () => {
    const invoke = async (endpoint: string, request: unknown): Promise<WireResponse> => {
      const response = await fetch(`${scaffold.baseUrl}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'client-request',
          rpcId: crypto.randomUUID(),
          method: endpoint,
          payload: { args: { request } },
        }),
      })
      expect(response.status).toBe(200)
      return await response.json() as WireResponse
    }

    const put = await invoke('specStore/put', {
      specId: 'p1/requirements',
      kind: 'requirements',
      title: '需求规格',
      projectId: 'p1',
      sections: [{ id: 's1', title: '1. 目标', status: 'complete', content: ['目标 A'] }],
      checks: [],
      pendings: [],
      ifVersion: 0,
    })
    expect(put.result.ok).toBe(true)
    expect(put.result.value.ok).toBe(true)
    expect(put.result.value.value['version']).toBe(1)
    expect(put.result.value.value['status']).toBe('submitted')

    const got = await invoke('specStore/get', { specId: 'p1/requirements' })
    expect(got.result.value.value['title']).toBe('需求规格')

    const listed = await invoke('specStore/list', { projectId: 'p1' })
    expect(listed.result.value.ok).toBe(true)
    expect(listed.result.value.value['specs']).toHaveLength(1)

    const decided = await invoke('specStore/decide', {
      specId: 'p1/requirements',
      action: 'approved',
      who: '李婉清',
      ifVersion: 1,
    })
    expect(decided.result.value.value['status']).toBe('approved')
    expect(decided.result.value.value['version']).toBe(2)
    expect(decided.result.value.value['decisions']).toHaveLength(1)
  })
})
