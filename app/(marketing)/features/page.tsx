import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  Chip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Event as EventIcon,
  Notifications as NotificationsIcon,
  PhoneAndroid as PhoneAndroidIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { generatePageMetadata, getBreadcrumbSchema } from '@/lib/config/seo';
import StructuredData from '@/components/ui/StructuredData';

export const metadata = generatePageMetadata({
  title: 'Features',
  description: 'Discover all the features that make Spartan the perfect solution for motorsport championship management. Entry lists, race weekends, session timetables, marshal signup, and more.',
  path: '/features',
  keywords: ['championship features', 'entry list management', 'race weekend scheduling', 'motorsport software features'],
});

const PROSE_WIDTH = '68ch';

const features = [
  {
    icon: PeopleIcon,
    title: 'Entry List Management',
    description:
      'Manage your team entry list with ease. Track driver details, FMSCI licence numbers, crew roles, and availability all in one place.',
    highlights: ['Driver profiles', 'Licence tracking', 'Crew roles', 'Emergency contacts'],
  },
  {
    icon: EventIcon,
    title: 'Race Weekend Scheduling',
    description:
      'Schedule championship rounds with practice, qualifying, and race sessions, plus circuit, paddock, and scrutineering details.',
    highlights: ['Rounds & sessions', 'Circuit tracking', 'Session timetables', 'Scrutineering slots'],
  },
  {
    icon: CheckCircleIcon,
    title: 'Entry Confirmation',
    description:
      'Know who is on the grid for each round. Drivers and crew confirm with Going, Not Going, or Maybe status.',
    highlights: ['Real-time updates', 'Grid tracking', 'Status notifications', 'Team visibility'],
  },
  {
    icon: NotificationsIcon,
    title: 'Notifications',
    description:
      'Keep everyone informed with email notifications for invitations, session changes, and championship bulletins.',
    highlights: ['Email alerts', 'Round reminders', 'Status updates', 'Championship bulletins'],
  },
  {
    icon: EmailIcon,
    title: 'Invitations & Volunteer Signup',
    description:
      'Invite drivers and crew to join your team, and open marshal and volunteer signup for every race weekend. Track pending and accepted invitations.',
    highlights: ['Email invitations', 'Invite tracking', 'Expiration management', 'Automatic reminders'],
  },
  {
    icon: PhoneAndroidIcon,
    title: 'Mobile-First Design',
    description:
      'Access Spartan from any device. Our mobile-first design ensures a great experience on phones and tablets.',
    highlights: ['Responsive layout', 'Touch-optimized', 'Fast loading', 'Offline-ready'],
  },
];

export default function FeaturesPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Features', url: '/features' },
  ]);

  return (
    <>
      <StructuredData data={breadcrumbSchema} />

      {/* Page header */}
      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="eyebrow" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Features
          </Typography>
          <Typography variant="sectionTitle" component="h1" sx={{ mb: 1.5 }}>
            Everything You Need to Run Your Championship
          </Typography>
          <Typography variant="marketingBody" component="p" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
            A complete set of features designed to replace the spreadsheets, group chats, and email chains that run most paddocks.
          </Typography>
        </Container>
      </Box>

      {/* Feature grid */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                      <Icon sx={{ fontSize: 22, color: 'text.secondary' }} />
                      <Typography variant="featureTitle" component="h3">
                        {feature.title}
                      </Typography>
                    </Stack>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      {feature.description}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {feature.highlights.map((highlight) => (
                        <Chip key={highlight} label={highlight} size="small" />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Container>
      </Box>

      {/* Free + open source */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.default', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom>
            Free Championship Management, Open Source
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: PROSE_WIDTH }}>
            Spartan is free forever for teams — no subscriptions, per-driver fees, or feature gates.
            It is open-source under the Apache License 2.0 and community-driven, so you can self-host it anytime.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            <Chip label="Free Services" />
            <Chip label="No Subscriptions Today" />
            <Chip label="Open Source" />
          </Stack>
        </Container>
      </Box>
    </>
  );
}
