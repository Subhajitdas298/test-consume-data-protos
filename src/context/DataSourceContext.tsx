import { useState, type ReactNode } from 'react'
import { DataSourceContext } from './dataSourceContext'
import type { Backend } from './backends'

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend>('mvc')
  return (
    <DataSourceContext.Provider value={{ backend, setBackend }}>
      {children}
    </DataSourceContext.Provider>
  )
}
