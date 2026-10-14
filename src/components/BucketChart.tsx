import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useTheme } from '@mui/material/styles'

import { errorMessage, loadPlotly, type PlotlyModule } from './plotlyLoader'

export const MAX_SCORE = 1000

const alpha = (color: string, a: number) => (color.startsWith('#') ? `${color}${Math.round(a * 255).toString(16).padStart(2, '0')}` : color)

/**
 * Histogram of counts per score bucket over the fixed score range 0..MAX_SCORE: with N
 * counts, bucket i covers scores i*(MAX_SCORE/N) .. (i+1)*(MAX_SCORE/N) - 1.
 */
export default function BucketChart({ counts, height = 320 }: { counts: number[]; height?: number }) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [plotly, setPlotly] = useState<PlotlyModule | null>(null)
  const [error, setError] = useState<string | null>(null)

  const textColor = theme.palette.text.primary
  const gridColor = theme.palette.divider
  const barColor = theme.palette.primary.main

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
    const width = MAX_SCORE / counts.length
    plotly
      .react(
        el,
        [
          {
            // The gl2d bundle has no `bar` trace, so the histogram is a stepped area: one
            // flat step per bucket, from the bucket's first score to the next one's.
            type: 'scatter',
            mode: 'lines',
            x: [...counts.map((_, i) => i * width), MAX_SCORE],
            y: [...counts, counts[counts.length - 1]],
            line: { color: barColor, width: 1.5, shape: 'hv' },
            fill: 'tozeroy',
            fillcolor: alpha(barColor, 0.35),
            customdata: [...counts.map((_, i) => `${i * width}\u2013${(i + 1) * width - 1}`), ''],
            hovertemplate: 'score %{customdata}<br>%{y:,} transactions<extra></extra>',
          },
        ],
        {
          autosize: true,
          height,
          margin: { t: 16, r: 24, b: 48, l: 72 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: textColor },
          dragmode: false,
          xaxis: {
            title: { text: 'score' },
            range: [0, MAX_SCORE],
            dtick: 100,
            gridcolor: gridColor,
            zerolinecolor: gridColor,
            fixedrange: true,
          },
          yaxis: {
            title: { text: 'transactions' },
            gridcolor: gridColor,
            zerolinecolor: gridColor,
            fixedrange: true,
          },
        },
        { responsive: true, displaylogo: false, displayModeBar: false },
      )
      .then(
        () => setError(null),
        (err: unknown) => setError(errorMessage(err)),
      )
  }, [plotly, counts, height, textColor, gridColor, barColor])

  useEffect(() => {
    const el = ref.current
    return () => {
      if (plotly && el) {
        plotly.purge(el)
        el.replaceChildren()
      }
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
