import type { ReactNode } from 'react'
import Container from '@mui/material/Container'
import TopBar from './TopBar'

export default function Page({
  title,
  showBack = false,
  showBackendToggle = true,
  children,
}: {
  title: string
  showBack?: boolean
  showBackendToggle?: boolean
  children: ReactNode
}) {
  return (
    <>
      <TopBar title={title} showBack={showBack} showBackendToggle={showBackendToggle} />
      <Container sx={{ py: { xs: 2, sm: 4 } }}>{children}</Container>
    </>
  )
}
