'use client';

import { Box, Container, Typography, Stack } from '@mui/material';
import CTAButton from './CTAButton';
import BrandLogo from '@/components/ui/BrandLogo';
import { marketingEvents } from '@/lib/analytics/tracking';
import { useEffect } from 'react';

const trustSignals = ['Free forever for teams', 'No Credit Card', 'Mobile-First'];

export default function HeroSection() {
  // Track hero section view for engagement analytics
  useEffect(() => {
    marketingEvents.heroSectionView();
  }, []);

  return (
    <Box
      component="section"
      aria-labelledby="landing-hero-heading"
      sx={{
        bgcolor: 'background.default',
        py: { xs: 8, md: 12 },
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={4} alignItems="center" sx={{ textAlign: 'center' }}>
          <BrandLogo variant="full" size="xlarge" priority interactive={false} href={null} />

          <Typography
            id="landing-hero-heading"
            variant="heroTitle"
            component="h1"
            sx={{ color: 'text.primary', maxWidth: 720 }}
          >
            Simplify Your Season.{' '}
            <Box component="span" sx={{ color: 'accent.main' }}>
              Play More.
            </Box>
          </Typography>

          <Typography
            variant="heroSubtitle"
            component="p"
            sx={{ color: 'text.secondary', maxWidth: 640 }}
          >
            The free, open-source team management platform built for coaches and players.
            Replace chaotic spreadsheets and group chats with one organized hub for rosters,
            schedules, attendance, and communication.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1.5, sm: 2 }}
            justifyContent="center"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            <CTAButton
              href="/signup"
              variant="contained"
              size="large"
              trackingAction="hero_get_started_click"
              trackingLabel="hero_section"
              sx={{ minWidth: { sm: 200 } }}
            >
              Get Started Free
            </CTAButton>
            <CTAButton
              href="/features"
              variant="outlined"
              size="large"
              trackingAction="hero_see_features_click"
              trackingLabel="hero_section"
              sx={{ minWidth: { sm: 180 } }}
            >
              Explore Features
            </CTAButton>
          </Stack>

          {/* Trust indicators */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 3 }}
            justifyContent="center"
            alignItems="center"
          >
            {trustSignals.map((signal) => (
              <Box key={signal} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
                >
                  {signal}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 560, fontSize: '0.8125rem' }}
          >
            Built by coaches, for coaches. Open-source and community-driven—because team
            management should be simple, transparent, and free.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
