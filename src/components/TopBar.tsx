import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Link } from 'react-router-dom'

export default function TopBar({ title, showBack = false }: { title: string; showBack?: boolean }) {
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
        <Typography variant="h6" component="h1">
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  )
}
