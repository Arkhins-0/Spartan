import { Container, Box, Typography, Card, CardContent, CardHeader, Stack } from '@mui/material';
import { generatePageMetadata, getBreadcrumbSchema } from '@/lib/config/seo';
import StructuredData from '@/components/ui/StructuredData';

export const metadata = generatePageMetadata({
  title: 'Security',
  description: 'Overview of Spartan\'s security practices and upcoming improvements. Learn how we keep your team data safe.',
  path: '/security',
  keywords: ['security', 'data protection', 'encryption', 'privacy'],
});

const PROSE_WIDTH = '68ch';

const sections = [
  {
    title: 'Current Practices',
    body:
      'Spartan uses industry-standard encryption in transit (HTTPS) and role-based access controls inside the app. Production credentials are stored in encrypted secrets managers.',
  },
  {
    title: 'On Our Roadmap',
    body:
      "We're working on SOC 2 aligned processes, regular penetration testing, and customer-facing security tooling such as audit logging and two-factor authentication.",
  },
  {
    title: 'Report a Concern',
    body:
      'Found a vulnerability? Email tech@ctrsports.in. We acknowledge reports within two business days and will work with you on responsible disclosure.',
  },
];

export default function SecurityPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Security', url: '/security' },
  ]);

  return (
    <>
      <StructuredData data={breadcrumbSchema} />

      {/* Page header */}
      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="eyebrow" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Security
          </Typography>
          <Typography variant="sectionTitle" component="h1" sx={{ mb: 1.5 }}>
            Security at Spartan
          </Typography>
          <Typography variant="marketingBody" component="p" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
            Keeping team data safe is core to the product. Here&apos;s what we have today and what&apos;s coming next.
          </Typography>
        </Container>
      </Box>

      {/* Practices */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="lg">
          <Stack spacing={2} sx={{ maxWidth: PROSE_WIDTH }}>
            {sections.map((section) => (
              <Card key={section.title}>
                <CardHeader title={section.title} slotProps={{ title: { component: 'h2' } }} />
                <CardContent>
                  <Typography variant="body1" color="text.secondary">
                    {section.body}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
