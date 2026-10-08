import { useCallback, useRef, useState } from 'react'
import type { Root } from '@subhajitdas298/test-data-protos'
import type { FetchResult, Progress, ProgressHandler } from './dataClient'

export interface RequestStats {
  elapsedMs: number
  bytes: number
}

// Nothing is fetched until `load` is called. Data from a different fetcher (e.g. the other
// backend) is dropped, and a response that arrives after a newer request is ignored.
export function useRootData(fetcher: (onProgress: ProgressHandler, size?: number) => Promise<FetchResult>) {
  const [root, setRoot] = useState<Root | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [stats, setStats] = useState<RequestStats | null>(null)
  const latest = useRef(0)

  const [prevFetcher, setPrevFetcher] = useState(() => fetcher)
  if (prevFetcher !== fetcher) {
    latest.current++
    setPrevFetcher(() => fetcher)
    setRoot(null)
    setStats(null)
    setError(null)
    setProgress(null)
    setLoading(false)
  }

  const load = useCallback(
    async (size?: number) => {
      const id = ++latest.current
      setLoading(true)
      setError(null)
      setProgress(null)
      try {
        const { root, elapsedMs, bytes } = await fetcher((p) => {
          if (id === latest.current) setProgress(p)
        }, size)
        if (id !== latest.current) return
        setRoot(root)
        setStats({ elapsedMs, bytes })
      } catch (err) {
        if (id !== latest.current) return
        setError(err instanceof Error ? err.message : String(err))
        setStats(null)
      } finally {
        if (id === latest.current) setLoading(false)
      }
    },
    [fetcher],
  )

  return { root, loading, error, stats, progress, load }
}
