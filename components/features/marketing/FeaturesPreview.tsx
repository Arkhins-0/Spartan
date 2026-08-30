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
    title: 'Team Roster Management',
    description: 'Keep players, guardians, team officials, and emergency details organized in one secure roster.',
    demoLabel: 'Live roster demo',
    stats: ['18 players', '4 staff', '2 invites pending'],
    progress: 86,
  },
  {
    icon: EventIcon,
    title: 'Event Scheduling & RSVPs',
    description: 'Schedule games and practices with instant RSVP tracking so coaches know who is available.',
    demoLabel: 'Attendance snapshot demo',
    stats: ['14 going', '2 maybe', '1 out'],
    progress: 78,
  },
  {
    icon: NotificationsActiveIcon,
    title: 'Automated Communications',
    description: 'Send targeted updates and reminders without chasing responses across multiple channels.',
    demoLabel: 'Reminder queue demo',
    stats: ['Reminder queued', '48h before', 'Team notified'],
    progress: 92,
  },
  {
    icon: PhoneIphoneIcon,
    title: 'Mobile-First Experience',
    description: 'Manage the season from the rink, car, or sideline with touch-friendly workflows on any device.',
    demoLabel: 'Mobile dashboard demo',
    stats: ['Tonight 6:30 PM', 'Game vs Hawks', 'Tap to RSVP'],
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
            See the Season Run from{' '}
            <Box component="span" sx={{ color: 'accent.main' }}>
              One Playbook
            </Box>
          </Typography>
          <Typography
            variant="marketingBody"
            sx={{ color: 'text.secondary', maxWidth: 640, mx: 'auto' }}
          >
            Visual snapshots show how Spartan replaces spreadsheets and group chats with clear,
            actionable views for rosters, schedules, RSVPs, and updates.
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
