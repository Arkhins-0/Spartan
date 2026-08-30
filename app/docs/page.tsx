import { Metadata } from 'next';
import {
  Typography,
  Box,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Chip,
  Stack,
} from '@mui/material';
import { DocsLinkButton } from '@/components/features/docs/DocsLink';
import { docsSections } from '@/lib/docs/config';

export const metadata: Metadata = {
  title: 'Documentation - Spartan',
  description: 'Comprehensive documentation for Spartan sports team management platform.',
};

export default function DocsHomePage() {
  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: '72ch' }}>
        Guides and references for launching a team, managing a season, and contributing to Spartan.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {docsSections.flatMap((section) =>
          section.items.map((item) => (
            <Card key={item.href} sx={{ display: 'flex', flexDirection: 'column' }}>
              <CardHeader
                title={
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Chip label={section.title} size="small" />
                    <Typography variant="h6" component="h2" noWrap>
                      {item.title}
                    </Typography>
                  </Stack>
                }
                disableTypography
              />
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </CardContent>
              <CardActions>
                <DocsLinkButton href={item.href}>Read guide</DocsLinkButton>
              </CardActions>
            </Card>
          )),
        )}
      </Box>
    </Box>
  );
}
