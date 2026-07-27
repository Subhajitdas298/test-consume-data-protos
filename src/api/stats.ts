import type { DateRecord, Root } from '@subhajitdas298/test-data-protos'

export const FIELDS = 'abcdefghijklmnopqrstuvwxyz'.split('') as (keyof DateRecord)[]

export interface FieldStats {
  day: number
  field: string
  count: number
  min: number
  max: number
  avg: number
}

export function summarize(root: Root): FieldStats[] {
  const stats: FieldStats[] = []

  root.data.forEach((entry) => {
    entry.dates.forEach((record, day) => {
      FIELDS.forEach((field) => {
        const values = record[field] as number[]
        if (values.length === 0) return

        let sum = 0
        let min = values[0]
        let max = values[0]
        for (const value of values) {
          sum += value
          if (value < min) min = value
          if (value > max) max = value
        }

        stats.push({
          day,
          field: field as string,
          count: values.length,
          min,
          max,
          avg: sum / values.length,
        })
      })
    })
  })

  return stats
}

export function totalValueCount(stats: FieldStats[]): number {
  return stats.reduce((sum, s) => sum + s.count, 0)
}
