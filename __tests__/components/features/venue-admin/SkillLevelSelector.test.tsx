import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicVenueFilters } from "@/components/features/venue-admin/PublicVenueFilters";
import { SkillLevelSelector } from "@/components/features/venue-admin/SkillLevelSelector";
import theme from "@/lib/theme";

function renderWithTheme(component: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
}

describe("skill level selector components", () => {
  it("renders skill level checkbox options", () => {
    renderWithTheme(
      <SkillLevelSelector
        skillLevels={[{ id: "level-1", label: "Squirt", discipline: "CIRCUIT_RACING", source: "FMSCI" }]}
        selectedIds={[]}
      />
    );

    expect(screen.getByText("Skill levels")).toBeInTheDocument();
    expect(screen.getByLabelText("Squirt")).toBeInTheDocument();
  });

  it("renders public rink filter links", () => {
    renderWithTheme(<PublicVenueFilters skillLevels={[{ id: "level-1", label: "Squirt" }]} basePath="/circuits/north-circuit/schedule" />);

    expect(screen.getByText("Filter by level")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Squirt" })).toHaveAttribute("href", "/circuits/north-circuit/schedule?level=level-1");
  });
});
