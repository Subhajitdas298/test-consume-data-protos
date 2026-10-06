export interface Series {
  x: number[]
  y: number[]
}

// Largest-Triangle-Three-Buckets: keeps the visual shape (peaks and troughs) of a long
// series using only `threshold` points. x is the original index of each kept point.
export function lttb(values: number[], threshold: number): Series {
  const n = values.length
  if (threshold >= n || threshold < 3) {
    return { x: Array.from(values, (_, i) => i), y: values }
  }
  const x = new Array<number>(threshold)
  const y = new Array<number>(threshold)
  x[0] = 0
  y[0] = values[0]
  const bucket = (n - 2) / (threshold - 2)
  let a = 0
  for (let i = 0; i < threshold - 2; i++) {
    // Average of the next bucket is the third triangle vertex.
    const nextStart = Math.floor((i + 1) * bucket) + 1
    const nextEnd = Math.min(Math.floor((i + 2) * bucket) + 1, n)
    let avgX = 0
    let avgY = 0
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += j
      avgY += values[j]
    }
    const count = nextEnd - nextStart
    avgX /= count
    avgY /= count

    const start = Math.floor(i * bucket) + 1
    const end = nextStart
    let best = -1
    let pick = start
    for (let j = start; j < end; j++) {
      const area = Math.abs((a - avgX) * (values[j] - values[a]) - (a - j) * (avgY - values[a]))
      if (area > best) {
        best = area
        pick = j
      }
    }
    x[i + 1] = pick
    y[i + 1] = values[pick]
    a = pick
  }
  x[threshold - 1] = n - 1
  y[threshold - 1] = values[n - 1]
  return { x, y }
}

// Catmull-Rom interpolation, `steps` samples per segment. scattergl can only draw
// straight segments, so the curve is baked into extra points instead.
export function densify({ x, y }: Series, steps: number): Series {
  const n = x.length
  if (n < 3) return { x, y }
  const outX: number[] = []
  const outY: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [y[Math.max(i - 1, 0)], y[i], y[i + 1], y[Math.min(i + 2, n - 1)]]
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const t2 = t * t
      const t3 = t2 * t
      outX.push(x[i] + (x[i + 1] - x[i]) * t)
      outY.push(
        0.5 *
          (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3),
      )
    }
  }
  outX.push(x[n - 1])
  outY.push(y[n - 1])
  return { x: outX, y: outY }
}
