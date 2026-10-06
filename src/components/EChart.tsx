import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import { useTheme } from '@mui/material/styles'
import { init, use, type ECharts } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer])

export type ChartRenderer = 'webgl' | 'canvas'

// echarts-gl is only fetched when the WebGL renderer is actually used.
let glPromise: Promise<void> | undefined
function loadGl(): Promise<void> {
  glPromise ??= import('echarts-gl/charts').then(({ ScatterGLChart }) => {
    use([ScatterGLChart])
  })
  glPromise.catch(() => {
    glPromise = undefined
  })
  return glPromise
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

// Smoothing and decimation are plain ECharts series options (`smooth`, `sampling`);
// the data is handed over untouched.
export default function EChart({
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
  const [error, setError] = useState<string | null>(null)

  const textColor = theme.palette.text.primary
  const gridColor = theme.palette.divider
  const lineColor = theme.palette.primary.main

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    let chart: ECharts | undefined
    let onResize: (() => void) | undefined

    const mount = async () => {
      if (renderer === 'webgl') await loadGl()
      if (cancelled) return
      chart = init(el, undefined, { renderer: 'canvas' })
      const common = {
        animation: false,
        textStyle: { color: textColor },
        grid: { top: 16, right: 24, bottom: 88, left: 64 },
        tooltip: { trigger: 'axis' },
        yAxis: {
          type: 'value',
          name: 'value',
          scale: true,
          splitLine: { lineStyle: { color: gridColor } },
        },
        dataZoom: [
          { type: 'inside' },
          { type: 'slider', height: 24, bottom: 8, textStyle: { color: textColor } },
        ],
      }
      if (renderer === 'canvas') {
        chart.setOption({
          ...common,
          xAxis: {
            type: 'category',
            name: 'index',
            nameLocation: 'middle',
            nameGap: 32,
            axisLine: { lineStyle: { color: gridColor } },
          },
          series: [
            {
              type: 'line',
              data: values,
              smooth: true,
              sampling: 'lttb',
              showSymbol: false,
              lineStyle: { color: lineColor, width: 1.5 },
              itemStyle: { color: lineColor },
            },
          ],
        })
      } else {
        // scatterGL is ECharts' WebGL series: it draws points, not lines, so there is no
        // smoothing. Interleaved [x0, y0, x1, y1, ...] floats avoid 10M tiny arrays.
        const flat = new Float32Array(values.length * 2)
        for (let i = 0; i < values.length; i++) {
          flat[2 * i] = i
          flat[2 * i + 1] = values[i]
        }
        chart.setOption({
          ...common,
          tooltip: { trigger: 'none' },
          xAxis: {
            type: 'value',
            name: 'index',
            nameLocation: 'middle',
            nameGap: 32,
            scale: true,
            splitLine: { lineStyle: { color: gridColor } },
          },
          series: [
            {
              type: 'scatterGL',
              data: flat,
              dimensions: ['x', 'y'],
              symbolSize: 2,
              itemStyle: { color: lineColor, opacity: 0.8 },
              progressive: 1e6,
              blendMode: 'source-over',
            },
          ],
        })
      }
      onResize = () => chart?.resize()
      window.addEventListener('resize', onResize)
      setError(null)
    }
    mount().catch((err: unknown) => {
      if (!cancelled) setError(errorMessage(err))
    })

    return () => {
      cancelled = true
      if (onResize) window.removeEventListener('resize', onResize)
      chart?.dispose()
    }
  }, [values, renderer, textColor, gridColor, lineColor])

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to render chart: {error}
        </Alert>
      )}
      <div ref={ref} style={{ width: '100%', height }} />
    </>
  )
}
