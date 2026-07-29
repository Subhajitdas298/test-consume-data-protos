import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import GitHubIcon from '@mui/icons-material/GitHub'
import { Link } from 'react-router-dom'

import Page from '../components/Page'

const REPO_LINKS = [
  { href: 'https://github.com/Subhajitdas298/test-data-protos', label: 'Proto Definitions' },
  { href: 'https://github.com/Subhajitdas298/test-publish-data-protos', label: 'Publisher Service' },
  { href: 'https://github.com/Subhajitdas298/test-consume-data-protos', label: 'Consumer UI (this repo)' },
]

const CARDS = [
  {
    to: '/binary',
    title: 'Binary (Protobuf)',
    description: 'Fetches /api/data as raw protobuf binary and decodes it with the generated schema.',
  },
  {
    to: '/json',
    title: 'JSON',
    description: 'Fetches /api/data as JSON (same dataset, different representation).',
  },
]

export default function Home() {
  return (
    <Page title="Test Data Protos Consumer">
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={8} sx={{ mb: 8 }}>
        {REPO_LINKS.map((repo) => (
          <Card key={repo.href} sx={{ flex: 1 }} variant="outlined">
            <CardActionArea
              component="a"
              href={repo.href}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'flex', justifyContent: 'center', gap: 1, py: 1 }}
            >
              <GitHubIcon fontSize="small" />
              <Typography variant="body2">{repo.label}</Typography>
            </CardActionArea>
          </Card>
        ))}
      </Stack>

      <Typography sx={{ mb: 3 }}>
        Pick a representation to visualize. Use the toggle in the top bar to switch which
        backend (Spring MVC or WebFlux) it's fetched from.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={8}>
        {CARDS.map((card) => (
          <Card key={card.to} sx={{ flex: 1 }}>
            <CardActionArea component={Link} to={card.to} sx={{ height: '100%', p: 1 }}>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  {card.title}
                </Typography>
                <Typography color="text.secondary">{card.description}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Page>
  )
}
