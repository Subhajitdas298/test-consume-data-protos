import type { ReactNode } from 'react'
import Container from '@mui/material/Container'
import TopBar from './TopBar'

export default function Page({
  title,
  showBack = false,
  children,
}: {
  title: string
  showBack?: boolean
  children: ReactNode
}) {
  return (
    <>
      <TopBar title={title} showBack={showBack} />
      <Container sx={{ py: 4 }}>{children}</Container>
    </>
  )
}
