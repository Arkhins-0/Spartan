import { createTheme } from '@mui/material/styles';
import type { PaletteOptions } from '@mui/material/styles';
import '@/lib/theme-augmentations';

// Spartan "Console" Theme
//
// A monochrome tool palette: warm achromatic greys one step apart, where
// depth is a lighter grey and a 10%-white hairline — never a shadow — and the
// absence of colour is the point. One bright accent (the yellow) is reserved
// for the action that writes and for focus/selection cues, so it always means
// something when it appears.
//
// Typography: IBM Plex Sans (a humanist sans with a tall x-height that stays
// legible at the 13–14px the tool is built at), JetBrains Mono for tabular
// figures. Shape: 8px panels, 6px controls, pills for badges only.
//
// Two schemes share one structure. Dark ("Night") is the reference palette:
// page #212121 → card #2C2C2C → muted #3C3C3C. Light ("Day") inverts it:
// page #F2F2F2 → card #FFFFFF → muted #E9E9E9, with the same hairline logic in
// black. In light, the "write" colour is ink rather than yellow: yellow text on
// white cannot reach AA, so the accent stays a highlight and the primary stays
// legible.
//
// Scheme variation is carried by custom properties declared in app/globals.css
// (--sp-border, --sp-border-input, --sp-ring, --sp-surface-muted, …). Each
// component here has ONE base rule that reads those variables; there are no
// scheme-scoped duplicate rules, which is what keeps call-site `sx` able to
// override anything. A LightThemeScope pin re-declares the variables for its
// subtree and everything inside follows.
//
// One theme for the whole site: the marketing pages, docs and the product all
// draw from this file (the earlier nested marketing theme was retired).

const FONT_UI = "var(--font-ui), 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_MONO = "var(--font-mono), 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/** The one bright colour. Identical in both schemes. */
const ACCENT = {
  main: '#F7D619',
  light: '#FAE24D',
  dark: '#E0BF06',
  contrastText: '#1A1A1A',
};

// Marketing tokens now resolve to the Console ramp so any remaining
// `theme.palette.marketing.*` read stays on-theme: the "gradient" is flat.
const MARKETING_LIGHT = {
  primary: '#1A1A1A',
  secondary: '#6B6B6B',
  accent: '#F7D619',
  gradient: 'none',
  hero: '#F2F2F2',
};
const MARKETING_DARK = {
  primary: '#FBFBFB',
  secondary: '#ADADAD',
  accent: '#F7D619',
  gradient: 'none',
  hero: '#212121',
};

// Light scheme: "Day". Every status colour clears 4.5:1 on white paper.
const lightPalette: PaletteOptions = {
  primary: {
    main: '#1A1A1A', // Ink — the write action in daylight
    light: '#3C3C3C',
    dark: '#000000',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#E4E4E4', // Receding control fill
    light: '#F0F0F0',
    dark: '#CFCFCF',
    contrastText: '#1A1A1A',
  },
  accent: ACCENT,
  muted: {
    main: '#E9E9E9',
    light: '#F2F2F2',
    dark: '#D6D6D6',
    contrastText: '#6B6B6B',
  },
  error: {
    main: '#C62828', // 5.9:1 on white
    light: '#EF5350',
    dark: '#8E1B1B',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#B45309', // 5.0:1 on white
    light: '#D97706',
    dark: '#7C3A06',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#15803D', // 5.0:1 on white
    light: '#22C55E',
    dark: '#14532D',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#0369A1', // 5.9:1 on white
    light: '#0284C7',
    dark: '#024E7A',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F2F2F2',
    paper: '#FFFFFF',
  },
  divider: 'rgba(0, 0, 0, 0.10)',
  text: {
    primary: '#1A1A1A',
    secondary: '#6B6B6B',
    disabled: 'rgba(26, 26, 26, 0.38)',
  },
  action: {
    hover: 'rgba(0, 0, 0, 0.05)',
    selected: 'rgba(0, 0, 0, 0.07)',
    focus: 'rgba(0, 0, 0, 0.10)',
    disabledBackground: 'rgba(0, 0, 0, 0.06)',
  },
  marketing: MARKETING_LIGHT,
};

