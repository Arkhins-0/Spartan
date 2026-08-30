'use client';

import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';

const features = [
  {
    icon: GroupsIcon,
    title: 'Entry List Management',
    description: 'Keep drivers, licences, crew chiefs, team officials, and emergency details organised in one secure entry list.',
    demoLabel: 'Live entry list demo',
    stats: ['24 drivers', '6 crew', '2 licences pending'],
    progress: 86,
  },
  {
    icon: EventIcon,
    title: 'Race Weekends & Sessions',
    description: 'Schedule championship rounds with practice, qualifying, and race sessions and instant entry confirmation so organisers know who is on the grid.',
    demoLabel: 'Grid snapshot demo',
    stats: ['22 confirmed', '2 maybe', '1 withdrawn'],
    progress: 78,
  },
  {
    icon: NotificationsActiveIcon,
    title: 'Automated Communications',
    description: 'Send targeted updates and reminders without chasing responses across multiple channels.',
    demoLabel: 'Reminder queue demo',
    stats: ['Reminder queued', '48h before', 'Paddock notified'],
    progress: 92,
  },
  {
    icon: PhoneIphoneIcon,
    title: 'Mobile-First Experience',
    description: 'Manage the championship from the pit wall, paddock, or marshal post with touch-friendly workflows on any device.',
    demoLabel: 'Mobile dashboard demo',
    stats: ['Sat 09:30', 'Qualifying - Round 3', 'Tap to confirm'],
    progress: 88,
  },
];

export default function FeaturesPreview() {
  return (
    <Box
      component="section"
      aria-labelledby="feature-showcase-heading"
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            id="feature-showcase-heading"
            variant="sectionTitle"
            component="h2"
            sx={{ mb: 2, color: 'text.primary' }}
          >
            See the Championship Run from{' '}
            <Box component="span" sx={{ color: 'accent.main' }}>
              One Race Control
            </Box>
          </Typography>
          <Typography
            variant="marketingBody"
            sx={{ color: 'text.secondary', maxWidth: 640, mx: 'auto' }}
          >
            Visual snapshots show how Spartan replaces spreadsheets and group chats with clear,
            actionable views for entry lists, race weekends, grids, and bulletins.
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const headingId = `feature-preview-${index}-heading`;
            return (
              <Grid size={{ xs: 12, md: 6 }} key={feature.title}>
                <Card
                  component="article"
                  aria-labelledby={headingId}
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack spacing={2} sx={{ height: '100%' }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          aria-hidden
                          sx={{
                            display: 'flex',
                            flexShrink: 0,
                            color: 'text.secondary',
                            mt: 0.25,
                            '& .MuiSvgIcon-root': { fontSize: 24 },
                          }}
                        >
                          <Icon />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            id={headingId}
                            variant="featureTitle"
                            component="h3"
                            sx={{ color: 'text.primary' }}
                          >
                            {feature.title}
                          </Typography>
                          <Chip label={feature.demoLabel} size="small" sx={{ mt: 1 }} />
                        </Box>
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>

                      {/* Demo snapshot: a muted inset panel on the card */}
                      <Box
                        sx={{
                          mt: 'auto',
                          p: 2,
                          borderRadius: 1.5,
                          bgcolor: 'background.default',
                          border: '1px solid var(--sp-border)',
                        }}
                      >
                        <Stack spacing={1.5}>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {feature.stats.map((stat) => (
                              <Chip key={stat} label={stat} size="small" variant="outlined" />
                            ))}
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={feature.progress}
                            aria-label={`${feature.demoLabel} progress`}
                          />
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
