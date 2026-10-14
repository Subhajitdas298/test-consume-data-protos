import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'

const BUCKETS = 800
const HEIGHT = 56
const HANDLE = 10

// Per-bucket min/max of the series: the thumbnail behind the scrollbar. One pass over the
// data; Plotly's own range slider can't draw this for WebGL traces.
function envelope(values: number[]) {
  const size = Math.max(1, Math.ceil(values.length / BUCKETS))
  const count = Math.ceil(values.length / size)
  const lo = new Float64Array(count)
  const hi = new Float64Array(count)
  let min = Infinity
  let max = -Infinity
  for (let b = 0; b < count; b++) {
    let l = Infinity
    let h = -Infinity
    const end = Math.min((b + 1) * size, values.length)
    for (let i = b * size; i < end; i++) {
      const v = values[i]
      if (v < l) l = v
      if (v > h) h = v
    }
    lo[b] = l
    hi[b] = h
    if (l < min) min = l
    if (h > max) max = h
  }
  return { lo, hi, min, max, single: size === 1 }
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

type Drag = { mode: 'move' | 'left' | 'right'; startX: number; lo: number; hi: number }

/**
 * Horizontal scrollbar for a series: a thumbnail of the whole series with a draggable
 * window. Drag the window to pan, drag its edges to zoom, click the track to jump.
 * `range` and `onChange` are in the chart's x units: 0 .. `domain`, which defaults to the
 * index range of `values` (0 .. values.length - 1).
 */
export default function RangeScrollbar({
  values,
  range,
  onChange,
  left,
  right,
  domain,
}: {
  values: number[]
  range: [number, number]
  onChange: (range: [number, number]) => void
  left: number
  right: number
  domain?: number
}) {
  const theme = useTheme()
  const trackRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drag = useRef<Drag | null>(null)
  const frame = useRef(0)
  const [width, setWidth] = useState(0)

  const max = domain ?? Math.max(values.length - 1, 1)
  const env = useMemo(() => envelope(values), [values])
  const lo = clamp(range[0] / max)
  const hi = clamp(range[1] / max)
  const minSpan = Math.max(10 / max, 0.002)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setWidth(el.clientWidth))
    observer.observe(el)
    setWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(HEIGHT * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, HEIGHT)
    const span = env.max - env.min || 1
    const y = (v: number) => HEIGHT - 4 - ((v - env.min) / span) * (HEIGHT - 8)
    const n = env.lo.length
    const x = (b: number) => (n === 1 ? 0 : (b / (n - 1)) * width)
    ctx.beginPath()
    for (let b = 0; b < n; b++) ctx.lineTo(x(b), y(env.hi[b]))
    // One point per bucket has no min/max band, so fill down to the baseline instead.
    if (env.single) {
      ctx.lineTo(x(n - 1), HEIGHT)
      ctx.lineTo(x(0), HEIGHT)
    } else {
      for (let b = n - 1; b >= 0; b--) ctx.lineTo(x(b), y(env.lo[b]))
    }
    ctx.closePath()
    ctx.fillStyle = theme.palette.primary.main
    ctx.globalAlpha = 0.55
    ctx.fill()
  }, [env, width, theme.palette.primary.main])

  const emit = (l: number, h: number) => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => onChange([l * max, h * max]))
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const begin = (mode: Drag['mode']) => (e: ReactPointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { mode, startX: e.clientX, lo, hi }
  }

  const move = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || width === 0) return
    const delta = (e.clientX - d.startX) / width
    if (d.mode === 'move') {
      const span = d.hi - d.lo
      const nl = clamp(d.lo + delta, 0, 1 - span)
      emit(nl, nl + span)
    } else if (d.mode === 'left') {
      emit(clamp(d.lo + delta, 0, d.hi - minSpan), d.hi)
    } else {
      emit(d.lo, clamp(d.hi + delta, d.lo + minSpan, 1))
    }
  }

  const end = () => {
    drag.current = null
  }

  const jump = (e: ReactPointerEvent) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const span = hi - lo
    const center = clamp((e.clientX - rect.left) / rect.width)
    const nl = clamp(center - span / 2, 0, 1 - span)
    emit(nl, nl + span)
  }

  const shade = theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)'
  const grip = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE,
    cursor: 'ew-resize',
    bgcolor: 'primary.main',
    opacity: 0.85,
    touchAction: 'none',
  } as const

  return (
    <Box sx={{ ml: `${left}px`, mr: `${right}px`, mt: 0.5, mb: 1 }}>
      <Box
        ref={trackRef}
        role="scrollbar"
        aria-orientation="horizontal"
        aria-label="Visible range"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(lo * 100)}
        onPointerDown={jump}
        sx={{
          position: 'relative',
          height: HEIGHT,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          cursor: 'pointer',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: HEIGHT }} />
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${lo * 100}%`, bgcolor: shade }} />
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${(1 - hi) * 100}%`, bgcolor: shade }} />
        <Box
          onPointerDown={begin('move')}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${lo * 100}%`,
            width: `${(hi - lo) * 100}%`,
            minWidth: 2 * HANDLE,
            border: 2,
            borderColor: 'primary.main',
            cursor: 'grab',
            touchAction: 'none',
            boxSizing: 'border-box',
          }}
        >
          <Box
            onPointerDown={begin('left')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            sx={{ ...grip, left: -2 }}
          />
          <Box
            onPointerDown={begin('right')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            sx={{ ...grip, right: -2 }}
          />
        </Box>
      </Box>
    </Box>
  )
}
