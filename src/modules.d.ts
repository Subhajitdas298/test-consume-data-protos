// The full dist bundle ships no typings of its own; reuse the ones from @types/plotly.js
// (it exposes the same API).
declare module 'plotly.js-dist' {
  import type * as PlotlyTypes from 'plotly.js'
  const Plotly: typeof PlotlyTypes
  export default Plotly
}
