'use client';

import { Box, Card, CardContent, Container, Typography, Grid, Stack } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const steps = [
  {
    icon: PersonAddIcon,
    step: '1',
    title: 'Create Your Account',
    description: 'Sign up for free in seconds. No credit card required.',
  },
  {
    icon: GroupAddIcon,
    step: '2',
    title: 'Set Up Your Team',
    description: 'Add your team details and invite players via email.',
  },
  {
    icon: RocketLaunchIcon,
    step: '3',
    title: 'Start Managing',
    description: 'Schedule events, track RSVPs, and stay organized all season long.',
  },
];

export default function HowItWorks() {
  return (
    <Box
      component="section"
      aria-labelledby="how-it-works-heading"
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: 'background.paper',
        borderTop: '1px solid var(--sp-border)',
        borderBottom: '1px solid var(--sp-border)',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            id="how-it-works-heading"
            variant="sectionTitle"
            component="h2"
            sx={{ mb: 2, color: 'text.primary' }}
          >
            Get Started in{' '}
            <Box component="span" sx={{ color: 'accent.main' }}>
              3 Simple Steps
            </Box>
          </Typography>
          <Typography
            variant="marketingBody"
            sx={{ color: 'text.secondary', maxWidth: 640, mx: 'auto' }}
          >
            From signup to scheduling your first event—it&apos;s that simple. No complicated setup,
            no training required.
          </Typography>
        </Box>

        <Grid container spacing={2} alignItems="stretch">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Grid size={{ xs: 12, md: 4 }} key={step.step}>
                <Card sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography
                          variant="dataLabel"
                          component="span"
                          aria-label={`Step ${step.step}`}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            border: '1px solid var(--sp-border-input)',
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                            flexShrink: 0,
                          }}
                        >
                          {step.step}
                        </Typography>
                        <Box
                          aria-hidden
                          sx={{
                            display: 'flex',
                            color: 'text.secondary',
                            '& .MuiSvgIcon-root': { fontSize: 22 },
                          }}
                        >
                          <Icon />
                        </Box>
                      </Stack>
                      <Typography variant="featureTitle" component="h3" sx={{ color: 'text.primary' }}>
                        {step.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.description}
                      </Typography>
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
