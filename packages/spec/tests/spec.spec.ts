import { describe, expect, it } from 'vitest'
import { SpecId } from '../src/index.ts'
import type { SpecPutRequest } from '../src/types.ts'
import { setupHarness } from './helpers.ts'

function putRequest(specId: string, overrides: Partial<SpecPutRequest> = {}): SpecPutRequest {
  return {
    specId: SpecId(specId),
    kind: 'requirements',
    title: '需求规格',
    projectId: 'p1',
    ifVersion: 0,
    sections: [{ id: 's1', title: '1. 目标', status: 'complete', content: ['目标 A'] }],
    checks: [{ type: 'blocking', title: '缺验收', desc: '未定义验收', action: 'AI 生成建议稿' }],
    pendings: [{ q: '退货回滚？', from: '需求文档', who: '产品负责人' }],
    ...overrides,
  }
}

describe('spec store', () => {
  it('creates, reads, and lists a spec', async () => {
    const { ctx, dispose } = await setupHarness()
    try {
      const put = await ctx.specStore.put(putRequest('p1/requirements'))
      expect(put.ok).toBe(true)
      if (!put.ok) return
      expect(put.value.version).toBe(1)
      expect(put.value.status).toBe('submitted')
      expect(put.value.sections[0]?.status).toBe('complete')

      const got = await ctx.specStore.get({ specId: SpecId('p1/requirements') })
      expect(got.ok).toBe(true)
      if (got.ok) expect(got.value.title).toBe('需求规格')

      const listed = ctx.specStore.list({ projectId: 'p1' })
      expect(listed.ok).toBe(true)
      if (listed.ok) expect(listed.value.specs.map(spec => spec.id)).toEqual([SpecId('p1/requirements')])
    } finally {
      await dispose()
    }
  })

  it('rejects a stale version and unknown ids', async () => {
    const { ctx, dispose } = await setupHarness()
    try {
      const created = await ctx.specStore.put(putRequest('p1/review'))
      expect(created.ok).toBe(true)

      const conflict = await ctx.specStore.put(putRequest('p1/review', { title: '评审', ifVersion: 99 }))
      expect(conflict.ok).toBe(false)
      if (!conflict.ok) expect(conflict.error.code).toBe('version-conflict')

      const missing = await ctx.specStore.get({ specId: SpecId('nope') })
      expect(missing.ok).toBe(false)
      if (!missing.ok) expect(missing.error.code).toBe('spec-not-found')
    } finally {
      await dispose()
    }
  })

  it('appends an immutable decision and transitions the status', async () => {
    const { ctx, dispose } = await setupHarness()
    try {
      await ctx.specStore.put(putRequest('p1/requirements'))
      const decided = await ctx.specStore.decide({
        specId: SpecId('p1/requirements'),
        action: 'approved',
        who: '李婉清',
        comment: '验收补充后通过',
        ifVersion: 1,
      })
      expect(decided.ok).toBe(true)
      if (!decided.ok) return
      expect(decided.value.status).toBe('approved')
      expect(decided.value.version).toBe(2)
      expect(decided.value.decisions).toHaveLength(1)
      expect(decided.value.decisions[0]?.action).toBe('approved')

      // A subsequent content write preserves the decision log and resets to
      // submitted for the next gate.
      const replaced = await ctx.specStore.put(putRequest('p1/requirements', {
        ifVersion: 2,
        sections: [{ id: 's1', title: '1. 目标', status: 'complete', content: ['目标 B'] }],
      }))
      expect(replaced.ok).toBe(true)
      if (!replaced.ok) return
      expect(replaced.value.version).toBe(3)
      expect(replaced.value.status).toBe('submitted')
      expect(replaced.value.decisions).toHaveLength(1)
    } finally {
      await dispose()
    }
  })
})
