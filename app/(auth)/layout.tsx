import type { ReactNode } from 'react';
import { Box } from '@mui/material';

/**
 * The auth surfaces are Console pages (see .design-sync/conventions.md): a
 * single card on the page colour, built entirely from scheme-aware tokens, so
 * they follow the visitor's colour scheme like the dashboard does. There is
 * nothing to pin here any more — the earlier LightThemeScope pin existed only
 * because the pages baked a white gradient into their card, which the redesign
 * removed.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // Deliberately no minHeight: LayoutProvider already wraps the auth routes
    // in a 100vh flex column whose <main> grows, and each page centres its
    // card inside that. Adding one here would force <main> past the viewport
    // and push MarketingFooter a full footer-height below the fold.
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        bgcolor: 'background.default',
      }}
    >
      {children}
    </Box>
  );
}
