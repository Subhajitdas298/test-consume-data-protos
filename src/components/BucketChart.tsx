import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import type { RangeSlider } from 'plotly.js'

import { errorMessage, loadPlotly, type PlotlyModule } from './plotlyLoader'

const MAX_SCORE = 1000

// With N counts, bucket i covers scores i*(MAX_SCORE/N) .. (i+1)*(MAX_SCORE/N) - 1; each bar is
// centred on the middle of its bucket.
const centres = (counts: number[]) => counts.map((_, i) => ((i + 0.5) * MAX_SCORE) / counts.length)

/**
 * `coarse` (expected counts, wide bars) and `fine` (observed counts, thin dark-blue bars on a
 * second y axis) over scores 0..MAX_SCORE. All of it is stock Plotly: bar traces, unified hover,
 * a tick per fine bar and the built-in range slider.
 */
export default function BucketChart({
  coarse,
  fine,
  height = 520,
}: {
  coarse: number[]
  fine: number[]
  height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [plotly, setPlotly] = useState<PlotlyModule | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadPlotly().then(
      (loaded) => {
        if (!cancelled) setPlotly(loaded)
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!plotly || !el) return
    // Both y axes share one scale, the right one per 10 scores instead of per 100, so a thin bar
    // above the top of a wide one is above its expected value.
    const top = Math.max(Math.max(...coarse), 10 * Math.max(...fine)) * 1.08
    plotly
      .react(
        el,
        [
          {
            type: 'bar',
            name: `A: expected, ${coarse.length} buckets`,
            x: centres(coarse),
            y: coarse,
            width: MAX_SCORE / coarse.length,
            opacity: 0.5,
            hovertemplate: '%{y:,}',
          },
          {
            type: 'bar',
            name: `B: observed, ${fine.length} buckets`,
            x: centres(fine),
            y: fine,
            width: (MAX_SCORE / fine.length) * 0.2,
            yaxis: 'y2',
            marker: { color: '#0b2e75' },
            hovertemplate: '%{y:,}',
          },
        ],
        {
          height,
          barmode: 'overlay',
          hovermode: 'x unified',
          hoverdistance: -1,
          dragmode: 'zoom',
          legend: { orientation: 'h', y: 1.1 },
          xaxis: {
            title: { text: 'score' },
            range: [0, MAX_SCORE],
            tick0: MAX_SCORE / fine.length / 2,
            dtick: MAX_SCORE / fine.length,
            tickangle: -90,
            tickfont: { size: 9 },
            rangeslider: { visible: true, range: [0, MAX_SCORE] } as Partial<RangeSlider>,
          },
          yaxis: { title: { text: 'transactions per 100 scores (A)' }, range: [0, top], fixedrange: true },
          yaxis2: {
            title: { text: 'transactions per 10 scores (B)' },
            overlaying: 'y',
            side: 'right',
            range: [0, top / 10],
            showgrid: false,
            fixedrange: true,
          },
        },
        { responsive: true, displaylogo: false },
      )
      .then(
        () => setError(null),
        (err: unknown) => setError(errorMessage(err)),
      )
  }, [plotly, coarse, fine, height])

  useEffect(() => {
    const el = ref.current
    return () => {
      if (plotly && el) plotly.purge(el)
    }
  }, [plotly])

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to render chart: {error}
        </Alert>
      )}
      {!plotly && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}
      <div ref={ref} />
    </>
  )
}
