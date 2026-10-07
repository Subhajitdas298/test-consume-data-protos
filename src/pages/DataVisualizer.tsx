import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type { DateRecord } from '@subhajitdas298/test-data-protos'

import { useRootData } from '../api/useRootData'
import type { FetchResult, ProgressHandler } from '../api/dataClient'
import Page from '../components/Page'
import { BACKENDS } from '../context/backends'
import { useDataSource } from '../context/useDataSource'

type Field = Exclude<keyof DateRecord, '$typeName' | '$unknown'>

const FIELDS = 'abcdefghijklmnopqrstuvwxyz'.split('') as Field[]

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1)

// Each library is ~1 MB, so it only loads when its chart is first rendered.
const EChart = lazy(() => import('../components/EChart'))
const PlotlyChart = lazy(() => import('../components/PlotlyChart'))

type Mode = 'echarts-webgl' | 'echarts-canvas' | 'plotly-webgl'

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'echarts-webgl', label: 'ECharts WebGL' },
  { mode: 'echarts-canvas', label: 'ECharts Canvas' },
  { mode: 'plotly-webgl', label: 'Plotly WebGL' },
]

const SLICES = [
  { count: 10_000_000, label: '10M' },
  { count: 1_000_000, label: '1M' },
  { count: 100_000, label: '100k' },
  { count: 10_000, label: '10k' },
]

let chartRuns = 0

export default function DataVisualizer({
  title,
  fetchFn,
}: {
  title: string
  fetchFn: (baseUrl: string, onProgress?: ProgressHandler) => Promise<FetchResult>
}) {
  const { backend } = useDataSource()
  const baseUrl = BACKENDS[backend].baseUrl
  const fetcher = useCallback((onProgress: ProgressHandler) => fetchFn(baseUrl, onProgress), [fetchFn, baseUrl])

  const { root, loading, error, stats, progress, reload } = useRootData(fetcher)
  const [day, setDay] = useState(0)
  const [field, setField] = useState<Field>('a')

  const [sliceCount, setSliceCount] = useState(SLICES[0].count)
  const [renderer, setRenderer] = useState<Mode>('echarts-webgl')
  // The chart is only mounted on demand. It is keyed per click and tied to the exact
  // values array it was started with, so a toggle, day/field change or reload
  // unmounts it (disposing the ECharts instance) instead of updating it.
  const [shown, setShown] = useState<{ id: number; renderer: Mode; values: number[] } | null>(null)

  const days = useMemo(() => root?.data.flatMap((entry) => entry.dates) ?? [], [root])

  const values = useMemo(() => days[day]?.[field] ?? [], [days, day, field])

  // The backends only populate some of the 26 proto fields (JSON omits the empty
  // ones entirely), so only offer those.
  const fields = useMemo(
    () => FIELDS.filter((f) => !days[day] || (days[day][f]?.length ?? 0) > 0),
    [days, day],
  )

  // Only the first N points are plotted; the full series is kept as-is when it's no longer.
  const sliced = useMemo(
    () => (values.length > sliceCount ? values.slice(0, sliceCount) : values),
    [values, sliceCount],
  )

  if (shown && (shown.values !== sliced || loading)) setShown(null)

  return (
    <Page title={title} showBack>
      <Typography color="text.secondary" sx={{ mb: { xs: 1, sm: 2 } }}>
        Source: {BACKENDS[backend].label} ({baseUrl})
      </Typography>

      <Stack
        direction="row"
        spacing={{ xs: 1, sm: 2 }}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap', mb: { xs: 2, sm: 3 } }}
      >
        <Button variant="contained" onClick={reload} disabled={loading}>
          Refresh data
        </Button>
        {loading && (
          <Box sx={{ flex: '1 1 160px', minWidth: 160, maxWidth: 360 }}>
            <LinearProgress
              variant={progress?.total ? 'determinate' : 'indeterminate'}
              value={progress?.total ? Math.min(100, (progress.received / progress.total) * 100) : 0}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary">
              {progress && progress.received > 0
                ? `${mb(progress.received)}${progress.total ? ` / ${mb(progress.total)}` : ''} MB`
                : 'Waiting for server…'}
            </Typography>
          </Box>
        )}
        {!loading && stats && (
          <Typography variant="body2" color="text.secondary">
            {(stats.elapsedMs / 1000).toFixed(2)}s &bull; {(stats.bytes / (1024 * 1024)).toFixed(2)} MB
          </Typography>
        )}

        <FormControl size="small" sx={{ minWidth: 100 }} disabled={days.length === 0}>
          <InputLabel id="day-label">Day</InputLabel>
          <Select
            labelId="day-label"
            label="Day"
            value={day}
            onChange={(e: SelectChangeEvent<number>) => setDay(Number(e.target.value))}
          >
            {days.map((_, index) => (
              <MenuItem key={index} value={index}>
                Day {index}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 100 }} disabled={days.length === 0}>
          <InputLabel id="field-label">Field</InputLabel>
          <Select
            labelId="field-label"
            label="Field"
            value={field}
            onChange={(e: SelectChangeEvent) => setField(e.target.value as Field)}
          >
            {fields.map((f) => (
              <MenuItem key={f} value={f}>
                {f}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load data: {error}
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={{ xs: 1, sm: 2 }}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap', mb: { xs: 2, sm: 3 } }}
      >
        <Button
          variant="contained"
          disabled={loading || sliced.length === 0}
          onClick={() => setShown({ id: ++chartRuns, renderer, values: sliced })}
        >
          Render graph
        </Button>
        <FormControl size="small" sx={{ minWidth: 100 }} disabled={values.length === 0}>
          <InputLabel id="points-label">Points</InputLabel>
          <Select
            labelId="points-label"
            label="Points"
            value={sliceCount}
            onChange={(e: SelectChangeEvent<number>) => setSliceCount(Number(e.target.value))}
          >
            {SLICES.map(({ count, label }) => (
              <MenuItem key={count} value={count}>
                First {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={renderer}
          aria-label="Chart renderer"
          onChange={(_, next: Mode | null) => {
            if (!next) return
            setRenderer(next)
            setShown(null)
          }}
        >
          {MODES.map(({ mode, label }) => (
            <ToggleButton key={mode} value={mode}>
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {sliced.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {sliced.length.toLocaleString()} of {values.length.toLocaleString()} points
          </Typography>
        )}
      </Stack>

      {shown && (
        <Suspense fallback={<CircularProgress sx={{ display: 'block', mx: 'auto', my: 8 }} />}>
          {shown.renderer === 'plotly-webgl' ? (
            <PlotlyChart key={shown.id} values={shown.values} renderer="webgl" />
          ) : (
            <EChart
              key={shown.id}
              values={shown.values}
              renderer={shown.renderer === 'echarts-webgl' ? 'webgl' : 'canvas'}
            />
          )}
        </Suspense>
      )}
    </Page>
  )
}
