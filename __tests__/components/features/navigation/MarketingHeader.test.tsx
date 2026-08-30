import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/lib/theme';
import MarketingHeader from '@/components/features/navigation/MarketingHeader';

// Local, controllable pathname. vitest.setup.ts mocks next/navigation with a
// plain `usePathname: () => '/'`, which cannot be re-stubbed per test; the
// header's auth-page early return and active-link state key off it, so a few
// of these tests need to leave the homepage. Defaults to '/' to match the
// global mock.
const mockPathname = vi.fn(() => '/');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js components
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, priority }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      data-priority={priority}
    />
  ),
}));

// Mock Logo component
vi.mock('@/components/ui/Logo', () => ({
  default: ({ size, href, priority, showText }: any) => (
    <div data-testid="logo" data-size={size} data-href={href} data-priority={priority}>
      Logo
      {showText && <span>Spartan</span>}
    </div>
  ),
}));

// Helper to render with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('MarketingHeader', () => {
  describe('Basic Rendering', () => {
    it('renders logo with correct props', () => {
      renderWithTheme(<MarketingHeader />);
      const logo = screen.getByTestId('logo');
      expect(logo).toHaveAttribute('data-size', 'large');
      expect(logo).toHaveAttribute('data-priority', 'true');
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('renders all navigation links', () => {
      renderWithTheme(<MarketingHeader />);

      expect(screen.getByRole('navigation', { name: /primary marketing navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/features');
      expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing');
      expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
      expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact');
      expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('href', '/docs');
    });

    it('renders Sign In and Get Started buttons', () => {
      renderWithTheme(<MarketingHeader />);

      expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
      expect(screen.getByRole('link', { name: 'Get Started Free' })).toHaveAttribute('href', '/signup');
    });

  });

  describe('Accessibility', () => {

    it('maintains keyboard navigation', () => {
      renderWithTheme(<MarketingHeader />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toBeInTheDocument();
      });
    });

    it('has proper heading structure', () => {
      renderWithTheme(<MarketingHeader />);

      // Logo should be properly structured
      const logo = screen.getByTestId('logo');
      expect(logo).toBeInTheDocument();
      // Logo component renders Spartan text when showText is true
      expect(screen.getByText('Spartan')).toBeInTheDocument();
    });

    it('opens an accessible mobile navigation drawer on small screens', () => {
      const originalMatchMedia = window.matchMedia;

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query.includes('max-width'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      try {
        renderWithTheme(<MarketingHeader />);

        const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
        expect(menuButton).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(menuButton);

        expect(screen.getByRole('dialog', { name: /marketing navigation menu/i })).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: /mobile marketing navigation/i })).toBeInTheDocument();
        expect(menuButton).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('link', { name: 'Features' })).toHaveAttribute('href', '/features');
      } finally {
        Object.defineProperty(window, 'matchMedia', {
          writable: true,
          value: originalMatchMedia,
        });
      }
    });
  });

  describe('Theme Integration', () => {
    it('uses marketing theme colors', () => {
      renderWithTheme(<MarketingHeader />);

      // Component should render without errors with marketing theme
      const logo = screen.getByTestId('logo');
      expect(logo).toBeInTheDocument();
      // Logo renders Spartan text when showText is true
      expect(screen.getByText('Spartan')).toBeInTheDocument();
    });

    it('applies marketing button variant to CTA', () => {
      renderWithTheme(<MarketingHeader />);

      const getStartedButton = screen.getByRole('link', { name: 'Get Started Free' });
      expect(getStartedButton).toBeInTheDocument();
    });
  });

    describe('Navigation Links', () => {
    const navigationLinks = [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Docs', href: '/docs' },
    ];

    it.each(navigationLinks)('renders $label link with correct href', ({ label, href }) => {
      renderWithTheme(<MarketingHeader />);
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    });
  });

  describe('Color scheme', () => {
    // AppBar's default color="primary" emits `color: primary.contrastText`,
    // which the Logo wordmark would inherit. color="inherit" lets the bar take
    // its text colour from the page and its surface from the tokens.
    it('uses color="inherit" so the bar does not force its own text color', () => {
      const { container } = renderWithTheme(<MarketingHeader />);

      const appBar = container.querySelector('.MuiAppBar-root');
      expect(appBar).not.toBeNull();
      expect(appBar!.className).toContain('MuiAppBar-colorInherit');
      expect(appBar!.className).not.toContain('MuiAppBar-colorPrimary');
    });

    // The bar is the same card-coloured surface on every public route: there
    // is no transparent-over-hero mode any more, so the homepage and an inner
    // page paint the same token. A baked white here would sit as a light bar
    // over the dark scheme.
    it.each(['/', '/about'])('paints the bar on the paper token at %s', (path) => {
      mockPathname.mockReturnValue(path);
      try {
        const { container } = renderWithTheme(<MarketingHeader />);

        const appBar = container.querySelector('.MuiAppBar-root') as HTMLElement;
        const styles = getComputedStyle(appBar);
        expect(styles.backgroundColor).toContain('--mui-palette-background-paper');
        // jsdom drops a var() inside the border shorthand, so the hairline is
        // not assertable here; the absence of blur and shadow is.
        expect(styles.backdropFilter || '').not.toContain('blur');
        expect(styles.boxShadow || 'none').toBe('none');
      } finally {
        mockPathname.mockReturnValue('/');
      }
    });

    it('hides the whole bar on auth pages', () => {
      mockPathname.mockReturnValue('/login');
      try {
        const { container } = renderWithTheme(<MarketingHeader />);
        expect(container.querySelector('.MuiAppBar-root')).toBeNull();
        expect(screen.queryByRole('banner')).not.toBeInTheDocument();
      } finally {
        mockPathname.mockReturnValue('/');
      }
    });
  });
});
