'use client';

import Link from 'next/link';
import {
  Box,
  Container,
  Typography,
  Stack,
  Divider,
  IconButton,
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import Logo from '@/components/ui/Logo';

const footerSections = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Get Started', href: '/get-started' },
      { label: 'Roadmap', href: '/docs/roadmap' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'User Guide', href: '/docs/user-guide' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Guides', href: '/docs/guides' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'Security', href: '/security' },
    ],
  },
];

// Social icons are muted text that steps up to text.primary on hover — no
// brand colours, so the row reads the same in both schemes.
const socialLinks = [
  { icon: GitHubIcon, href: 'https://github.com/Arkhins-0/Spartan', label: 'GitHub' },
  { icon: InstagramIcon, href: 'https://instagram.com/arkhins', label: 'Instagram' },
  { icon: LinkedInIcon, href: 'https://linkedin.com/in/krishna-vijay', label: 'LinkedIn' },
];

const footerLinkSx = {
  color: 'text.secondary',
  fontSize: '0.8125rem',
  textDecoration: 'none',
  transition: 'color 0.15s ease',
  '&:hover': { color: 'text.primary' },
};

const inlineLinkSx = {
  color: 'inherit',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  transition: 'color 0.15s ease',
  '&:hover': { color: 'text.primary' },
};

export default function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        borderTop: '1px solid var(--sp-border)',
        py: { xs: 5, md: 7 },
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        {/* Main Footer Content */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 2fr',
            },
            gap: { xs: 4, md: 6 },
            mb: 5,
          }}
        >
          {/* Brand Section */}
          <Box>
            <Logo size="medium" variant="footer" showText sx={{ mb: 2 }} />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2.5, maxWidth: 300 }}
            >
              Replace chaotic spreadsheets, group chats, and email chains with a single source of truth for sports team management.
            </Typography>

            {/* Social Links */}
            <Stack direction="row" spacing={0.5}>
              {socialLinks.map((social) => (
                <IconButton
                  key={social.label}
                  component={Link}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  size="small"
                >
                  <social.icon fontSize="small" />
                </IconButton>
              ))}
            </Stack>
          </Box>

          {/* Footer Links: four columns, two on phones */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(4, 1fr)',
              },
              gap: { xs: 3, sm: 4 },
            }}
          >
            {footerSections.map((section) => (
              <Box key={section.title}>
                <Typography
                  component="h3"
                  variant="eyebrow"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1.5 }}
                >
                  {section.title}
                </Typography>
                <Stack spacing={1}>
                  {section.links.map((link) => (
                    <Typography
                      key={link.href}
                      component={Link}
                      href={link.href}
                      variant="body2"
                      sx={footerLinkSx}
                    >
                      {link.label}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Bottom Footer */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              © {currentYear} Spartan. Built by{' '}
              <Box
                component="a"
                href="https://arkhins.com"
                target="_blank"
                rel="noopener noreferrer"
                sx={inlineLinkSx}
              >
                Arkhins
              </Box>
              . Made with ❤️ for sports teams everywhere.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              Open source: code under{' '}
              <Box
                component="a"
                href="https://github.com/Arkhins-0/Spartan/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                sx={inlineLinkSx}
              >
                Apache 2.0
              </Box>
              , docs under{' '}
              <Box
                component="a"
                href="https://github.com/Arkhins-0/Spartan/blob/main/LICENSE-DOCS"
                target="_blank"
                rel="noopener noreferrer"
                sx={inlineLinkSx}
              >
                CC BY 4.0
              </Box>
              .
            </Typography>
          </Stack>

          <Stack
            direction="row"
            sx={{
              flexWrap: 'wrap',
              gap: { xs: 1, sm: 3 },
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              🌟 Free forever for teams
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              🔒 Privacy First
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
              📱 Mobile Ready
            </Typography>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
