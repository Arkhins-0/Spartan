import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/lib/theme';
import FeaturesPreview from '@/components/features/marketing/FeaturesPreview';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('FeaturesPreview', () => {
  it('renders a feature showcase with visual demo labels', () => {
    renderWithTheme(<FeaturesPreview />);

    expect(
      screen.getByRole('heading', { level: 2, name: /see the championship run from one race control/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/visual snapshots show how Spartan replaces spreadsheets/i)).toBeInTheDocument();

    expect(screen.getByRole('article', { name: 'Entry List Management' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Race Weekends & Sessions' })).toBeInTheDocument();
    expect(screen.getByText('Live entry list demo')).toBeInTheDocument();
    expect(screen.getByText('Grid snapshot demo')).toBeInTheDocument();
  });

  it('includes concrete demo stats and accessible progress indicators', () => {
    renderWithTheme(<FeaturesPreview />);

    expect(screen.getByText('24 drivers')).toBeInTheDocument();
    expect(screen.getByText('22 confirmed')).toBeInTheDocument();
    expect(screen.getByText('Reminder queued')).toBeInTheDocument();
    expect(screen.getByText('Qualifying - Round 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Live entry list demo progress')).toHaveAttribute('aria-valuenow', '86');
    expect(screen.getByLabelText('Mobile dashboard demo progress')).toHaveAttribute('aria-valuenow', '88');
  });

  it('keeps demo cards out of the keyboard tab order because they are non-interactive', () => {
    renderWithTheme(<FeaturesPreview />);

    const rosterDemo = screen.getByRole('article', { name: 'Entry List Management' });

    expect(rosterDemo).not.toHaveAttribute('tabindex');
  });
});
