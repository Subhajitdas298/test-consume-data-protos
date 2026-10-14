import { useCallback, useRef, useState } from 'react'
import type { Root } from '@subhajitdas298/test-data-protos'
import type { FetchResult, Progress, ProgressHandler } from './dataClient'

export interface RequestStats {
  elapsedMs: number
  bytes: number
}

interface State {
  // The fetcher the data belongs to: data from a different one (e.g. the other backend)
  // is never exposed.
  fetcher: unknown
  root: Root | null
  loading: boolean
  error: string | null
  progress: Progress | null
  stats: RequestStats | null
}

// Nothing is fetched until `load` is called, and a response that arrives after a newer
// request (or after the fetcher changed) is ignored.
export function useRootData(fetcher: (onProgress: ProgressHandler, size?: number) => Promise<FetchResult>) {
  const [state, setState] = useState<State>({
    fetcher,
    root: null,
    loading: false,
    error: null,
    progress: null,
    stats: null,
  })
  const latest = useRef(0)

  const load = useCallback(
    async (size?: number) => {
      const id = ++latest.current
      const update = (patch: Partial<State>) => {
        if (id === latest.current) setState((prev) => ({ ...prev, ...patch, fetcher }))
      }
      setState({ fetcher, root: null, loading: true, error: null, progress: null, stats: null })
      try {
        const { root, elapsedMs, bytes } = await fetcher((progress) => update({ progress }), size)
        update({ root, stats: { elapsedMs, bytes }, loading: false })
      } catch (err) {
        update({ error: err instanceof Error ? err.message : String(err), loading: false })
      }
    },
    [fetcher],
  )

  const current = state.fetcher === fetcher
  return {
    root: current ? state.root : null,
    loading: current && state.loading,
    error: current ? state.error : null,
    progress: current ? state.progress : null,
    stats: current ? state.stats : null,
    load,
  }
}
