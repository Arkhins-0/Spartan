import { Container, Box, Typography, Stack } from '@mui/material';
import { Article as ArticleIcon } from '@mui/icons-material';
import { generatePageMetadata, getBreadcrumbSchema } from '@/lib/config/seo';
import StructuredData from '@/components/ui/StructuredData';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkButton } from '@/components/ui/NextLinkComposites';

export const metadata = generatePageMetadata({
  title: 'Blog',
  description: 'Insights, updates, and stories from the Spartan team. Product updates, best practices, and championship management tips.',
  path: '/blog',
  keywords: ['blog', 'updates', 'news', 'team management tips'],
});

const PROSE_WIDTH = '68ch';

export default function BlogPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
  ]);

  return (
    <>
      <StructuredData data={breadcrumbSchema} />

      {/* Page header */}
      <Box component="section" sx={{ bgcolor: 'background.default', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Typography variant="eyebrow" component="p" color="text.secondary" sx={{ mb: 1 }}>
            Blog
          </Typography>
          <Typography variant="sectionTitle" component="h1" sx={{ mb: 1.5 }}>
            Spartan Blog
          </Typography>
          <Typography variant="marketingBody" component="p" color="text.secondary" sx={{ maxWidth: PROSE_WIDTH }}>
            We&apos;re working on fresh content covering product updates, best practices, and stories from real race teams and championships.
          </Typography>
        </Container>
      </Box>

      {/* Coming soon */}
      <Box
        component="section"
        sx={{ bgcolor: 'background.paper', borderTop: '1px solid var(--sp-border)', py: { xs: 5, md: 7 } }}
      >
        <Container maxWidth="md">
          <EmptyState
            icon={<ArticleIcon />}
            title="No posts yet"
            description="Check back soon for our first posts. In the meantime, you can explore our documentation or reach out with ideas for topics you'd like to see."
            action={
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
                <LinkButton href="/docs" variant="contained">
                  Explore Documentation
                </LinkButton>
                <LinkButton href="/contact" variant="outlined">
                  Share Blog Ideas
                </LinkButton>
              </Stack>
            }
          />
        </Container>
      </Box>
    </>
  );
}
