'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Box } from '@mui/material';
import MarketingHeader from '@/components/features/navigation/MarketingHeader';
import MarketingFooter from '@/components/features/navigation/MarketingFooter';
import SkipLink from '@/components/ui/SkipLink';
import { isAuthRoute } from '@/lib/config/auth-routes';

interface LayoutProviderProps {
  children: ReactNode;
}

export default function LayoutProvider({ children }: LayoutProviderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Determine if we should show marketing layout
  // Note: Route groups like (marketing) are excluded from the pathname by Next.js
  const marketingPaths = [
    '/',
    '/features',
    '/about',
    '/contact',
    '/get-started',
    '/blog',
    '/privacy',
    '/terms',
    '/cookies',
    '/security',
    '/docs',
  ];
  // Routes that already render their own marketing layout components
  const marketingRouteGroupPaths = [
    '/features',
    '/pricing',
    '/about',
    '/contact',
    '/get-started',
    '/blog',
    '/rinks',
    '/privacy',
    '/terms',
    '/cookies',
    '/security',
  ];
  const isMarketingRoute = marketingPaths.some(path =>
    pathname === path || (path !== '/' && pathname.startsWith(path))
  );
  const isMarketingRouteGroup = marketingRouteGroupPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );
  // Whole-segment match from the shared roster (lib/config/auth-routes.ts).
  // A bare startsWith('/signup') also swallowed the public '/signups*' pages —
  // which already get chrome from app/(marketing)/layout.tsx, so they ended up
  // with two headers, two footers, two skip links and a duplicated
  // id="main-content" — and the authenticated '/signup-events*' dashboard,
  // which renders through this branch during the window where useSession() has
  // not resolved yet.
  const isAuth = isAuthRoute(pathname);
  const isDocsRoute = pathname === '/docs' || pathname.startsWith('/docs/');

  // Show marketing layout for unauthenticated users on marketing routes. The
  // docs are public reference material and get the same chrome whether or
  // not you are signed in — DocsShell reserves space for the fixed header, so
  // rendering docs without it left a headerless, off-theme page for members.
  const shouldShowMarketingLayout =
    isDocsRoute || (!session?.user && ((isMarketingRoute && !isMarketingRouteGroup) || isAuth));

  // One theme, one scheme: the landing page, the docs and the auth pages are
  // all built from Console tokens now, so nothing here is pinned light and the
  // whole tree follows the visitor's theme.
  if (shouldShowMarketingLayout) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <SkipLink />
        <MarketingHeader />
        {isDocsRoute ? (
          children
        ) : (
          <Box
            component="main"
            id="main-content"
            tabIndex={-1}
            sx={{
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              // The header is a fixed bar; DocsShell reserves this space itself.
              pt: { xs: '64px', md: '72px' },
            }}
          >
            {children}
          </Box>
        )}
        <MarketingFooter />
      </Box>
    );
  }

  // For authenticated users or dashboard routes, render without marketing layout
  return <>{children}</>;
}