// Dark scheme: "Night" — the reference palette. Status colours are lifted so
// each clears 4.5:1 on the card surface (#2C2C2C).
const darkPalette: PaletteOptions = {
  primary: {
    main: ACCENT.main, // The write action IS the accent at night
    light: ACCENT.light,
    dark: ACCENT.dark,
    contrastText: ACCENT.contrastText,
  },
  secondary: {
    main: '#3C3C3C',
    light: '#4A4A4A',
    dark: '#2C2C2C',
    contrastText: '#FBFBFB',
  },
  accent: ACCENT,
  muted: {
    main: '#3C3C3C',
    light: '#4A4A4A',
    dark: '#2C2C2C',
    contrastText: '#ADADAD',
  },
  error: {
    main: '#FF8A80', // 6.0:1 on card
    light: '#FFB3AD',
    dark: '#F0605F',
    contrastText: '#1A1A1A',
  },
  warning: {
    main: '#FBBF24',
    light: '#FCD34D',
    dark: '#D97706',
    contrastText: '#1A1A1A',
  },
  success: {
    main: '#4ADE80',
    light: '#86EFAC',
    dark: '#22C55E',
    contrastText: '#1A1A1A',
  },
  info: {
    main: '#7DD3FC',
    light: '#BAE6FD',
    dark: '#38BDF8',
    contrastText: '#1A1A1A',
  },
  background: {
    default: '#212121',
    paper: '#2C2C2C',
  },
  divider: 'rgba(255, 255, 255, 0.10)',
  text: {
    primary: '#FBFBFB',
    secondary: '#ADADAD', // 6.1:1 on card
    disabled: 'rgba(251, 251, 251, 0.38)',
  },
  action: {
    hover: 'rgba(255, 255, 255, 0.06)',
    selected: 'rgba(255, 255, 255, 0.09)',
    focus: 'rgba(255, 255, 255, 0.12)',
    disabledBackground: 'rgba(255, 255, 255, 0.08)',
  },
  marketing: MARKETING_DARK,
};

/** Nothing in the Console casts a shadow: depth is a grey step and a hairline. */
const NO_SHADOWS = Array(25).fill('none') as unknown as ReturnType<typeof createTheme>['shadows'];

