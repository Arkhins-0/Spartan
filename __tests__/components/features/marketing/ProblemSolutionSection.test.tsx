import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/lib/theme';
import ProblemSolutionSection from '@/components/features/marketing/ProblemSolutionSection';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('ProblemSolutionSection', () => {
  it('renders the problem/solution comparison heading and summary', () => {
    renderWithTheme(<ProblemSolutionSection />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /trade race-weekend chaos for one clear race control/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Problem → Solution')).toBeInTheDocument();
    expect(screen.getByText(/everyday paddock admin grind/i)).toBeInTheDocument();
  });

  it('shows before and after comparison panels', () => {
    renderWithTheme(<ProblemSolutionSection />);

    expect(
      screen.getByRole('region', { name: 'The usual race-weekend chaos' })
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'The Spartan race control' })).toBeInTheDocument();
    expect(screen.getByText(/entry lists, licence numbers, and crew details scattered/i)).toBeInTheDocument();
    expect(screen.getByText(/one secure entry list/i)).toBeInTheDocument();
    expect(screen.getByText(/organisers guess the grid/i)).toBeInTheDocument();
    expect(screen.getByText(/live entry and volunteer status/i)).toBeInTheDocument();
  });
});
