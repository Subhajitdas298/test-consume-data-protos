import { useCallback, useMemo, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import type { Data, Layout } from 'plotly.js'
import Plot from 'react-plotly.js'

import RangeScrollbar from './RangeScrollbar'
import { relayoutRange } from './relayoutRange'

const MAX_SCORE = 1000

const alpha = (color: string, a: number) => (color.startsWith('#') ? `${color}${Math.round(a * 255).toString(16).padStart(2, '0')}` : color)

// Bars are thin and centred on the middle of their bucket (as a fraction of the bucket width),
// rather than spanning its edges.
const BAR_WIDTH = 0.2

const MARGIN = { t: 40, r: 72, b: 96, l: 72 }

type Range = [number, number]

const fmt = (n: number) => Math.round(n).toLocaleString()

// Shared y extent (left axis units): A's steps against B's bars times ten. Fixed for the whole
// score range: zooming is horizontal only.
const yTop = (coarse: number[], fine: number[]) => Math.max(Math.max(...coarse), 10 * Math.max(...fine)) * 1.08

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
  // Zoom is horizontal only, so the x range is the only state: the plot's own zoom/reset (via
  // onRelayout) and the scrollbar both write it, and the layout is derived from it.
  const [x, setX] = useState<Range>([0, MAX_SCORE])

  const textColor = theme.palette.text.primary
  const gridColor = theme.palette.divider
  const areaColor = theme.palette.primary.main
  // Dark blue; lightened in dark mode so the bars stay visible on a dark background.
  const barColor = theme.palette.mode === 'dark' ? '#5b8def' : '#0b2e75'

  const data = useMemo<Data[]>(() => {
    const coarseWidth = MAX_SCORE / coarse.length
    const fineWidth = MAX_SCORE / fine.length
    // The bars are one trace of closed rectangles (separated by gaps), and the hover targets are
    // invisible markers on the bar tops.
    const barX: (number | null)[] = []
    const barY: (number | null)[] = []
    fine.forEach((count, i) => {
      const middle = (i + 0.5) * fineWidth
      const x0 = middle - (fineWidth * BAR_WIDTH) / 2
      const x1 = middle + (fineWidth * BAR_WIDTH) / 2
      barX.push(x0, x0, x1, x1, x0, null)
      barY.push(0, count, count, 0, 0, null)
    })
    return [
      {
        type: 'scattergl',
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
        type: 'scattergl',
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
        type: 'scattergl',
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
    ]
  }, [coarse, fine, areaColor, barColor])

  const layout = useMemo<Partial<Layout>>(() => {
    // A's step is the expected count per 100 scores, B's bars are counts per 10 scores, so
    // the right axis is the left one divided by ten: a bar above the step is above expectation.
    const top = yTop(coarse, fine)
    const fineWidth = MAX_SCORE / fine.length
    return {
      autosize: true,
      height,
      margin: MARGIN,
      hovermode: 'x',
      hoverdistance: -1,
      legend: { orientation: 'h', x: 0, y: 1.1 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: textColor },
      dragmode: 'zoom',
      xaxis: {
        title: { text: 'score', standoff: 8 },
        range: x,
        // One label per B bar, at the bar's middle.
        tickmode: 'array',
        tickvals: fine.map((_, i) => (i + 0.5) * fineWidth),
        ticktext: fine.map((_, i) => range(i, fine.length)),
        tickangle: -90,
        tickfont: { size: 9 },
        gridcolor: gridColor,
        zerolinecolor: gridColor,
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
      yaxis2: {
        title: { text: 'transactions per 10 scores (B)', font: { color: barColor } },
        tickfont: { color: barColor },
        overlaying: 'y',
        side: 'right',
        range: [0, top / 10],
        showgrid: false,
        fixedrange: true,
      },
    }
  }, [coarse, fine, height, x, textColor, gridColor, areaColor, barColor])

  const onRelayout = useCallback((event: Record<string, unknown>) => {
    const xr = relayoutRange(event, 'xaxis')
    if (xr) setX(xr === 'auto' ? [0, MAX_SCORE] : xr)
  }, [])

  return (
    <>
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displaylogo: false, displayModeBar: false }}
        useResizeHandler
        style={{ width: '100%' }}
        onRelayout={onRelayout}
      />
      <RangeScrollbar
        values={fine}
        domain={MAX_SCORE}
        range={x}
        onChange={setX}
        left={MARGIN.l}
        right={MARGIN.r}
      />
    </>
  )
}
