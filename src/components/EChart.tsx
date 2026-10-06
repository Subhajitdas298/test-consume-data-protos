import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import { useTheme } from '@mui/material/styles'
import { init, use, type ECharts } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers'

use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer, SVGRenderer])

export type ChartRenderer = 'canvas' | 'svg'

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
    let chart: ECharts | undefined
    try {
      chart = init(el, undefined, { renderer })
      chart.setOption({
        animation: false,
        textStyle: { color: textColor },
        grid: { top: 16, right: 24, bottom: 88, left: 64 },
        tooltip: { trigger: 'axis', valueFormatter: (v: unknown) => String(v) },
        xAxis: {
          type: 'category',
          name: 'index',
          nameLocation: 'middle',
          nameGap: 32,
          axisLine: { lineStyle: { color: gridColor } },
        },
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
      const onResize = () => chart?.resize()
      window.addEventListener('resize', onResize)
      setError(null)
      return () => {
        window.removeEventListener('resize', onResize)
        chart?.dispose()
      }
    } catch (err) {
      chart?.dispose()
      setError(errorMessage(err))
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
