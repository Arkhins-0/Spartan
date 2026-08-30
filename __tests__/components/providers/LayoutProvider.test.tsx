import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import theme from '@/lib/theme';
import LayoutProvider from '@/components/providers/LayoutProvider';

/** Reports which MUI theme the page content resolves via its CSS-variable prefix (`mui` is the Console theme). */
function ThemeProbe() {
  const active = useTheme();
  return <span data-testid="theme-probe" data-prefix={active.cssVarPrefix} />;
}

const mocks = vi.hoisted(() => ({
  pathname: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: mocks.useSession,
}));

vi.mock('next/navigation', () => ({
  usePathname: mocks.pathname,
}));

vi.mock('@/components/features/navigation/MarketingHeader', () => ({
  default: () => <header>Marketing header</header>,
}));

vi.mock('@/components/features/navigation/MarketingFooter', () => ({
  default: () => <footer>Marketing footer</footer>,
}));

function renderWithProviders(children: ReactNode) {
  return render(
    <ThemeProvider theme={theme}>
      <LayoutProvider>{children}</LayoutProvider>
    </ThemeProvider>
  );
}

describe('LayoutProvider marketing chrome routing', () => {
  beforeEach(() => {
    mocks.pathname.mockReset();
    mocks.useSession.mockReset();
    mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' });
  });

  it('wraps the root landing page with accessible marketing chrome', () => {
    mocks.pathname.mockReturnValue('/');

    renderWithProviders(<div>Landing content</div>);

    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('does not duplicate chrome for marketing route-group pages such as pricing', () => {
    mocks.pathname.mockReturnValue('/pricing');

    renderWithProviders(<main>Pricing content</main>);

  expect(screen.getByText('Pricing content').closest('main')).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /skip to main content/i })).not.toBeInTheDocument();
  });

  // The landing page, the docs and the auth pages are all built from Console
  // tokens, so nothing is pinned to a scheme any more: a dark-mode visitor
  // gets a dark page with dark chrome everywhere on the public site.
  describe('scheme-aware chrome (no light pins)', () => {
    const pinned = (container: HTMLElement) =>
      container.querySelector('[data-mui-color-scheme]');

    it.each(['/', '/docs', '/login', '/signup', '/forgot-password'])(
      'leaves %s following the visitor theme',
      (path) => {
        mocks.pathname.mockReturnValue(path);

        const { container } = renderWithProviders(<div>content</div>);

        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(pinned(container)).toBeNull();
      }
    );

    it('paints the layout root on the page token, not a baked colour', () => {
      mocks.pathname.mockReturnValue('/');

      const { container } = renderWithProviders(<div>content</div>);

      const root = container.firstElementChild as HTMLElement;
      expect(getComputedStyle(root).backgroundColor).toContain('--mui-palette-background-default');
    });
  });

  // One theme for the whole site (lib/theme.ts): the nested marketing theme
  // was retired, so every public route — landing page and auth pages alike —
  // resolves the Console theme (`--mui-*`) and still gets the header/footer.
  describe('theme scope', () => {
    const prefixFor = () => screen.getByTestId('theme-probe').getAttribute('data-prefix');

    it.each(['/', '/docs', '/login', '/signup', '/reset-password/tok123'])(
      'resolves the Console theme at %s',
      (path) => {
        mocks.pathname.mockReturnValue(path);

        renderWithProviders(<ThemeProbe />);

        expect(prefixFor()).toBe('mui');
        expect(screen.getByRole('banner')).toBeInTheDocument();
        expect(screen.getByRole('contentinfo')).toBeInTheDocument();
      }
    );
  });

  // All six routes in app/(auth) share one layout, so they must get the same
  // chrome here too. /forgot-password and the three token routes previously
  // matched no branch at all and rendered with no skip link and no
  // #main-content landmark.
  describe('auth chrome is uniform across the route group', () => {
    it.each([
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password/tok123',
      '/verify-email/tok123',
      '/confirm-email-change/tok123',
    ])('gives %s a skip link and a main landmark', (path) => {
      mocks.pathname.mockReturnValue(path);

      renderWithProviders(<div>Auth content</div>);

      expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute(
        'href',
        '#main-content'
      );
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    // The prefix match this replaced also caught the public /signups pages,
    // which bring their own chrome from app/(marketing)/layout.tsx.
    it.each(['/signups', '/signups/evt_1', '/signup-events'])(
      'does not add a second copy of the chrome to %s',
      (path) => {
        mocks.pathname.mockReturnValue(path);

        renderWithProviders(<main>Signups content</main>);

        expect(screen.queryByRole('banner')).not.toBeInTheDocument();
        expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
      }
    );
  });
});