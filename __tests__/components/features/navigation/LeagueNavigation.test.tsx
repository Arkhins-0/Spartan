import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { describe, expect, it, vi } from "vitest";
import DashboardNav from "@/components/features/dashboard/DashboardNav";
import MobileNavigation from "@/components/features/navigation/MobileNavigation";
import theme from "@/lib/theme";

const mocks = vi.hoisted(() => ({
  pathname: "/",
  currentLeague: { id: "league-1" },
  logout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("@/components/providers/LeagueProvider", () => ({
  useLeague: () => ({ currentLeague: mocks.currentLeague }),
}));

vi.mock("@/lib/actions/logout", () => ({
  logout: mocks.logout,
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

describe("league navigation", () => {
  it.each([
    {
      pathname: "/league/league-123/operations/review",
      selected: "Operations",
    },
    {
      pathname: "/league/league-123/venue-reservations/review",
      selected: "Venue Reservations",
    },
  ])("keeps $selected active and league-scoped on desktop", ({ pathname, selected }) => {
    mocks.pathname = pathname;
    mocks.currentLeague = { id: "league-123" };

    renderWithTheme(<DashboardNav isLeagueMode />);

    expect(screen.getByRole("link", { name: "Operations" })).toHaveAttribute(
      "href",
      "/league/league-123/operations",
    );
    expect(screen.getByRole("link", { name: "Venue Reservations" })).toHaveAttribute(
      "href",
      "/league/league-123/venue-reservations",
    );
    expect(screen.getByRole("link", { name: "Gear" })).toHaveAttribute(
      "href",
      "/league/league-123/gear",
    );
    expect(screen.getByRole("link", { name: selected })).toHaveClass("Mui-selected");
    expect(screen.getByRole("link", { name: selected })).toHaveAttribute("aria-current", "page");
  });

  it("keeps every label reachable when the rail is collapsed to icons", () => {
    mocks.pathname = "/league/league-123/gear";
    mocks.currentLeague = { id: "league-123" };

    renderWithTheme(<DashboardNav isLeagueMode collapsed />);

    expect(screen.getByRole("link", { name: "Gear" })).toHaveClass("Mui-selected");
    expect(screen.getByRole("link", { name: "Operations" })).toBeInTheDocument();
  });

  // The phone layout is the same list as the rail, rendered as a scrolling
  // chip row — nothing is hidden behind a "more" menu.
  it("exposes every league destination in the mobile chip row", () => {
    mocks.pathname = "/league/league-123/dashboard";
    mocks.currentLeague = { id: "league-123" };

    renderWithTheme(<MobileNavigation isLeagueMode />);

    const row = screen.getByRole("navigation", { name: "Pages" });
    expect(row).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gear" })).toHaveAttribute(
      "href",
      "/league/league-123/gear",
    );
    expect(screen.getByRole("link", { name: "Operations" })).toHaveAttribute(
      "href",
      "/league/league-123/operations",
    );
    expect(screen.getByRole("link", { name: "Venue Reservations" })).toHaveAttribute(
      "href",
      "/league/league-123/venue-reservations",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  it("offers the same destinations to a single-team admin", () => {
    mocks.pathname = "/roster";

    renderWithTheme(<MobileNavigation />);

    expect(screen.getByRole("link", { name: "Roster" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Leagues" })).toHaveAttribute("href", "/league");
  });
});
