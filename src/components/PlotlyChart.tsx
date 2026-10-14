import { useCallback, useMemo, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import type { Data, Layout } from 'plotly.js'
import Plot from 'react-plotly.js'

import RangeScrollbar from './RangeScrollbar'
import { relayoutRange } from './relayoutRange'

const MARGIN = { t: 16, r: 24, b: 48, l: 64 }

type Range = [number, number]

// react-plotly.js re-renders from props, so the zoom state lives here: the plot's own zoom/pan/
// reset (via onRelayout) and the scrollbar both write it, and the layout is derived from it.
export default function PlotlyChart({ values, height = 500 }: { values: number[]; height?: number }) {
  const theme = useTheme()
  const full = Math.max(values.length - 1, 1)
  const [x, setX] = useState<Range>([0, full])
  const [y, setY] = useState<Range | null>(null)

  const data = useMemo<Data[]>(
    () => [
      {
        type: 'scattergl',
        mode: 'lines',
        y: values,
        line: { color: theme.palette.primary.main, width: 1.5 },
        hovertemplate: 'step %{x}<br>recall %{y}<extra></extra>',
      },
    ],
    [values, theme.palette.primary.main],
  )

  const layout = useMemo<Partial<Layout>>(
    () => ({
      autosize: true,
      height,
      margin: MARGIN,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: theme.palette.text.primary },
      hovermode: 'closest',
      dragmode: 'zoom',
      modebar: { bgcolor: 'rgba(0,0,0,0)', color: theme.palette.text.primary },
      xaxis: { title: { text: 'step' }, gridcolor: theme.palette.divider, range: x },
      yaxis: {
        title: { text: 'recall' },
        gridcolor: theme.palette.divider,
        ...(y ? { range: y } : { autorange: true }),
      },
    }),
    [height, theme.palette.text.primary, theme.palette.divider, x, y],
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
      <RangeScrollbar values={values} range={x} onChange={setX} left={MARGIN.l} right={MARGIN.r} />
    </>
  )
}
