"use client";

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Box,
  Breadcrumbs,
  Container,
  Divider,
  Link as MuiLink,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MenuBook as DocsIcon, NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  docsHome,
  docsSections,
  getDocByHref,
  getDocsBreadcrumbs,
  normalizeDocsPath,
  searchDocs,
} from '@/lib/docs/config';

interface DocsShellProps {
  children: ReactNode;
  pathname?: string;
}

const SIDEBAR_WIDTH = 248;

/**
 * The documentation shell, in the console two-pane idiom: a flat sidebar card
 * (eyebrow section labels over 13px rows, selection a grey step and a heavier
 * label) beside a content pane that opens with the standard PageHeader. The
 * fixed marketing header sits above both, hence the top offset.
 */
export default function DocsShell({ children, pathname }: DocsShellProps) {
  const currentPathname = usePathname();
  const activePath = normalizeDocsPath(pathname ?? currentPathname);
  const [query, setQuery] = useState('');

  const breadcrumbs = useMemo(() => getDocsBreadcrumbs(activePath), [activePath]);
  const searchResults = useMemo(() => searchDocs(query), [query]);
  const currentDoc = getDocByHref(activePath) ?? docsHome;
  const isHome = currentDoc.href === docsHome.href;

  const breadcrumbNav = (
    <Breadcrumbs
      aria-label="documentation breadcrumbs"
      separator={<NavigateNextIcon sx={{ fontSize: 14 }} />}
    >
      {breadcrumbs.map((breadcrumb, index) => {
        const isLast = index === breadcrumbs.length - 1;

        if (isLast || !breadcrumb.href) {
          return (
            <Typography
              key={`${breadcrumb.label}-${index}`}
              variant="body2"
              sx={{ fontSize: '0.75rem', color: isLast ? 'text.primary' : 'text.secondary' }}
            >
              {breadcrumb.label}
            </Typography>
          );
        }

        return (
          <MuiLink
            key={breadcrumb.href}
            component={Link}
            href={breadcrumb.href}
            variant="body2"
            color="text.secondary"
            underline="hover"
            sx={{ fontSize: '0.75rem' }}
          >
            {breadcrumb.label}
          </MuiLink>
        );
      })}
    </Breadcrumbs>
  );

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: `${SIDEBAR_WIDTH}px minmax(0, 1fr)` },
          gap: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
          mt: { xs: '64px', md: '72px' },
        }}
      >
        <Paper
          component="aside"
          sx={{
            alignSelf: 'start',
            position: { md: 'sticky' },
            top: { md: 96 },
            maxHeight: { md: 'calc(100vh - 112px)' },
            overflowY: { md: 'auto' },
            overscrollBehavior: 'contain',
            border: '1px solid var(--sp-border)',
            borderRadius: 2,
            p: 1.5,
          }}
        >
          <Stack spacing={1.5}>
            <Box sx={{ px: 0.5 }}>
              <Typography variant="eyebrow" component="div" color="text.secondary">
                Documentation
              </Typography>
              <MuiLink
                component={Link}
                href={docsHome.href}
                color="text.primary"
                underline="hover"
                sx={{ display: 'block', fontSize: '0.875rem', fontWeight: isHome ? 600 : 500, mt: 0.25 }}
              >
                {docsHome.title}
              </MuiLink>
            </Box>

            <TextField
              placeholder="Search documentation"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              size="small"
              fullWidth
              slotProps={{ htmlInput: { 'aria-label': 'Search documentation' } }}
            />

            {query.trim() && (
              <Box aria-live="polite">
                <Typography variant="eyebrow" component="div" color="text.secondary" sx={{ px: 0.5, mb: 0.5 }}>
                  Search results
                </Typography>
                {searchResults.length > 0 ? (
                  <List dense disablePadding aria-label="Documentation search results">
                    {searchResults.map((result) => (
                      <ListItemButton key={result.href} component={Link} href={result.href}>
                        <ListItemText primary={result.title} secondary={result.description} />
                      </ListItemButton>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ px: 0.5 }}>
                    No documentation pages match your search.
                  </Typography>
                )}
              </Box>
            )}

            <Divider />

            <Stack component="nav" aria-label="Documentation navigation" spacing={1.5}>
              {docsSections.map((section) => (
                <Box key={section.title}>
                  <Typography
                    variant="eyebrow"
                    component="div"
                    color="text.secondary"
                    sx={{ px: 0.5, mb: 0.5 }}
                  >
                    {section.title}
                  </Typography>
                  <List dense disablePadding>
                    {section.items.map((item) => (
                      <ListItemButton
                        key={item.href}
                        component={Link}
                        href={item.href}
                        selected={activePath === item.href}
                      >
                        <ListItemText primary={item.title} />
                      </ListItemButton>
                    ))}
                  </List>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Paper>

        <Box component="main" id="main-content" tabIndex={-1} sx={{ minWidth: 0, outline: 'none' }}>
          <PageHeader
            icon={<DocsIcon />}
            title={currentDoc.title}
            subtitle={currentDoc.description}
            breadcrumbs={breadcrumbNav}
          />
          <Box sx={{ maxWidth: isHome ? 'none' : '72ch' }}>{children}</Box>
        </Box>
      </Box>
    </Container>
  );
}
