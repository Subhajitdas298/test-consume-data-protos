import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { fetchRootData } from './api/dataClient'
import { summarize, totalValueCount, type FieldStats } from './api/stats'

function App() {
  const [stats, setStats] = useState<FieldStats[] | null>(null)
  const [dayCount, setDayCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const root = await fetchRootData()
      const fieldStats = summarize(root)
      setStats(fieldStats)
      setDayCount(root.data.reduce((sum, entry) => sum + entry.dates.length, 0))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="h1">
            Test Data Protos Consumer
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Button variant="contained" onClick={loadData} disabled={loading}>
            Refresh data
          </Button>
          {loading && <CircularProgress size={24} />}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load data: {error}
          </Alert>
        )}

        {stats && (
          <>
            <Typography sx={{ mb: 2 }}>
              Loaded {dayCount} day(s), {stats.length} field-day combinations,{' '}
              {totalValueCount(stats).toLocaleString()} total values.
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Day</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Min</TableCell>
                    <TableCell align="right">Max</TableCell>
                    <TableCell align="right">Avg</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.map((row) => (
                    <TableRow key={`${row.day}-${row.field}`} hover>
                      <TableCell>{row.day}</TableCell>
                      <TableCell>{row.field}</TableCell>
                      <TableCell align="right">{row.count.toLocaleString()}</TableCell>
                      <TableCell align="right">{row.min.toFixed(3)}</TableCell>
                      <TableCell align="right">{row.max.toFixed(3)}</TableCell>
                      <TableCell align="right">{row.avg.toFixed(3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {!stats && !loading && !error && <Box>No data loaded.</Box>}
      </Container>
    </>
  )
}

export default App
