'use client';

import { Button, ButtonProps } from '@mui/material';
import Link from 'next/link';
import { trackConversion } from '@/lib/analytics/tracking';

interface CTAButtonProps {
  href: string;
  trackingAction: string;
  trackingLabel?: string;
  children: React.ReactNode;
  /** `marketing` / `marketingSecondary` are legacy aliases the theme maps onto
   *  the contained / outlined console buttons. */
  variant?: 'marketing' | 'marketingSecondary' | 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  sx?: ButtonProps['sx'];
}

/**
 * Link-styled CTA with conversion tracking. Visuals come entirely from the
 * theme's button styles — no lift, no glow — so a CTA looks like every other
 * button on the site.
 */
export default function CTAButton({
  href,
  trackingAction,
  trackingLabel,
  children,
  variant = 'contained',
  size,
  fullWidth,
  onClick,
  sx,
}: CTAButtonProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    trackConversion(trackingAction, trackingLabel);
    onClick?.(event);
  };

  return (
    <Button
      component={Link}
      href={href}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      onClick={handleClick}
      sx={sx}
    >
      {children}
    </Button>
  );
}
