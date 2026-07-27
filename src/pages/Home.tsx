import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router-dom'

import Page from '../components/Page'

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
      <Typography sx={{ mb: 3 }}>Pick a data source to visualize.</Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
