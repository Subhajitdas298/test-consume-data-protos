/**
 * Reads an axis range out of a plotly_relayout event: a [lo, hi] pair, `'auto'` when the axis was
 * reset to autorange, or undefined when the event doesn't touch that axis.
 */
export function relayoutRange(event: Record<string, unknown>, axis: 'xaxis' | 'yaxis'): [number, number] | 'auto' | undefined {
  const lo = event[`${axis}.range[0]`]
  const hi = event[`${axis}.range[1]`]
  if (typeof lo === 'number' && typeof hi === 'number') return [lo, hi]
  const pair = event[`${axis}.range`]
  if (Array.isArray(pair) && typeof pair[0] === 'number' && typeof pair[1] === 'number') return [pair[0], pair[1]]
  if (event[`${axis}.autorange`]) return 'auto'
  return undefined
}
