'use client';

import { Box, Container, Typography, Stack } from '@mui/material';
import CTAButton from './CTAButton';

const trustSignals = ['No Credit Card', 'Free forever for teams', 'Ready in 3 Minutes'];

export default function FinalCTA() {
  return (
    <Box
      component="section"
      aria-labelledby="final-cta-heading"
      sx={{
        py: { xs: 8, md: 12 },
        bgcolor: 'background.paper',
        borderTop: '1px solid var(--sp-border)',
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center' }}>
          <Typography
            id="final-cta-heading"
            variant="sectionTitle"
            component="h2"
            sx={{ color: 'text.primary' }}
          >
            Ready to Win Back Your Time?
          </Typography>
          <Typography
            variant="marketingBody"
            sx={{ color: 'text.secondary', maxWidth: 600 }}
          >
            Join coaches and team managers who&apos;ve ditched the spreadsheets and endless
            group chats. Get organized in minutes, stay organized all season.
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1.5, sm: 2 }}
            justifyContent="center"
            sx={{ width: { xs: '100%', sm: 'auto' }, pt: 1 }}
          >
            <CTAButton
              href="/signup"
              variant="contained"
              size="large"
              trackingAction="final_cta_get_started_click"
              trackingLabel="final_cta_section"
              sx={{ minWidth: { sm: 200 } }}
            >
              Start Free Today
            </CTAButton>
            <CTAButton
              href="/features"
              variant="outlined"
              size="large"
              trackingAction="final_cta_learn_more_click"
              trackingLabel="final_cta_section"
              sx={{ minWidth: { sm: 180 } }}
            >
              See Features
            </CTAButton>
          </Stack>

          {/* Trust indicators */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 3 }}
            justifyContent="center"
            alignItems="center"
            sx={{ pt: 1 }}
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
        </Stack>
      </Container>
    </Box>
  );
}
