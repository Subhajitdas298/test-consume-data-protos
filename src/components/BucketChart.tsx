import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useTheme } from '@mui/material/styles'
import type { Layout, PlotlyHTMLElement, PlotRelayoutEvent, RangeSlider } from 'plotly.js'

import { errorMessage, loadPlotly, type PlotlyModule } from './plotlyLoader'

export const MAX_SCORE = 1000

const alpha = (color: string, a: number) => (color.startsWith('#') ? `${color}${Math.round(a * 255).toString(16).padStart(2, '0')}` : color)

// Bars are thin and centred on the middle of their bucket (as a fraction of the bucket width),
// rather than spanning its edges.
const BAR_WIDTH = 0.2

const MARGIN = { t: 40, r: 72, b: 48, l: 72 }

const fmt = (n: number) => Math.round(n).toLocaleString()

// Shared y extent (left axis units) for the buckets overlapping [lo, hi]: A's steps against B's
// bars times ten, so zooming in rescales the heights instead of leaving them tiny.
function yTop(coarse: number[], fine: number[], lo = 0, hi = MAX_SCORE) {
  const visible = (counts: number[]) => {
    const width = MAX_SCORE / counts.length
    return counts.filter((_, i) => (i + 1) * width > lo && i * width < hi)
  }
  return Math.max(...visible(coarse), 10 * Math.max(...visible(fine), 0)) * 1.08
}

const range = (i: number, n: number) => `${(i * MAX_SCORE) / n}\u2013${((i + 1) * MAX_SCORE) / n - 1}`

/**
 * Both distributions over the fixed score range 0..MAX_SCORE on one set of axes: `coarse`
 * (a stepped area, one flat step per bucket) with `fine` drawn over it as bars. With N counts,
 * bucket i covers scores i*(MAX_SCORE/N) .. (i+1)*(MAX_SCORE/N) - 1.
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
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [plotly, setPlotly] = useState<PlotlyModule | null>(null)
  const [error, setError] = useState<string | null>(null)

  const textColor = theme.palette.text.primary
  const gridColor = theme.palette.divider
  const areaColor = theme.palette.primary.main
  const paperColor = theme.palette.background.paper
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
    const top = yTop(coarse, fine)
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
            hoverinfo: 'skip',
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
            // Invisible markers on the bar tops: with hovermode 'x' they make the tooltip follow
            // the nearest bar and report both series for that spot.
            type: 'scatter',
            mode: 'markers',
            name: 'B values',
            showlegend: false,
            yaxis: 'y2',
            x: fine.map((_, i) => (i + 0.5) * fineWidth),
            y: fine,
            marker: { color: barColor, size: 8, opacity: 0 },
            customdata: fine.map((count, i) => {
              const coarseIndex = Math.floor((i * fineWidth) / coarseWidth)
              const expected = coarse[coarseIndex] / (coarseWidth / fineWidth)
              const diff = ((count - expected) / expected) * 100
              return [
                range(i, fine.length),
                fmt(expected),
                range(coarseIndex, coarse.length),
                fmt(coarse[coarseIndex]),
                `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
              ]
            }),
            hovertemplate:
              '<b>score %{customdata[0]}</b><br>' +
              'B observed: <b>%{y:,}</b><br>' +
              'A expected (%{customdata[2]}): <b>%{customdata[3]}</b><br>' +
              'A per 10 scores: %{customdata[1]}<br>' +
              'B vs expected: %{customdata[4]}<extra></extra>',
          },
        ],
        {
          autosize: true,
          height,
          margin: MARGIN,
          hovermode: 'x',
          hoverdistance: -1,
          uirevision: 'keep',
          legend: { orientation: 'h', x: 0, y: 1.1 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: textColor },
          dragmode: 'zoom',
          xaxis: {
            title: { text: 'score', standoff: 8 },
            range: [0, MAX_SCORE],
            // One label per B bar, at the bar's middle.
            tickmode: 'array',
            tickvals: fine.map((_, i) => (i + 0.5) * fineWidth),
            ticktext: fine.map((_, i) => range(i, fine.length)),
            tickangle: -90,
            tickfont: { size: 9 },
            gridcolor: gridColor,
            zerolinecolor: gridColor,
            rangeslider: {
              visible: true,
              bgcolor: paperColor,
              bordercolor: gridColor,
              thickness: 0.1,
              // The preview always shows the whole score range at full scale, whatever the
              // plot is zoomed to.
              range: [0, MAX_SCORE],
              // `yaxis` is supported by Plotly but missing from @types/plotly.js.
              yaxis: { rangemode: 'fixed', range: [0, top] },
            } as Partial<RangeSlider>,
            showspikes: true,
            spikemode: 'across',
            spikethickness: 1,
            spikecolor: gridColor,
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
        () => {
          setError(null)
          // Zooming (box, range slider, reset) rescales the y axes to the visible buckets.
          const gd = el as unknown as PlotlyHTMLElement
          const fitY = (lo: number, hi: number) => {
            const t = yTop(coarse, fine, lo, hi)
            void plotly.relayout(el, { 'yaxis.range': [0, t], 'yaxis2.range': [0, t / 10] } as Partial<Layout>)
          }
          gd.removeAllListeners?.('plotly_relayout')
          gd.on('plotly_relayout', (event: PlotRelayoutEvent) => {
            const lo = event['xaxis.range[0]']
            const hi = event['xaxis.range[1]']
            if (typeof lo === 'number' && typeof hi === 'number') {
              fitY(lo, hi)
            } else if (Array.isArray(event['xaxis.range'])) {
              const [from, to] = event['xaxis.range'] as number[]
              fitY(from, to)
            }
            else if (event['xaxis.autorange']) {
              fitY(0, MAX_SCORE)
            }
          })
        },
        (err: unknown) => setError(errorMessage(err)),
      )
  }, [plotly, coarse, fine, height, textColor, gridColor, areaColor, barColor, paperColor])

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
