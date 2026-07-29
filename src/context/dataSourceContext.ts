import { createContext } from 'react'
import type { Backend } from './backends'

export interface DataSourceContextValue {
  backend: Backend
  setBackend: (backend: Backend) => void
}

export const DataSourceContext = createContext<DataSourceContextValue | null>(null)
