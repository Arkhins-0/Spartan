import { Container, Typography, Box, Card, CardContent, CardHeader, Stack, Chip, Link } from '@mui/material';
import {
  Email as EmailIcon,
  GitHub as GitHubIcon,
  BugReport as BugReportIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';
import { generatePageMetadata, getBreadcrumbSchema } from '@/lib/config/seo';
import StructuredData from '@/components/ui/StructuredData';

export const metadata = generatePageMetadata({
  title: 'Contact',
  description: 'Get in touch with the Spartan team for support, feedback, or questions. We\'re here to help with your team management needs.',
  path: '/contact',
  keywords: ['contact', 'support', 'help', 'customer service'],
});

const PROSE_WIDTH = '68ch';

const channels = [
  {
    icon: EmailIcon,
    title: 'Email Support',
    description: 'For general inquiries, support questions, or feedback:',
    label: 'tech@ctrsports.in',
    href: 'mailto:tech@ctrsports.in',
    external: false,
  },
  {
    icon: GitHubIcon,
    title: 'GitHub',
    description: 'For open-source contributions, discussions, and community support:',
    label: 'github.com/Arkhins-0/Spartan',
    href: 'https://github.com/Arkhins-0/Spartan',
    external: true,
  },
  {
    icon: BugReportIcon,
    title: 'Report Issues',
    description: 'Found a bug or have a feature request? Submit an issue on GitHub:',
    label: 'Submit an Issue',
    href: 'https://github.com/Arkhins-0/Spartan/issues',
    external: true,
  },
  {
    icon: InstagramIcon,
    title: 'Instagram',
    description: 'Product updates, releases, and behind-the-scenes:',
    label: '@arkhins',
    href: 'https://instagram.com/arkhins',
    external: true,
  },
  {
    icon: LinkedInIcon,
    title: 'LinkedIn',
    description: 'Partnership, association, and business enquiries:',
    label: 'in/krishna-vijay',
    href: 'https://linkedin.com/in/krishna-vijay',
    external: true,
  },
];

const docsLinks = [
  { label: 'Documentation', href: '/docs' },
  { label: 'User Guide', href: '/docs/user-guide' },
  { label: 'FAQ', href: '/docs/guides' },
];

export default function ContactPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Contact', url: '/contact' },
  ]);

  return (
    <>
      <StructuredData data={breadcrumbSchema} />

      {/* Page header */}
      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="eyebrow" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Contact
          </Typography>
          <Typography variant="sectionTitle" component="h1" sx={{ mb: 1.5 }}>
            Contact Us
          </Typography>
          <Typography variant="marketingBody" component="p" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
            We&apos;re here to help. Reach out with questions, feedback, or support requests.
          </Typography>
        </Container>
      </Box>

      {/* Channels */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <Card key={channel.title} sx={{ display: 'flex', flexDirection: 'column' }}>
                  <CardHeader
                    avatar={<Icon sx={{ fontSize: 22, color: 'text.secondary' }} />}
                    title={channel.title}
                    slotProps={{ title: { component: 'h2' } }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {channel.description}
                    </Typography>
                    <Link
                      href={channel.href}
                      variant="body1"
                      {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {channel.label}
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Container>
      </Box>

      {/* What to expect */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.default', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" sx={{ mb: 3 }}>
            What to Expect
          </Typography>
          <Stack spacing={3} sx={{ maxWidth: PROSE_WIDTH }}>
            <Box>
              <Typography variant="h6" component="h3" gutterBottom>
                Response Time
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We aim to respond to all inquiries within 24-48 hours during business days.
                For urgent issues affecting your team, please indicate priority in your message.
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" component="h3" gutterBottom>
                Support Hours
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Our core support hours are Monday-Friday, 9 AM - 6 PM IST. Community support
                via GitHub Discussions is available 24/7.
              </Typography>
            </Box>
            <Box>
              <Typography variant="h6" component="h3" gutterBottom>
                Before Contacting
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                To help us assist you faster, please check our documentation first:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {docsLinks.map((link) => (
                  <Chip
                    key={link.href}
                    label={link.label}
                    component="a"
                    href={link.href}
                    clickable
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Community */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom>
            Community
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: PROSE_WIDTH }}>
            Spartan is an open-source project built and maintained by{' '}
            <Link href="https://arkhins.com" target="_blank" rel="noopener noreferrer">
              Arkhins
            </Link>
            . Join our GitHub Discussions to connect with other users, share ideas, and
            help shape the future of the platform.
          </Typography>
        </Container>
      </Box>
    </>
  );
}
