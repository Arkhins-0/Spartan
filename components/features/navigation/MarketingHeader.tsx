'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Button,
  Stack,
  Divider,
  useMediaQuery,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import Logo from '@/components/ui/Logo';
import CTAButton from '@/components/features/marketing/CTAButton';
import { marketingEvents } from '@/lib/analytics/tracking';
import { isAuthRoute } from '@/lib/config/auth-routes';

const navigationLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Docs', href: '/docs' },
];

/**
 * Public-site header in the Console idiom: a card-coloured bar with a hairline
 * underneath, 13px links, one contained "write" button. It is the same bar in
 * both schemes and on every public route — there is no transparent-over-hero
 * mode, no blur and no shadow.
 */
export default function MarketingHeader() {
  const theme = useTheme();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hide navbar completely on auth pages (they have their own logos). Uses the
  // same roster LayoutProvider branches on, so the two cannot drift apart —
  // they previously disagreed, leaving /forgot-password and the token routes
  // with a header but no skip link or main landmark.
  const isAuthPage = isAuthRoute(pathname);

  // Early return after all hooks
  if (isAuthPage) {
    return null;
  }

  const handleDrawerToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const isActiveHref = (href: string) => (
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
  );

  const navLinkSx = (active: boolean) => ({
    color: 'text.primary',
    fontSize: '0.8125rem',
    fontWeight: active ? 600 : 500,
    px: 1.5,
    minHeight: 36,
    borderRadius: 1.5,
    '&:hover': {
      color: 'text.primary',
      backgroundColor: 'action.hover',
    },
  });

  return (
    <AppBar
      component="header"
      position="fixed"
      elevation={0}
      // "inherit" so the bar's text follows the scope it lands in (the Logo
      // wordmark inherits it); the surface and hairline come from tokens.
      color="inherit"
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid var(--sp-border)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            justifyContent: 'space-between',
            minHeight: { xs: 64, md: 72 },
          }}
        >
          {/* Logo and Brand */}
          <Logo size="large" href="/" showText priority />

          {/* Desktop Navigation */}
          {!isMobile ? (
            <Stack
              component="nav"
              aria-label="Primary marketing navigation"
              direction="row"
              spacing={0.5}
              alignItems="center"
            >
              {navigationLinks.map((link) => (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  aria-current={isActiveHref(link.href) ? 'page' : undefined}
                  variant="text"
                  color="inherit"
                  sx={navLinkSx(isActiveHref(link.href))}
                >
                  {link.label}
                </Button>
              ))}
              <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 20, alignSelf: 'center' }} />
              <Button
                component={Link}
                href="/login"
                variant="text"
                color="inherit"
                onClick={() => marketingEvents.headerSignInClick()}
                sx={navLinkSx(false)}
              >
                Sign In
              </Button>
              <CTAButton
                href="/signup"
                variant="contained"
                size="small"
                trackingAction="header_sign_up_click"
                trackingLabel="header"
                sx={{ ml: 1 }}
              >
                Get Started Free
              </CTAButton>
            </Stack>
          ) : (
            /* Mobile Navigation */
            <>
              <IconButton
                color="inherit"
                aria-label={mobileMenuOpen ? 'close navigation menu' : 'open navigation menu'}
                aria-controls="marketing-mobile-menu"
                aria-expanded={mobileMenuOpen}
                edge="end"
                onClick={handleDrawerToggle}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="right"
                open={mobileMenuOpen}
                onClose={handleDrawerToggle}
                slotProps={{
                  paper: {
                    id: 'marketing-mobile-menu',
                    role: 'dialog',
                    'aria-label': 'Marketing navigation menu',
                  },
                }}
                sx={{
                  '& .MuiDrawer-paper': {
                    width: 280,
                    pt: 1,
                    bgcolor: 'background.paper',
                    borderLeft: '1px solid var(--sp-border)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1.5, pb: 0.5 }}>
                  <IconButton onClick={handleDrawerToggle} aria-label="close menu">
                    <CloseIcon />
                  </IconButton>
                </Box>
                <List component="nav" aria-label="Mobile marketing navigation" sx={{ px: 1.5 }}>
                  {navigationLinks.map((link) => (
                    <ListItem key={link.href} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        component={Link}
                        href={link.href}
                        selected={isActiveHref(link.href)}
                        aria-current={isActiveHref(link.href) ? 'page' : undefined}
                        onClick={handleDrawerToggle}
                      >
                        <ListItemText primary={link.label} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                  <Divider sx={{ my: 1.5 }} />
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      component={Link}
                      href="/login"
                      onClick={() => {
                        marketingEvents.headerSignInClick();
                        handleDrawerToggle();
                      }}
                    >
                      <ListItemText primary="Sign In" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem sx={{ px: 0, pt: 1 }}>
                    <CTAButton
                      href="/signup"
                      variant="contained"
                      trackingAction="header_sign_up_click"
                      trackingLabel="mobile_header"
                      fullWidth
                      onClick={handleDrawerToggle}
                    >
                      Get Started Free
                    </CTAButton>
                  </ListItem>
                </List>
              </Drawer>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
