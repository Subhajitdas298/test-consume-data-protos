import { useContext } from 'react'
import { DataSourceContext } from './dataSourceContext'

export function useDataSource() {
  const ctx = useContext(DataSourceContext)
  if (!ctx) throw new Error('useDataSource must be used within a DataSourceProvider')
  return ctx
}
