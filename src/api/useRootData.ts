import { useCallback, useEffect, useState } from 'react'
import type { Root } from '@subhajitdas298/test-data-protos'
import type { FetchResult } from './dataClient'

export interface RequestStats {
  elapsedMs: number
  bytes: number
}

export function useRootData(fetcher: () => Promise<FetchResult>) {
  const [root, setRoot] = useState<Root | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<RequestStats | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { root, elapsedMs, bytes } = await fetcher()
      setRoot(root)
      setStats({ elapsedMs, bytes })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    reload()
  }, [reload])

  return { root, loading, error, stats, reload }
}
