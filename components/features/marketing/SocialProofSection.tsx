'use client';

import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import GroupsIcon from '@mui/icons-material/Groups';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';

const testimonials = [
  {
    quote:
      'Spartan is built around the way volunteer race organisers actually work: quick entry-list updates, fast confirmations, and one place to check before the drivers briefing.',
    name: 'Club championship organiser',
    role: 'Representative feedback',
    initials: 'YC',
  },
  {
    quote:
      'The mobile-first layout makes it easy to answer the only question the crew keeps asking: which session is next and who is on the grid?',
    name: 'Team manager',
    role: 'Representative feedback',
    initials: 'TM',
  },
  {
    quote:
      'A public roadmap and open-source codebase make it easier for clubs and circuits to trust the platform and shape what gets built next.',
    name: 'Circuit operator',
    role: 'Community preview',
    initials: 'CO',
  },
];

const statistics = [
  {
    id: 'open-source',
    value: 100,
    suffix: '%',
    label: 'Open-source core',
    description: 'Public code, public roadmap, and transparent project direction.',
    icon: <GitHubIcon />,
  },
  {
    id: 'workflows',
    value: 4,
    suffix: '',
    label: 'Core workflows',
    description: 'Entry lists, race weekends, volunteers, and paddock communication in one hub.',
    icon: <GroupsIcon />,
  },
  {
    id: 'touch-target',
    value: 44,
    suffix: 'px',
    label: 'Mobile touch targets',
    description: 'Designed for pit-wall, paddock, and marshal-post updates.',
    icon: <PhoneIphoneIcon />,
  },
  {
    id: 'setup',
    value: 3,
    suffix: '',
    label: 'Setup steps',
    description: 'Create an account, set up a team or championship, and invite your entries.',
    icon: <EventAvailableIcon />,
  },
];

const trustSignals = [
  'Public GitHub repository',
  'Community-shaped roadmap',
  'No credit card required',
  'Mobile-first design',
];

type Testimonial = (typeof testimonials)[number];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <Card
      role="article"
      aria-label={`${testimonial.name} testimonial`}
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <CardContent
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="body1" color="text.primary" sx={{ flexGrow: 1 }}>
          “{testimonial.quote}”
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 36, height: 36 }}>{testimonial.initials}</Avatar>
          <Box>
            <Typography variant="subtitle2">{testimonial.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {testimonial.role}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function AnimatedCounter({
  value,
  suffix = '',
  duration = 900,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const timer = window.setTimeout(() => setDisplayValue(value), 0);
      return () => window.clearTimeout(timer);
    }

    const steps = Math.min(Math.abs(value), 24) || 1;
    let currentStep = 0;
    const timer = window.setInterval(() => {
      currentStep += 1;

      if (currentStep >= steps) {
        setDisplayValue(value);
        window.clearInterval(timer);
        return;
      }

      setDisplayValue(Math.round((value / steps) * currentStep));
    }, duration / steps);

    return () => window.clearInterval(timer);
  }, [duration, value]);

  return (
    <>
      {displayValue.toLocaleString()}
      {suffix}
    </>
  );
}

export default function SocialProofSection() {
  return (
    <Box
      component="section"
      aria-labelledby="social-proof-heading"
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            id="social-proof-heading"
            variant="sectionTitle"
            component="h2"
            sx={{ mb: 2, color: 'text.primary' }}
          >
            Trusted by the People Who Keep Championships Moving
          </Typography>
          <Typography
            variant="marketingBody"
            sx={{ color: 'text.secondary', maxWidth: 640, mx: 'auto' }}
          >
            Representative feedback, transparent community signals, and practical credibility
            markers for organisers, team managers, and clubs evaluating Spartan.
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          {testimonials.map((testimonial) => (
            <Grid size={{ xs: 12, md: 4 }} key={testimonial.name}>
              <TestimonialCard testimonial={testimonial} />
            </Grid>
          ))}
        </Grid>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box>
                  <Typography variant="featureTitle" component="h3" sx={{ mb: 0.5 }}>
                    Credibility You Can Verify
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Static, build-safe indicators highlight what is already true without relying
                    on external API calls during page rendering.
                  </Typography>
                </Box>
                <Chip icon={<VerifiedUserIcon />} label="Open community project" variant="outlined" />
              </Stack>

              <Grid container spacing={2}>
                {statistics.map((stat) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.id}>
                    <Box
                      data-testid={`stat-${stat.id}`}
                      sx={{
                        height: '100%',
                        p: 2,
                        borderRadius: 1.5,
                        bgcolor: 'background.default',
                        border: '1px solid var(--sp-border)',
                      }}
                    >
                      <Box
                        aria-hidden
                        sx={{ color: 'text.secondary', mb: 1.5, display: 'flex', '& .MuiSvgIcon-root': { fontSize: 20 } }}
                      >
                        {stat.icon}
                      </Box>
                      <Typography variant="scoreboard" component="p" sx={{ mb: 0.5, color: 'text.primary' }}>
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </Typography>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        {stat.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.description}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                useFlexGap
                flexWrap="wrap"
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                {trustSignals.map((signal) => (
                  <Chip key={signal} label={signal} variant="outlined" sx={{ justifyContent: 'center' }} />
                ))}
                <Typography
                  component="a"
                  href="https://github.com/Arkhins-0/Spartan"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    color: 'text.primary',
                    fontWeight: 600,
                    textDecoration: 'none',
                    px: 1,
                    '&:hover': { textDecoration: 'underline', textUnderlineOffset: 3 },
                  }}
                >
                  <GitHubIcon fontSize="small" />
                  View Spartan on GitHub
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
