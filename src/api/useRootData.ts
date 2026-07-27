import { useCallback, useEffect, useState } from 'react'
import type { Root } from '@subhajitdas298/test-data-protos'

export function useRootData(fetcher: () => Promise<Root>) {
  const [root, setRoot] = useState<Root | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRoot(await fetcher())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [fetcher])

  useEffect(() => {
    reload()
  }, [reload])

  return { root, loading, error, reload }
}
