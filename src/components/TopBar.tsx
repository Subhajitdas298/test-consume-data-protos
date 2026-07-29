import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Link } from 'react-router-dom'

import { BACKENDS, type Backend } from '../context/backends'
import { useDataSource } from '../context/useDataSource'

export default function TopBar({ title, showBack = false }: { title: string; showBack?: boolean }) {
  const { backend, setBackend } = useDataSource()

  return (
    <AppBar position="static">
      <Toolbar>
        {showBack && (
          <IconButton
            component={Link}
            to="/"
            edge="start"
            color="inherit"
            sx={{ mr: 2 }}
            aria-label="back to home"
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>

        <ToggleButtonGroup
          value={backend}
          exclusive
          size="large"
          onChange={(_, value: Backend | null) => value && setBackend(value)}
          sx={{ bgcolor: 'background.paper' }}
        >
          {Object.entries(BACKENDS).map(([key, { label }]) => (
            <ToggleButton
              key={key}
              value={key}
              sx={{ fontWeight: 'bold', px: { xs: 1.5, sm: 3 } }}
            >
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Toolbar>
    </AppBar>
  )
}
