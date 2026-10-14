export type PlotlyModule = typeof import('plotly.js-gl2d-dist-min').default

let plotlyPromise: Promise<PlotlyModule> | undefined

// Loaded lazily so the ~1.5 MB Plotly bundle only ships to the chart routes.
export function loadPlotly(): Promise<PlotlyModule> {
  plotlyPromise ??= import('plotly.js-gl2d-dist-min')
    .then((module) => module.default)
    .catch((err: unknown) => {
      plotlyPromise = undefined
      throw err
    })
  return plotlyPromise
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))

// The basic bundle has `bar` (the gl2d one doesn't) but no WebGL traces.
let basicPromise: Promise<PlotlyModule> | undefined

export function loadBasicPlotly(): Promise<PlotlyModule> {
  basicPromise ??= import('plotly.js-basic-dist-min')
    .then((module) => module.default)
    .catch((err: unknown) => {
      basicPromise = undefined
      throw err
    })
  return basicPromise
}
