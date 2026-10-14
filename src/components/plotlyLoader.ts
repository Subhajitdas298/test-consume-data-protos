export type PlotlyModule = typeof import('plotly.js-dist').default

let plotlyPromise: Promise<PlotlyModule> | undefined

// Loaded lazily so the Plotly bundle only ships to the chart routes.
export function loadPlotly(): Promise<PlotlyModule> {
  plotlyPromise ??= import('plotly.js-dist')
    .then((module) => module.default)
    .catch((err: unknown) => {
      plotlyPromise = undefined
      throw err
    })
  return plotlyPromise
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err))
