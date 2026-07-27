import { useMemo, useState } from 'react'
import Container from '@mui/material/Container'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  Brush,
  ResponsiveContainer,
} from 'recharts'
import type { Root } from '@subhajitdas298/test-data-protos'

import { useRootData } from '../api/useRootData'
import TopBar from '../components/TopBar'

const FIELDS = 'abcdefghijklmnopqrstuvwxyz'.split('')

export default function DataVisualizer({
  title,
  fetcher,
}: {
  title: string
  fetcher: () => Promise<Root>
}) {
  const { root, loading, error, reload } = useRootData(fetcher)
  const [day, setDay] = useState(0)
  const [field, setField] = useState('a')

  const days = useMemo(() => root?.data.flatMap((entry) => entry.dates) ?? [], [root])

  const chartData = useMemo(() => {
    const record = days[day]
    if (!record) return []
    const values = record[field as keyof typeof record] as number[]
    return values.map((value, index) => ({ index, value }))
  }, [days, day, field])

  return (
    <>
      <TopBar title={title} showBack />

      <Container sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Button variant="contained" onClick={reload} disabled={loading}>
            Refresh data
          </Button>
          {loading && <CircularProgress size={24} />}

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
              onChange={(e: SelectChangeEvent) => setField(e.target.value)}
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

        {chartData.length > 0 && (
          <>
            <Typography sx={{ mb: 2 }}>
              Day {day}, field "{field}" — {chartData.length.toLocaleString()} points. Drag the
              handles on the brush below the chart to zoom into a range.
            </Typography>

            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1976d2"
                  dot={false}
                  isAnimationActive={false}
                />
                <Brush dataKey="index" height={30} travellerWidth={8} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </Container>
    </>
  )
}
