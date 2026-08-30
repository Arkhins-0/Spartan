import { Metadata } from 'next';
import { Container, Typography, Box, Card, CardContent, Link, Stack } from '@mui/material';

export const metadata: Metadata = {
  title: 'About - Spartan',
  description: 'Learn about Spartan\'s mission to simplify sports team management for everyone.',
};

const PROSE_WIDTH = '68ch';

const values = [
  {
    title: 'Free & Transparent',
    description:
      'Free forever for teams. Paid tiers exist only for leagues and clubs, and we never charge teams or serve third-party ads.',
  },
  {
    title: 'User-Focused',
    description: 'We prioritize simplicity and usability, ensuring our platform works for everyone.',
  },
  {
    title: 'Privacy-Respecting',
    description:
      "Your data is yours. We don't sell information or use it for anything beyond providing our service.",
  },
  {
    title: 'Community-Driven',
    description: 'Our roadmap is shaped by user feedback and community contributions.',
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Page header */}
      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="eyebrow" component="p" color="text.secondary" sx={{ mb: 1 }}>
            About
          </Typography>
          <Typography variant="sectionTitle" component="h1" sx={{ mb: 1.5 }}>
            About Spartan
          </Typography>
          <Typography variant="marketingBody" component="p" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
            A free, open-source platform dedicated to simplifying sports team management.
          </Typography>
        </Container>
      </Box>

      {/* Mission + story */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Stack spacing={5} sx={{ maxWidth: PROSE_WIDTH }}>
            <Box>
              <Typography variant="h3" component="h2" gutterBottom>
                Our Mission
              </Typography>
              <Typography variant="body1" paragraph>
                Spartan exists to provide a single source of truth for sports team organization,
                replacing the chaos of spreadsheets, group chats, and email chains with a streamlined
                platform that keeps everyone on the same page.
              </Typography>
              <Typography variant="body1" paragraph>
                We believe that managing a sports team shouldn&apos;t require expensive software, complex
                tools, or paid subscriptions. Spartan is free forever for teams — no subscription
                billing, no per-player fees, and no third-party ads.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h3" component="h2" gutterBottom>
                Why We Built This
              </Typography>
              <Typography variant="body1" paragraph>
                Team managers and coaches spend countless hours coordinating schedules, tracking
                attendance, and keeping everyone informed. We&apos;ve experienced the frustration of
                juggling multiple tools and platforms firsthand.
              </Typography>
              <Typography variant="body1" paragraph>
                Spartan brings together the essential features teams need—roster management,
                event scheduling, RSVP tracking, and communication—in one intuitive platform
                designed with mobile-first accessibility in mind.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h3" component="h2" gutterBottom>
                Open Source & Community
              </Typography>
              <Typography variant="body1" paragraph>
                Spartan is open-source software under the Apache License 2.0,
                built by the community, for the community. The source code is publicly available,
                and we welcome contributions, feedback, and ideas from users and developers alike.
                The Spartan name and logo are trademarks of Arkhins (see TRADEMARKS.md).
              </Typography>
              <Typography variant="body1" paragraph>
                Visit our{' '}
                <Link href="https://github.com/Arkhins-0/Spartan" target="_blank" rel="noopener noreferrer">
                  GitHub repository
                </Link>
                {' '}to contribute, report issues, or learn more about the project.
              </Typography>
            </Box>

            <Box>
              <Typography variant="h3" component="h2" gutterBottom>
                Who Builds It
              </Typography>
              <Typography variant="body1" paragraph>
                Spartan is built and maintained by{' '}
                <Link href="https://arkhins.com" target="_blank" rel="noopener noreferrer">
                  Arkhins
                </Link>
                . Reach the team at{' '}
                <Link href="mailto:tech@ctrsports.in">tech@ctrsports.in</Link>, or find us on{' '}
                <Link href="https://github.com/Arkhins-0" target="_blank" rel="noopener noreferrer">
                  GitHub
                </Link>
                ,{' '}
                <Link href="https://instagram.com/arkhins" target="_blank" rel="noopener noreferrer">
                  Instagram
                </Link>
                , and{' '}
                <Link href="https://linkedin.com/in/krishna-vijay" target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </Link>
                .
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Spartan is a fork of the OpenLeague project and is not affiliated with,
                endorsed by, or sponsored by OpenLeague.
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Values */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.default', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" sx={{ mb: 3 }}>
            Our Values
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {values.map((value) => (
              <Card key={value.title}>
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {value.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {value.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>
    </>
  );
}
