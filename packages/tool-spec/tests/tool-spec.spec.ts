import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SpecService from '@deepseek-ai/dsh-spec'
import * as toolSpec from '../src/index.ts'

describe('tool-spec', () => {
  it('registers the four model-facing spec tools over the durable store', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-tool-spec-test-'))
    const ctx = new Context()
    try {
      await ctx.plugin(SystemPrompt)
      await ctx.plugin(ToolRuntime)
      await ctx.plugin(Storage)
      await ctx.plugin(StorageJson, { root })
      await ctx.plugin(StorageDomain, { backend: 'json' })
      await ctx.plugin(SpecService)
      await ctx.plugin(toolSpec)

      expect(ctx.tools.get('spec_list')).toBeDefined()
      expect(ctx.tools.get('spec_read')).toBeDefined()
      expect(ctx.tools.get('spec_save')).toBeDefined()
      expect(ctx.tools.get('spec_decide')).toBeDefined()
    } finally {
      await ctx.fiber.dispose()
      await rm(root, { recursive: true, force: true })
    }
  })
})
