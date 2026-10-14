import { lazy, Suspense, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { fetchBuckets, type BucketsResult } from '../api/dataClient'
import Page from '../components/Page'
import { BACKENDS } from '../context/backends'
import { useDataSource } from '../context/useDataSource'

// Plotly is ~1.5 MB, so it only loads when the charts are first shown.
const BucketChart = lazy(() => import('../components/BucketChart'))

// The payload is a few hundred bytes, so unlike the big datasets it loads on its own
// (and again whenever the backend is switched).
export default function ScoreDistribution() {
  const { backend } = useDataSource()
  const baseUrl = BACKENDS[backend].baseUrl
  const [result, setResult] = useState<{ baseUrl: string; data: BucketsResult } | null>(null)
  const [failure, setFailure] = useState<{ baseUrl: string; message: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [reloads, setReloads] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchBuckets(baseUrl).then(
      (data) => {
        if (cancelled) return
        setResult({ baseUrl, data })
        setFailure(null)
        setRefreshing(false)
      },
      (err: unknown) => {
        if (cancelled) return
        setFailure({ baseUrl, message: err instanceof Error ? err.message : String(err) })
        setRefreshing(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [baseUrl, reloads])

  // Anything from another backend is not shown.
  const data = result?.baseUrl === baseUrl ? result.data : null
  const error = failure?.baseUrl === baseUrl ? failure.message : null
  const loading = refreshing || (!data && !error)

  return (
    <Page title="Score distribution" showBack>
      <Typography color="text.secondary" sx={{ mb: { xs: 1, sm: 2 } }}>
        Source: {BACKENDS[backend].label} ({baseUrl}/api/buckets)
      </Typography>

      <Stack
        direction="row"
        spacing={{ xs: 1, sm: 2 }}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap', mb: { xs: 2, sm: 3 } }}
      >
        <Button
          variant="contained"
          onClick={() => {
            setRefreshing(true)
            setReloads((n) => n + 1)
          }}
          disabled={loading}
        >
          Refresh data
        </Button>
        {loading && <CircularProgress size={24} />}
        {!loading && data && (
          <Typography variant="body2" color="text.secondary">
            {(data.elapsedMs / 1000).toFixed(2)}s &bull; {(data.bytes / 1024).toFixed(2)} KB
          </Typography>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load data: {error}
        </Alert>
      )}

      {data && (
        <>
          <Typography sx={{ mb: { xs: 1, sm: 2 } }}>
            Transactions per fraud-model score, over scores 0 to 1000. A (shaded steps): 10 expected
            counts, 100 scores each. B (bars): 100 observed counts, 10 scores each. The right axis is the
            left one divided by ten, so a bar above the step is above its expected value.
          </Typography>
          <Suspense fallback={<CircularProgress sx={{ display: 'block', mx: 'auto', my: 8 }} />}>
            <BucketChart coarse={data.a} fine={data.b} />
          </Suspense>
        </>
      )}
    </Page>
  )
}
