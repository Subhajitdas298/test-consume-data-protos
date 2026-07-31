import { useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { fetchRootDataJson, fetchRootDataProto } from '../api/dataClient'
import Page from '../components/Page'
import { BACKENDS, type Backend } from '../context/backends'

type Format = 'json' | 'protobuf'

interface BenchmarkCall {
  pair: number
  format: Format
  elapsedMs: number
  bytes: number
}

type Results = Record<Backend, BenchmarkCall[]>

type Status = 'idle' | 'running' | 'done' | 'error'

interface LogEntry {
  message: string
  timestamp: number
}

const BACKEND_KEYS = Object.keys(BACKENDS) as Backend[]

const COMPACT_CELL_SX = { px: 0.75, py: 0.5, fontSize: '0.75rem' }

function emptyResults(): Results {
  return BACKEND_KEYS.reduce((acc, key) => {
    acc[key] = []
    return acc
  }, {} as Results)
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function summarize(calls: BenchmarkCall[]) {
  if (calls.length === 0) return null
  const times = calls.map((c) => c.elapsedMs).sort((a, b) => a - b)
  const sizes = calls.map((c) => c.bytes).sort((a, b) => a - b)
  return {
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    medianTime: median(times),
    avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
    medianSize: median(sizes),
  }
}

async function withRetry<T>(
  label: string,
  pushLog: (message: string) => void,
  fn: () => Promise<T>,
): Promise<T> {
  pushLog(`${label}…`)
  try {
    return await fn()
  } catch {
    pushLog(`${label} (retry 1)…`)
    return await fn()
  }
}

const formatTime = (ms: number) => `${(ms / 1000).toFixed(2)}s`
const formatSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`

function formatTimestamp(ms: number): string {
  const date = new Date(ms)
  return `${date.toLocaleTimeString([], { hour12: false })}.${String(date.getMilliseconds()).padStart(3, '0')}`
}

function CallCell({ call }: { call: BenchmarkCall | undefined }) {
  if (!call) return <TableCell sx={COMPACT_CELL_SX} align="right">—</TableCell>
  return (
    <TableCell sx={COMPACT_CELL_SX} align="right">
      {formatTime(call.elapsedMs)} / {formatSize(call.bytes)}
    </TableCell>
  )
}

function SummaryCell({ summary }: { summary: ReturnType<typeof summarize> }) {
  if (!summary) return <TableCell sx={COMPACT_CELL_SX} align="right">—</TableCell>
  return (
    <TableCell sx={COMPACT_CELL_SX} align="right">
      <Typography component="div" sx={{ fontSize: 'inherit' }}>
        avg {formatTime(summary.avgTime)} / {formatSize(summary.avgSize)}
      </Typography>
      <Typography component="div" color="text.secondary" sx={{ fontSize: 'inherit' }}>
        median {formatTime(summary.medianTime)} / {formatSize(summary.medianSize)}
      </Typography>
    </TableCell>
  )
}

const GROUPS: { label: string; filter: (call: BenchmarkCall) => boolean }[] = [
  { label: 'JSON', filter: (call) => call.format === 'json' },
  { label: 'Protobuf', filter: (call) => call.format === 'protobuf' },
  { label: 'Combined', filter: () => true },
]

export default function Benchmark() {
  const [pairs, setPairs] = useState(2)
  const [status, setStatus] = useState<Status>('idle')
  const [activity, setActivity] = useState('')
  const [results, setResults] = useState<Results>(emptyResults())
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const running = status === 'running'

  const pushLog = (message: string, updateActivity = true) => {
    if (updateActivity) setActivity(message)
    setLogs((prev) => [{ message, timestamp: Date.now() }, ...prev])
  }

  const start = async () => {
    setStatus('running')
    setError(null)
    setResults(emptyResults())
    setLogs([])

    try {
      for (const key of BACKEND_KEYS) {
        const meta = BACKENDS[key]

        await withRetry(`Warming up ${meta.label}`, pushLog, () => fetchRootDataJson(meta.baseUrl))

        for (let pair = 1; pair <= pairs; pair++) {
          const proto = await withRetry(
            `${meta.label} — pair ${pair}/${pairs}, Protobuf`,
            pushLog,
            () => fetchRootDataProto(meta.baseUrl),
          )
          setResults((prev) => ({
            ...prev,
            [key]: [
              ...prev[key],
              { pair, format: 'protobuf' as const, elapsedMs: proto.elapsedMs, bytes: proto.bytes },
            ],
          }))

          const json = await withRetry(
            `${meta.label} — pair ${pair}/${pairs}, JSON`,
            pushLog,
            () => fetchRootDataJson(meta.baseUrl),
          )
          setResults((prev) => ({
            ...prev,
            [key]: [
              ...prev[key],
              { pair, format: 'json' as const, elapsedMs: json.elapsedMs, bytes: json.bytes },
            ],
          }))
        }
      }
      pushLog('Benchmark complete')
      setStatus('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      pushLog(`Benchmark failed: ${message}`, false)
      setError(message)
      setActivity('')
      setStatus('error')
    }
  }

  const callRows = Array.from({ length: pairs * 2 }, (_, i) => ({
    pair: Math.floor(i / 2) + 1,
    format: (i % 2 === 0 ? 'protobuf' : 'json') as Format,
    index: i,
  }))

  return (
    <Page title="Auto Benchmark" showBack showBackendToggle={false}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, mb: 2 }}
      >
        <TextField
          label="Run pairs per backend"
          type="number"
          size="small"
          value={pairs}
          onChange={(e) => setPairs(Math.max(1, Number(e.target.value) || 1))}
          disabled={running}
          sx={{ width: { xs: '100%', sm: 200 } }}
        />
        <Button variant="contained" onClick={() => void start()} disabled={running}>
          {status === 'idle' ? 'Start benchmark' : 'Run again'}
        </Button>
        {running && <CircularProgress size={24} />}
      </Stack>

      {activity && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {activity}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Benchmark failed: {error}
        </Alert>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Calls
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={COMPACT_CELL_SX}>Call</TableCell>
              {BACKEND_KEYS.map((key) => (
                <TableCell key={key} sx={COMPACT_CELL_SX} align="right">
                  {BACKENDS[key].label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {callRows.map((row) => (
              <TableRow key={row.index}>
                <TableCell sx={COMPACT_CELL_SX}>
                  Pair {row.pair} — {row.format === 'protobuf' ? 'Protobuf' : 'JSON'}
                </TableCell>
                {BACKEND_KEYS.map((key) => (
                  <CallCell key={key} call={results[key][row.index]} />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Average / median (time / size)
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={COMPACT_CELL_SX}>Format</TableCell>
              {BACKEND_KEYS.map((key) => (
                <TableCell key={key} sx={COMPACT_CELL_SX} align="right">
                  {BACKENDS[key].label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {GROUPS.map((group) => (
              <TableRow key={group.label}>
                <TableCell sx={{ ...COMPACT_CELL_SX, fontWeight: 'bold' }}>{group.label}</TableCell>
                {BACKEND_KEYS.map((key) => (
                  <SummaryCell key={key} summary={summarize(results[key].filter(group.filter))} />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Logs ({logs.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={0.5}>
            {logs.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No logs yet
              </Typography>
            )}
            {logs.map((entry, index) => (
              <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                [{formatTimestamp(entry.timestamp)}] {entry.message}
              </Typography>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Page>
  )
}
