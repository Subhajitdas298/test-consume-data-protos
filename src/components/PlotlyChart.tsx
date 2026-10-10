import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useTheme } from '@mui/material/styles'

type PlotlyModule = typeof import('plotly.js-gl2d-dist-min').default

let plotlyPromise: Promise<PlotlyModule> | undefined

// Loaded lazily so the ~1.5 MB Plotly bundle only ships to the chart routes.
function loadPlotly(): Promise<PlotlyModule> {
  plotlyPromise ??= import('plotly.js-gl2d-dist-min')
    .then((module) => module.default)
    .catch((err: unknown) => {
      plotlyPromise = undefined
      throw err
    })
  return plotlyPromise
}

// Smooth curves are a Plotly SVG-trace feature (scattergl has no spline shape), and
// their cost grows roughly linearly with point count: ~4 s at 100k points, ~35 s at 1M,
// minutes at 10M. With many points per pixel a spline looks the same as straight
// segments anyway, so past this size the SVG chart falls back to linear.
const MAX_SPLINE_POINTS = 100_000

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

export type ChartRenderer = 'webgl' | 'svg'

export default function PlotlyChart({
  values,
  renderer,
  height = 500,
}: {
  values: number[]
  renderer: ChartRenderer
  height?: number
}) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [plotly, setPlotly] = useState<PlotlyModule | null>(null)
  const [error, setError] = useState<string | null>(null)

  const textColor = theme.palette.text.primary
  const gridColor = theme.palette.divider
  const lineColor = theme.palette.primary.main
  const paperColor = theme.palette.background.paper
  const smooth = renderer === 'svg' && values.length <= MAX_SPLINE_POINTS

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
    let cancelled = false
    plotly
      .react(
        el,
        [
          {
            type: renderer === 'webgl' ? 'scattergl' : 'scatter',
            mode: 'lines',
            y: values,
            line: { color: lineColor, width: 1.5, shape: smooth ? 'spline' : 'linear', smoothing: 1.3 },
            hovertemplate: 'step %{x}<br>recall %{y}<extra></extra>',
          },
        ],
        {
          autosize: true,
          height,
          margin: { t: 16, r: 24, b: 48, l: 64 },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: textColor },
          hovermode: 'closest',
          dragmode: 'zoom',
          modebar: { bgcolor: 'rgba(0,0,0,0)', color: textColor, activecolor: lineColor },
          xaxis: {
            title: { text: 'step' },
            gridcolor: gridColor,
            zerolinecolor: gridColor,
            rangeslider: { visible: true, bgcolor: paperColor, bordercolor: gridColor },
          },
          yaxis: { title: { text: 'recall' }, gridcolor: gridColor, zerolinecolor: gridColor },
        },
        { responsive: true, displaylogo: false },
      )
      .then(
        () => {
          if (!cancelled) setError(null)
        },
        (err: unknown) => {
          if (!cancelled) setError(errorMessage(err))
        },
      )
    return () => {
      cancelled = true
    }
  }, [plotly, values, renderer, smooth, height, textColor, gridColor, lineColor, paperColor])

  useEffect(() => {
    const el = ref.current
    return () => {
      if (plotly && el) {
        // d3 binds the calculated points to the SVG nodes as __data__; drop them so a
        // detached chart can't keep millions of point objects alive.
        const nodes = Array.from(el.querySelectorAll<Element & { __data__?: unknown }>('*'))
        plotly.purge(el)
        for (const node of nodes) node.__data__ = undefined
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
