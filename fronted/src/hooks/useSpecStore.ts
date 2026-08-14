import { useCallback, useEffect, useState } from 'react'
import { listSpecs } from '@/api/dsh'
import { recordToSpec } from '@/api/spec'
import { specs as mockSpecs, type Spec } from '@/mock/data2'

/**
 * 规格列表数据源：优先读真实 specStore（/api/specStore/list），
 * 后端不可达时回退到 mock 原型数据，保证页面始终可演示。
 * `backend` 标记当前数据来自真实后端（true）、mock（false）还是未知（null）。
 */
export function useSpecStore() {
  const [specs, setSpecs] = useState<Spec[]>(mockSpecs)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [backend, setBackend] = useState<boolean | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const records = await listSpecs()
      setSpecs(records.map(recordToSpec))
      setBackend(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBackend(false)
      setSpecs(mockSpecs)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  return { specs, loading, error, backend, refresh }
}
