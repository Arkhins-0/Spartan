import type { CSSProperties } from 'react';

/**
 * MUI type augmentations shared by BOTH themes — the product "Console" theme
 * (lib/theme.ts) and the marketing "Broadcast" theme (lib/theme-marketing.ts).
 *
 * Module augmentation is global, so it lives once here and each theme file
 * imports this module for its side effect. Every custom key is optional on the
 * options side and present on the resolved side; a theme that does not define
 * a variant simply renders it unstyled.
 */

type TypographyStyleOptions = CSSProperties & {
  '@media (max-width:600px)'?: CSSProperties;
};

declare module '@mui/material/styles' {
  // Opt in to CSS theme variables typing (theme.vars, theme.colorSchemes, ...)
  interface CssThemeVariables {
    enabled: true;
  }

  interface Palette {
    /** Public brand pages: the Digital Playbook / Broadcast identity. */
    marketing: {
      primary: string;
      secondary: string;
      accent: string;
      gradient: string;
      hero: string;
    };
    /**
     * Console theme: the ONE bright colour in the tool, reserved for the
     * action that writes and for focus/selection cues. Identical in both
     * schemes.
     */
    accent: Palette['primary'];
    /** Console theme: the receding surface — hover rows, inactive tabs. */
    muted: Palette['primary'];
    /** Marketing (Broadcast) theme only: the ink chrome ramp. */
    chrome: {
      surface: string;
      surfaceAlt: string;
      border: string;
      text: string;
      textMuted: string;
      accent: string;
    };
  }

  interface PaletteOptions {
    marketing?: Partial<Palette['marketing']>;
    accent?: PaletteOptions['primary'];
    muted?: PaletteOptions['primary'];
    chrome?: Partial<Palette['chrome']>;
  }

  interface TypographyVariants {
    heroTitle: TypographyStyleOptions;
    heroSubtitle: TypographyStyleOptions;
    sectionTitle: TypographyStyleOptions;
    featureTitle: TypographyStyleOptions;
    marketingBody: TypographyStyleOptions;
    eyebrow: TypographyStyleOptions;
    scoreboard: TypographyStyleOptions;
    dataLabel: TypographyStyleOptions;
  }

  interface TypographyVariantsOptions {
    heroTitle?: TypographyStyleOptions;
    heroSubtitle?: TypographyStyleOptions;
    sectionTitle?: TypographyStyleOptions;
    featureTitle?: TypographyStyleOptions;
    marketingBody?: TypographyStyleOptions;
    eyebrow?: TypographyStyleOptions;
    scoreboard?: TypographyStyleOptions;
    dataLabel?: TypographyStyleOptions;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    heroTitle: true;
    heroSubtitle: true;
    sectionTitle: true;
    featureTitle: true;
    marketingBody: true;
    eyebrow: true;
    scoreboard: true;
    dataLabel: true;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    marketing: true;
    marketingSecondary: true;
  }
  interface ButtonPropsColorOverrides {
    accent: true;
    muted: true;
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    accent: true;
    muted: true;
  }
}

declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    marketing: true;
  }
}

declare module '@mui/material/Card' {
  interface CardPropsVariantOverrides {
    marketing: true;
  }
}

export {};
