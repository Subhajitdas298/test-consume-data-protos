import { useCallback, useMemo, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import type { Data, Layout } from 'plotly.js'
import Plot from 'react-plotly.js'

import { relayoutRange } from './relayoutRange'

const MARGIN = { t: 16, r: 24, b: 48, l: 64 }

// Plotly's range slider only previews SVG traces, never `scattergl`, so the preview comes from
// this helper: the per-bucket maxima of the series (at most BUCKETS points) as an SVG scatter
// trace. It sits on the band the WebGL line already draws, which is why it can stay on the plot.
const BUCKETS = 600

function previewTrace(values: number[], color: string): { trace: Data; extent: Range } {
  const size = Math.max(1, Math.ceil(values.length / BUCKETS))
  const x: number[] = []
  const y: number[] = []
  let lo = Infinity
  let hi = -Infinity
  for (let start = 0; start < values.length; start += size) {
    const end = Math.min(start + size, values.length)
    let max = -Infinity
    for (let i = start; i < end; i++) {
      if (values[i] > max) max = values[i]
      if (values[i] < lo) lo = values[i]
    }
    if (max > hi) hi = max
    x.push((start + end - 1) / 2)
    y.push(max)
  }
  const pad = (hi - lo) * 0.05 || 1
  return {
    trace: { type: 'scatter', mode: 'lines', x, y, line: { color, width: 1 }, hoverinfo: 'skip' },
    extent: [lo - pad, hi + pad],
  }
}

type Range = [number, number]

// react-plotly.js re-renders from props, so the zoom state lives here: the plot's own zoom/pan/
// reset and its range slider (via onRelayout) write it, and the layout is derived from it.
export default function PlotlyChart({ values, height = 500 }: { values: number[]; height?: number }) {
  const theme = useTheme()
  const full = Math.max(values.length - 1, 1)
  const [x, setX] = useState<Range>([0, full])
  const [y, setY] = useState<Range | null>(null)

  const preview = useMemo(() => previewTrace(values, theme.palette.primary.main), [values, theme.palette.primary.main])

  const data = useMemo<Data[]>(
    () => [
      {
        type: 'scattergl',
        mode: 'lines',
        y: values,
        line: { color: theme.palette.primary.main, width: 1.5 },
        hovertemplate: 'step %{x}<br>recall %{y}<extra></extra>',
      },
      preview.trace,
    ],
    [values, preview, theme.palette.primary.main],
  )

  const layout = useMemo<Partial<Layout>>(
    () => ({
      autosize: true,
      height,
      margin: MARGIN,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: theme.palette.text.primary },
      showlegend: false,
      hovermode: 'closest',
      dragmode: 'zoom',
      modebar: { bgcolor: 'rgba(0,0,0,0)', color: theme.palette.text.primary },
      xaxis: {
        title: { text: 'step' },
        gridcolor: theme.palette.divider,
        range: x,
        rangeslider: { visible: true, range: [0, full] },
      },
      yaxis: {
        title: { text: 'recall' },
        gridcolor: theme.palette.divider,
        range: y ?? preview.extent,
      },
    }),
    [height, full, preview, theme.palette.text.primary, theme.palette.divider, x, y],
  )

  const onRelayout = useCallback(
    (event: Record<string, unknown>) => {
      const xr = relayoutRange(event, 'xaxis')
      if (xr) setX(xr === 'auto' ? [0, full] : xr)
      const yr = relayoutRange(event, 'yaxis')
      if (yr) setY(yr === 'auto' ? null : yr)
    },
    [full],
  )

  return (
    <>
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true, displaylogo: false }}
        useResizeHandler
        style={{ width: '100%' }}
        onRelayout={onRelayout}
      />
    </>
  )
}
