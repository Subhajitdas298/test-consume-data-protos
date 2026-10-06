import { useCallback, useMemo, useState } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import type { DateRecord } from '@subhajitdas298/test-data-protos'

import { useRootData } from '../api/useRootData'
import type { FetchResult } from '../api/dataClient'
import Page from '../components/Page'
import PlotlyChart from '../components/PlotlyChart'
import { BACKENDS } from '../context/backends'
import { useDataSource } from '../context/useDataSource'

type Field = Exclude<keyof DateRecord, '$typeName' | '$unknown'>

const FIELDS = 'abcdefghijklmnopqrstuvwxyz'.split('') as Field[]

export default function DataVisualizer({
  title,
  fetchFn,
}: {
  title: string
  fetchFn: (baseUrl: string) => Promise<FetchResult>
}) {
  const { backend } = useDataSource()
  const baseUrl = BACKENDS[backend].baseUrl
  const fetcher = useCallback(() => fetchFn(baseUrl), [fetchFn, baseUrl])

  const { root, loading, error, stats, reload } = useRootData(fetcher)
  const [day, setDay] = useState(0)
  const [field, setField] = useState<Field>('a')

  const days = useMemo(() => root?.data.flatMap((entry) => entry.dates) ?? [], [root])

  const values = useMemo(() => days[day]?.[field] ?? [], [days, day, field])

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
        {loading && <CircularProgress size={24} />}
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
            {FIELDS.map((f) => (
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

      {values.length > 0 && (
        <>
          <Typography sx={{ mb: { xs: 1, sm: 2 } }}>
            Day {day}, field "{field}" — {values.length.toLocaleString()} points. Drag on the
            chart or the range slider below it to zoom, double-click to reset.
          </Typography>

          <PlotlyChart values={values} />
        </>
      )}
    </Page>
  )
}
