import { describe, it, expect } from 'vitest';
import theme from '@/lib/theme';

// WCAG relative luminance / contrast ratio for hex colours.
const lum = (hex: string) => {
  const c = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
};

describe('Console theme', () => {
  describe('CSS variables setup', () => {
    it('enables CSS theme variables under the app prefix', () => {
      expect(theme.vars).toBeDefined();
      expect(theme.cssVarPrefix).toBe('mui');
    });

    it('uses the data-mui-color-scheme selector (matches InitColorSchemeScript default)', () => {
      expect(theme.colorSchemeSelector).toBe('data-mui-color-scheme');
      expect(theme.getColorSchemeSelector('dark')).toContain('data-mui-color-scheme="dark"');
    });

    it('defaults to the light scheme (theme.palette mirrors light)', () => {
      expect(theme.defaultColorScheme).toBe('light');
      expect(theme.palette.mode).toBe('light');
    });
  });

  describe('Dark scheme ("Night") — the reference palette', () => {
    const dark = () => theme.colorSchemes.dark!.palette;

    it('steps page → card → muted one grey at a time', () => {
      expect(dark().background.default).toBe('#212121');
      expect(dark().background.paper).toBe('#2C2C2C');
      expect(dark().muted.main).toBe('#3C3C3C');
      expect(dark().divider).toBe('rgba(255, 255, 255, 0.10)');
    });

    it('makes the yellow accent the write action', () => {
      expect(dark().primary.main).toBe('#F7D619');
      expect(dark().primary.contrastText).toBe('#1A1A1A');
      expect(dark().accent.main).toBe('#F7D619');
    });

    it('keeps text and every status colour at AA on the card surface', () => {
      const paper = dark().background.paper;
      expect(ratio(dark().text.primary, paper)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(dark().text.secondary, paper)).toBeGreaterThanOrEqual(4.5);
      for (const key of ['primary', 'error', 'warning', 'success', 'info'] as const) {
        expect(ratio(dark()[key].main, paper), key).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  describe('Light scheme ("Day")', () => {
    const light = () => theme.colorSchemes.light!.palette;

    it('inverts the same structure: page, white card, grey muted', () => {
      expect(light().background.default).toBe('#F2F2F2');
      expect(light().background.paper).toBe('#FFFFFF');
      expect(light().muted.main).toBe('#E9E9E9');
      expect(light().divider).toBe('rgba(0, 0, 0, 0.10)');
    });

    // Yellow text on white cannot reach AA, so by day the write action is ink
    // and the yellow stays a highlight (focus, selection, "unsaved").
    it('uses ink for the write action and keeps the accent as a highlight', () => {
      expect(light().primary.main).toBe('#1A1A1A');
      expect(light().primary.contrastText).toBe('#FFFFFF');
      expect(light().accent.main).toBe('#F7D619');
      expect(ratio(light().accent.contrastText, light().accent.main)).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps text and every status colour at AA on white', () => {
      expect(ratio(light().text.primary, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
      expect(ratio(light().text.secondary, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
      for (const key of ['primary', 'error', 'warning', 'success', 'info'] as const) {
        expect(ratio(light()[key].main, '#FFFFFF'), key).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  describe('Shared tokens', () => {
    it('keeps the accent identical in both schemes', () => {
      expect(theme.colorSchemes.light!.palette.accent).toEqual(
        theme.colorSchemes.dark!.palette.accent
      );
    });

    it('emits accent and muted as CSS custom properties so sx paths resolve', () => {
      expect(theme.vars.palette.accent.main).toContain('--mui-palette-accent-main');
      expect(theme.vars.palette.muted.main).toContain('--mui-palette-muted-main');
    });

    it('resolves the legacy marketing tokens onto the Console ramp (no second palette)', () => {
      expect(theme.colorSchemes.light!.palette.marketing.primary).toBe('#1A1A1A');
      expect(theme.colorSchemes.light!.palette.marketing.gradient).toBe('none');
      expect(theme.colorSchemes.dark!.palette.marketing.hero).toBe('#212121');
    });

    it('styles the legacy marketing display variants on the same small-and-heavy scale', () => {
      expect(theme.typography.heroTitle.fontWeight).toBe(700);
      expect(theme.typography.heroTitle.fontSize).toBe('2.75rem');
      expect(theme.typography.sectionTitle.fontSize).toBe('1.875rem');
    });
  });

  describe('Shape and depth', () => {
    it('casts no shadows at any elevation', () => {
      expect(theme.shadows.every((s) => s === 'none')).toBe(true);
    });

    it('draws surfaces with a hairline read from the scheme variable', () => {
      const card = theme.components?.MuiCard?.styleOverrides?.root as Record<string, unknown>;
      expect(card.border).toBe('1px solid var(--sp-border)');
      expect(card.boxShadow).toBe('none');
      expect(card.borderRadius).toBe(8);
      const paper = theme.components?.MuiPaper?.styleOverrides?.elevation as Record<string, unknown>;
      expect(paper.border).toBe('1px solid var(--sp-border)');
    });

    // The scheme variation lives in custom properties (app/globals.css), not
    // in a second scheme-scoped rule — a nested `[data-mui-color-scheme]`
    // block would compile to a separate later rule at equal specificity and
    // outrank every call-site sx.
    it('has no scheme-scoped duplicate rules on Card or OutlinedInput', () => {
      const card = theme.components?.MuiCard?.styleOverrides?.root as Record<string, unknown>;
      const input = theme.components?.MuiOutlinedInput?.styleOverrides?.root as Record<string, unknown>;
      for (const key of [...Object.keys(card), ...Object.keys(input)]) {
        expect(key).not.toContain('data-mui-color-scheme');
      }
      expect(input['& .MuiOutlinedInput-notchedOutline']).toMatchObject({
        borderColor: 'var(--sp-border-input)',
      });
    });

    it('rounds controls to 6px and panels to 8px', () => {
      expect((theme.components?.MuiButton?.styleOverrides?.root as any).borderRadius).toBe(6);
      expect((theme.components?.MuiOutlinedInput?.styleOverrides?.root as any).borderRadius).toBe(6);
      expect(theme.shape.borderRadius).toBe(8);
      expect((theme.components?.MuiChip?.styleOverrides?.root as any).borderRadius).toBe(999);
    });
  });

  describe('Typography and touch', () => {
    it('sets IBM Plex Sans via the next/font variable', () => {
      expect(theme.typography.fontFamily).toContain('var(--font-ui)');
      expect(theme.typography.fontFamily).toContain('IBM Plex Sans');
    });

    it('keeps buttons sentence-case and at the 44px touch minimum', () => {
      const root = theme.components?.MuiButton?.styleOverrides?.root as any;
      expect(root.textTransform).toBe('none');
      expect(root.minHeight).toBe(44);
      expect(root.fontWeight).toBe(600);
      const icon = theme.components?.MuiIconButton?.styleOverrides?.root as (args: {
        theme: typeof theme;
      }) => any;
      expect(icon({ theme }).minHeight).toBe(44);
    });

    it('defines the eyebrow section-label variant', () => {
      expect(theme.typography.eyebrow.textTransform).toBe('uppercase');
      expect(theme.typography.eyebrow.fontSize).toBe('0.6875rem');
    });
  });
});
