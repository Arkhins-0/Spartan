'use client';

import type { ReactNode } from 'react';
import { Box } from '@mui/material';

interface SkipLinkProps {
  href?: string;
  children?: ReactNode;
}

/**
 * Keyboard-only "skip to content" link. Hidden above the viewport until it
 * receives focus, then drops in as a solid primary pill (ink by day, yellow by
 * night) with a hairline — no shadow, per the Console rules — so it reads
 * clearly on either scheme without any brand literal.
 */
export default function SkipLink({
  href = '#main-content',
  children = 'Skip to main content',
}: SkipLinkProps) {
  return (
    <Box
      component="a"
      href={href}
      sx={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: (theme) => theme.zIndex.tooltip + 1,
        px: 2,
        py: 1.25,
        borderRadius: '6px',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        border: '1px solid var(--sp-border)',
        fontSize: '0.875rem',
        fontWeight: 600,
        textDecoration: 'none',
        transform: 'translateY(-180%)',
        transition: 'transform 0.18s ease-out',
        '&:focus, &:focus-visible': {
          transform: 'translateY(0)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
        },
      }}
    >
      {children}
    </Box>
  );
}
