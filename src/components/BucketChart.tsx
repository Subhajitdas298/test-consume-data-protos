import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useTheme } from '@mui/material/styles'

import { errorMessage, loadPlotly, type PlotlyModule } from './plotlyLoader'

export const MAX_SCORE = 1000

const alpha = (color: string, a: number) => (color.startsWith('#') ? `${color}${Math.round(a * 255).toString(16).padStart(2, '0')}` : color)

// Bars are thin and centred on the middle of their bucket (as a fraction of the bucket width),
// rather than spanning its edges.
const BAR_WIDTH = 0.2

const range = (i: number, n: number) => `${(i * MAX_SCORE) / n}\u2013${((i + 1) * MAX_SCORE) / n - 1}`

/**
 * Both distributions over the fixed score range 0..MAX_SCORE on one set of axes: `coarse`
 * (a stepped area, one flat step per bucket) with `fine` drawn over it as bars. With N counts,
 * bucket i covers scores i*(MAX_SCORE/N) .. (i+1)*(MAX_SCORE/N) - 1.
 */
export default function BucketChart({
  coarse,
  fine,
  height = 440,
}: {
  coarse: number[]
  fine: number[]
  height?: number
}) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [plotly, setPlotly] = useState<PlotlyModule | null>(null)
  const [error, setError] = useState<string | null>(null)

  const textColor = theme.palette.text.primary
  const gridColor = theme.palette.divider
  const areaColor = theme.palette.primary.main
  // Dark blue; lightened in dark mode so the bars stay visible on a dark background.
  const barColor = theme.palette.mode === 'dark' ? '#5b8def' : '#0b2e75'

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
    // A's step is the expected count per 100 scores, B's bars are counts per 10 scores, so
    // the right axis is the left one divided by ten: a bar above the step is above expectation.
    const top = Math.max(Math.max(...coarse), 10 * Math.max(...fine)) * 1.08
    const coarseWidth = MAX_SCORE / coarse.length
    const fineWidth = MAX_SCORE / fine.length
    // The gl2d bundle has no `bar` trace, so the bars are one trace of closed rectangles
    // (separated by gaps) and the hover targets are invisible markers on the bar tops.
    const barX: (number | null)[] = []
    const barY: (number | null)[] = []
    fine.forEach((count, i) => {
      const middle = (i + 0.5) * fineWidth
      const x0 = middle - (fineWidth * BAR_WIDTH) / 2
      const x1 = middle + (fineWidth * BAR_WIDTH) / 2
      barX.push(x0, x0, x1, x1, x0, null)
      barY.push(0, count, count, 0, 0, null)
    })
    plotly
      .react(
        el,
        [
          {
            type: 'scatter',
            mode: 'lines',
            name: `A: ${coarse.length} buckets (${coarseWidth} scores each)`,
            x: [...coarse.map((_, i) => i * coarseWidth), MAX_SCORE],
            y: [...coarse, coarse[coarse.length - 1]],
            line: { color: areaColor, width: 1.5, shape: 'hv' },
            fill: 'tozeroy',
            fillcolor: alpha(areaColor, 0.3),
            customdata: [...coarse.map((_, i) => range(i, coarse.length)), ''],
            hovertemplate: 'A, score %{customdata}<br>%{y:,} transactions<extra></extra>',
          },
          {
            type: 'scatter',
            mode: 'lines',
            name: `B: ${fine.length} buckets (${fineWidth} scores each)`,
            x: barX,
            y: barY,
            line: { color: barColor, width: 1 },
            yaxis: 'y2',
            fill: 'toself',
            fillcolor: alpha(barColor, 0.85),
            hoverinfo: 'skip',
          },
          {
            type: 'scatter',
            mode: 'markers',
            name: 'B values',
            showlegend: false,
            yaxis: 'y2',
            x: fine.map((_, i) => (i + 0.5) * fineWidth),
            y: fine,
            marker: { color: barColor, size: 8, opacity: 0 },
            customdata: fine.map((_, i) => range(i, fine.length)),
            hovertemplate: 'B, score %{customdata}<br>%{y:,} transactions<extra></extra>',
          },
        ],
        {
          autosize: true,
          height,
          margin: { t: 40, r: 72, b: 48, l: 72 },
          hovermode: 'closest',
          legend: { orientation: 'h', x: 0, y: 1.1 },
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
            title: { text: 'transactions per 100 scores (A)', font: { color: areaColor } },
            tickfont: { color: areaColor },
            range: [0, top],
            gridcolor: gridColor,
            zerolinecolor: gridColor,
            fixedrange: true,
          },
          // Same scale as the left axis, per 10 scores instead of per 100.
          yaxis2: {
            title: { text: 'transactions per 10 scores (B)', font: { color: barColor } },
            tickfont: { color: barColor },
            overlaying: 'y',
            side: 'right',
            range: [0, top / 10],
            showgrid: false,
            fixedrange: true,
          },
        },
        { responsive: true, displaylogo: false, displayModeBar: false },
      )
      .then(
        () => setError(null),
        (err: unknown) => setError(errorMessage(err)),
      )
  }, [plotly, coarse, fine, height, textColor, gridColor, areaColor, barColor])

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