const theme = createTheme({
  cssVariables: {
    // Emits [data-mui-color-scheme="light|dark"] selectors; must match the
    // attribute set by InitColorSchemeScript (its default) in ThemeProvider.
    colorSchemeSelector: 'data-mui-color-scheme',
  },
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  shadows: NO_SHADOWS,
  typography: {
    fontFamily: FONT_UI,
    // Dense and quiet: body copy is 14px, chrome and data sit at 12–13px, and
    // headings are small and heavy rather than large and light.
    h1: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.015em' },
    h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.35, letterSpacing: '-0.01em' },
    h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em' },
    h6: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4 },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.45 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.45 },
    body1: { fontSize: '0.875rem', lineHeight: 1.55 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    caption: { fontSize: '0.6875rem', lineHeight: 1.4 },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      lineHeight: 1.4,
    },
    button: { fontSize: '0.875rem', fontWeight: 600, textTransform: 'none', lineHeight: 1.4 },
    // Marketing display scale — larger than the product headings, but still
    // heavy-and-tight rather than huge; the console does not shout.
    heroTitle: {
      fontSize: '2.75rem',
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: '-0.03em',
      '@media (max-width:600px)': { fontSize: '2rem' },
    },
    heroSubtitle: { fontSize: '1.125rem', fontWeight: 400, lineHeight: 1.55 },
    sectionTitle: {
      fontSize: '1.875rem',
      fontWeight: 700,
      lineHeight: 1.15,
      letterSpacing: '-0.02em',
      '@media (max-width:600px)': { fontSize: '1.5rem' },
    },
    featureTitle: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3 },
    marketingBody: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },
    // Section label above a group of controls or a nav group.
    eyebrow: {
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      lineHeight: 1.4,
    },
    // Big mono figure for scores and counts; the mono caption beneath it.
    scoreboard: {
      fontFamily: FONT_MONO,
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      fontVariantNumeric: 'tabular-nums',
    },
    dataLabel: {
      fontFamily: FONT_MONO,
      fontSize: '0.6875rem',
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      fontVariantNumeric: 'tabular-nums',
    },
  },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 },
  },
  spacing: 8,
  shape: {
    // Panels. Controls use 6px, badges use a pill — set per component below.
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Keyboard focus is a hard ring (ink by day, grey by night) with a soft
        // glow, visible on the page and on a card alike.
        ':focus-visible': {
          outline: '2px solid var(--sp-ring)',
          outlineOffset: 2,
          borderRadius: 4,
        },
        'th, td': {
          fontVariantNumeric: 'tabular-nums',
        },
        // Native <select> popups are painted by the browser: keep them on the
        // card colour so they do not flash white inside the dark scheme.
        'option, optgroup': {
          backgroundColor: 'var(--sp-card)',
          color: 'var(--foreground)',
        },
      },
    },

    // ---- Surfaces --------------------------------------------------------
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
        // Every raised surface is the same card + hairline pair. Elevation
        // numbers still work as an API, they just do not paint anything.
        elevation: {
          border: '1px solid var(--sp-border)',
        },
        outlined: {
          borderColor: 'var(--sp-border)',
        },
        rounded: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid var(--sp-border)',
          backgroundImage: 'none',
          boxShadow: 'none',
          // Cards stay put: no lift, no glow.
          transition: 'border-color 0.15s ease',
        },
      },
      // Legacy marketing card variant: the same flat panel, a little roomier.
      variants: [{ props: { variant: 'marketing' }, style: { padding: 24 } }],
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          borderBottom: '1px solid var(--sp-border)',
        },
        title: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 },
        subheader: { fontSize: '0.75rem', lineHeight: 1.4 },
        action: { margin: 0, alignSelf: 'center' },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': { paddingBottom: 16 },
        },
      },
    },
    MuiCardActions: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          borderTop: '1px solid var(--sp-border)',
          gap: 8,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'var(--sp-border)' },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
        // Ink-on-card, not colour: the bar is a card with a hairline under it.
        colorPrimary: ({ theme }) => ({
          backgroundColor: (theme.vars || theme).palette.background.paper,
          color: (theme.vars || theme).palette.text.primary,
          borderBottom: '1px solid var(--sp-border)',
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          borderColor: 'var(--sp-border)',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          // A blur rather than a wash of black: the workspace stays
          // recognisable behind a dialog.
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          '&.MuiBackdrop-invisible': {
            backgroundColor: 'transparent',
            backdropFilter: 'none',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          border: '1px solid var(--sp-border)',
          backgroundImage: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          fontWeight: 600,
          padding: '12px 16px',
          borderBottom: '1px solid var(--sp-border)',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: 16,
          // MUI strips the top padding when a title precedes the content;
          // with the title carrying its own hairline, keep the breathing room.
          '.MuiDialogTitle-root + &': { paddingTop: 16 },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '10px 16px',
          borderTop: '1px solid var(--sp-border)',
          gap: 8,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          border: '1px solid var(--sp-border)',
          backgroundImage: 'none',
          boxShadow: 'none',
          marginTop: 4,
        },
        list: { padding: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 6,
          fontSize: '0.875rem',
          fontWeight: 500,
          '& .MuiListItemIcon-root': { minWidth: 32 },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          border: '1px solid var(--sp-border)',
          backgroundImage: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        // Inverted card: ink-on-white by day, white-on-ink by night.
        tooltip: ({ theme }) => ({
          backgroundColor: (theme.vars || theme).palette.text.primary,
          color: (theme.vars || theme).palette.background.paper,
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 6,
          padding: '6px 10px',
        }),
        arrow: ({ theme }) => ({
          color: (theme.vars || theme).palette.text.primary,
        }),
      },
    },

    // ---- Controls --------------------------------------------------------
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          // 44px is the WCAG touch minimum; small buttons are 36px for
          // toolbars where a 44px row would be the tallest thing on screen.
          minHeight: 44,
          minWidth: 44,
          padding: '8px 14px',
          borderRadius: 6,
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          // A 1px transparent border on every variant so outline and solid
          // buttons are the same size and a mixed row lines up.
          border: '1px solid transparent',
          boxShadow: 'none',
          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.1s ease',
          // The press is a scale, not a shadow — nothing in this UI casts one.
          '&:active': { transform: 'scale(0.97)' },
          '&:hover': { boxShadow: 'none' },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'none',
            '&:active': { transform: 'none' },
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        outlined: ({ theme }) => ({
          borderColor: 'var(--sp-border-input)',
          color: (theme.vars || theme).palette.text.primary,
          '&:hover': {
            borderColor: 'var(--sp-border-input)',
            backgroundColor: (theme.vars || theme).palette.action.hover,
          },
        }),
        text: ({ theme }) => ({
          color: (theme.vars || theme).palette.text.secondary,
          '&:hover': {
            color: (theme.vars || theme).palette.text.primary,
            backgroundColor: (theme.vars || theme).palette.action.hover,
          },
        }),
        sizeSmall: {
          minHeight: 36,
          padding: '4px 10px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          minHeight: 48,
          padding: '10px 18px',
          fontSize: '0.9375rem',
        },
        startIcon: { marginLeft: -2, marginRight: 6 },
        endIcon: { marginRight: -2, marginLeft: 6 },
      },
      // Legacy marketing CTA variants map onto the two console buttons so a
      // page that still uses them renders on-theme.
      variants: [
        {
          props: { variant: 'marketing' },
          style: ({ theme }) => ({
            backgroundColor: (theme.vars || theme).palette.primary.main,
            color: (theme.vars || theme).palette.primary.contrastText,
            minHeight: 48,
            padding: '10px 20px',
            fontSize: '0.9375rem',
            '&:hover': { backgroundColor: (theme.vars || theme).palette.primary.dark },
          }),
        },
        {
          props: { variant: 'marketingSecondary' },
          style: ({ theme }) => ({
            borderColor: 'var(--sp-border-input)',
            color: (theme.vars || theme).palette.text.primary,
            minHeight: 48,
            padding: '10px 20px',
            fontSize: '0.9375rem',
            '&:hover': { backgroundColor: (theme.vars || theme).palette.action.hover },
          }),
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 44,
          minWidth: 44,
          borderRadius: 6,
          color: (theme.vars || theme).palette.text.secondary,
          transition: 'background-color 0.15s ease, color 0.15s ease',
          '&:hover': {
            color: (theme.vars || theme).palette.text.primary,
            backgroundColor: (theme.vars || theme).palette.action.hover,
          },
        }),
        sizeSmall: {
          minHeight: 36,
          minWidth: 36,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.8125rem',
          borderRadius: 6,
          borderColor: 'var(--sp-border-input)',
          color: (theme.vars || theme).palette.text.secondary,
          '&.Mui-selected': {
            color: (theme.vars || theme).palette.text.primary,
            backgroundColor: (theme.vars || theme).palette.action.selected,
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
          fontSize: '0.6875rem',
          height: 22,
        },
        sizeMedium: {
          height: 26,
          fontSize: '0.75rem',
        },
        outlined: {
          borderColor: 'var(--sp-border-input)',
        },
        label: { paddingLeft: 10, paddingRight: 10 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        // Fields are outlines on the card, transparent fill: on a card the
        // field reads as an outline on the card's own surface, which is what
        // keeps the UI flat.
        root: {
          minHeight: 44,
          borderRadius: 6,
          backgroundColor: 'transparent',
          fontSize: '0.875rem',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--sp-border-input)',
            borderWidth: 1,
            transition: 'border-color 0.15s ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--sp-border-input)',
          },
          '&.Mui-focused': {
            boxShadow: '0 0 0 3px var(--sp-ring-glow)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--sp-ring)',
            borderWidth: 1,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--mui-palette-error-main)',
          },
        },
        input: {
          padding: '10px 12px',
          '&::placeholder': { opacity: 0.6 },
        },
        sizeSmall: {
          minHeight: 36,
        },
        inputSizeSmall: {
          padding: '6px 10px',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontSize: '0.875rem',
          fontWeight: 500,
          color: (theme.vars || theme).palette.text.secondary,
          '&.Mui-focused': { color: (theme.vars || theme).palette.text.primary },
        }),
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { fontSize: '0.75rem', marginLeft: 2 },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          minHeight: '1.4em',
          display: 'flex',
          alignItems: 'center',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: (theme.vars || theme).palette.text.secondary,
          borderRadius: 4,
        }),
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: (theme.vars || theme).palette.text.secondary,
        }),
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
        track: { borderRadius: 999, opacity: 0.4 },
        thumb: { boxShadow: 'none' },
      },
    },

    // ---- Navigation ------------------------------------------------------
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 6,
          minHeight: 40,
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 10,
          paddingRight: 10,
          color: (theme.vars || theme).palette.text.secondary,
          '&:hover': {
            color: (theme.vars || theme).palette.text.primary,
            backgroundColor: (theme.vars || theme).palette.action.hover,
          },
          // The active row is a step of grey and a heavier label — a tinted
          // pill would be the only colour on the rail.
          '&.Mui-selected': {
            color: (theme.vars || theme).palette.text.primary,
            backgroundColor: (theme.vars || theme).palette.action.selected,
            '&:hover': { backgroundColor: (theme.vars || theme).palette.action.selected },
            '& .MuiListItemText-primary': { fontWeight: 600 },
          },
        }),
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 32,
          color: 'inherit',
          '& .MuiSvgIcon-root': { fontSize: '1.125rem' },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.4 },
        secondary: { fontSize: '0.75rem' },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderBottom: '1px solid var(--sp-border)',
        },
        indicator: { height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: ({ theme }) => ({
          minHeight: 40,
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.8125rem',
          color: (theme.vars || theme).palette.text.secondary,
          padding: '8px 12px',
          '&.Mui-selected': {
            color: (theme.vars || theme).palette.text.primary,
            fontWeight: 600,
          },
        }),
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: { fontSize: '0.75rem' },
        separator: { marginLeft: 4, marginRight: 4 },
      },
    },
    MuiLink: {
      defaultProps: { underline: 'hover' },
      styleOverrides: {
        root: {
          fontWeight: 500,
          textUnderlineOffset: 3,
        },
      },
    },

    // ---- Data ------------------------------------------------------------
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid var(--sp-border)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiTableCell-head': {
            position: 'sticky',
            top: 0,
            zIndex: 1,
            backgroundColor: (theme.vars || theme).palette.background.paper,
            color: (theme.vars || theme).palette.text.secondary,
            fontSize: '0.75rem',
            fontWeight: 600,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            borderBottom: '1px solid var(--sp-border)',
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          padding: '10px 12px',
          borderBottomColor: 'var(--sp-border)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:last-child .MuiTableCell-root': { borderBottom: 0 },
          '&.MuiTableRow-hover:hover': {
            backgroundColor: (theme.vars || theme).palette.action.hover,
          },
          '&.Mui-selected': {
            backgroundColor: (theme.vars || theme).palette.action.selected,
          },
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        // A card with a colour bar on the leading edge — the severity tint
        // never floods the surface.
        root: ({ theme }) => ({
          borderRadius: 8,
          border: '1px solid var(--sp-border)',
          borderLeftWidth: 3,
          fontSize: '0.8125rem',
          fontWeight: 500,
          backgroundColor: (theme.vars || theme).palette.background.paper,
          color: (theme.vars || theme).palette.text.primary,
          alignItems: 'center',
        }),
        icon: { opacity: 1 },
        standardSuccess: ({ theme }) => ({
          borderLeftColor: (theme.vars || theme).palette.success.main,
          '& .MuiAlert-icon': { color: (theme.vars || theme).palette.success.main },
        }),
        standardError: ({ theme }) => ({
          borderLeftColor: (theme.vars || theme).palette.error.main,
          '& .MuiAlert-icon': { color: (theme.vars || theme).palette.error.main },
        }),
        standardWarning: ({ theme }) => ({
          borderLeftColor: (theme.vars || theme).palette.warning.main,
          '& .MuiAlert-icon': { color: (theme.vars || theme).palette.warning.main },
        }),
        standardInfo: ({ theme }) => ({
          borderLeftColor: (theme.vars || theme).palette.info.main,
          '& .MuiAlert-icon': { color: (theme.vars || theme).palette.info.main },
        }),
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 4,
          borderRadius: 999,
          backgroundColor: 'var(--sp-surface-muted)',
        },
        bar: { borderRadius: 999 },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--sp-surface-muted)',
          borderRadius: 6,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.8125rem',
          backgroundColor: 'var(--sp-surface-muted)',
          color: 'var(--foreground)',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: { fontWeight: 600, fontSize: '0.625rem' },
      },
    },
  },
});

export default theme;
