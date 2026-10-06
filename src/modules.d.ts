// The gl2d dist bundle ships no typings of its own; reuse the ones from
// @types/plotly.js (the bundle exposes the same API surface we use).
declare module 'plotly.js-gl2d-dist-min' {
  import type * as PlotlyTypes from 'plotly.js'
  const Plotly: typeof PlotlyTypes
  export default Plotly
}
