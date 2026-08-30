import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameForm } from "@/components/features/seasons/GameForm";

// Mock the Server Actions so rendering is pure
vi.mock("@/lib/actions/season-games", () => ({
  createSeasonGame: vi.fn(),
  updateSeasonGame: vi.fn(),
}));

// SC-007: the motorsport-only platform must never leak hockey vocabulary
const HOCKEY_VOCABULARY = /ice|rink|squirt|peewee|bantam|mite/i;

const SEASON_ID = "clseason0000000000000001";
const VENUE_ID = "clvenue00000000000000001";
const SURFACE_ID = "clsurface000000000000001";

// Fixture names deliberately avoid hockey vocabulary so the SC-007 sweep
// only measures what the component itself renders.
const baseProps = {
  open: true,
  onClose: vi.fn(),
  seasonId: SEASON_ID,
  sport: "MOTORSPORT" as const,
  teams: [
    { id: "clteama00000000000000001", name: "Northside Hawks" },
    { id: "clteamb00000000000000001", name: "Southside Owls" },
  ],
  venues: [{ id: VENUE_ID, name: "Central Sports Complex", timezone: "America/New_York" }],
  surfacesByVenue: {
    [VENUE_ID]: [{ id: SURFACE_ID, name: "Main Surface" }],
  },
};

// Segments a venue admin might have drawn on a circuit.
const circuitSegments = {
  [SURFACE_ID]: [
    { id: "clsegeast000000000000001", name: "East loop" },
    { id: "clsegwest000000000000001", name: "West loop" },
  ],
};

async function pickVenueAndSurface(surfaceLabelPattern: RegExp) {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText(/venue \(optional\)/i));
  await user.click(await screen.findByRole("option", { name: "Central Sports Complex" }));
  await user.click(screen.getByLabelText(surfaceLabelPattern));
  await user.click(await screen.findByRole("option", { name: "Main Surface" }));
  return user;
}

describe("GameForm sport awareness (SC-007)", () => {
  describe("motorsport with a segmented circuit", () => {
    it("labels the surface picker as a circuit once a venue is chosen", async () => {
      render(<GameForm {...baseProps} />);
      const user = userEvent.setup();
      await user.click(screen.getByLabelText(/venue \(optional\)/i));
      await user.click(await screen.findByRole("option", { name: "Central Sports Complex" }));
      expect(screen.getByLabelText(/circuit \(optional\)/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/rink \(optional\)/i)).not.toBeInTheDocument();
    });

    it("shows the segment select once a segmented surface is chosen", async () => {
      render(
        <GameForm
          {...baseProps}
          segmentsBySurface={circuitSegments}
          wholeLabelBySurface={{ [SURFACE_ID]: "Full circuit" }}
        />
      );

      // No segment select until a surface with segments is picked.
      expect(screen.queryByLabelText(/segment \(optional\)/i)).not.toBeInTheDocument();

      await pickVenueAndSurface(/circuit \(optional\)/i);

      expect(screen.getByLabelText(/segment \(optional\)/i)).toBeInTheDocument();
    });

    it("offers the segment names plus the whole-surface label", async () => {
      render(
        <GameForm
          {...baseProps}
          segmentsBySurface={circuitSegments}
          wholeLabelBySurface={{ [SURFACE_ID]: "Full circuit" }}
        />
      );

      const user = await pickVenueAndSurface(/circuit \(optional\)/i);
      await user.click(screen.getByLabelText(/segment \(optional\)/i));

      const listbox = await screen.findByRole("listbox");
      expect(within(listbox).getByRole("option", { name: "Full circuit" })).toBeInTheDocument();
      expect(within(listbox).getByRole("option", { name: "East loop" })).toBeInTheDocument();
      expect(within(listbox).getByRole("option", { name: "West loop" })).toBeInTheDocument();

      // SC-007 sweep with the picker open: no hockey vocabulary.
      expect(document.body.textContent ?? "").not.toMatch(HOCKEY_VOCABULARY);
    });

    it("renders no segment select when the chosen surface has no segments", async () => {
      render(<GameForm {...baseProps} />);

      expect(screen.getByText("Schedule a game")).toBeInTheDocument();

      await pickVenueAndSurface(/circuit \(optional\)/i);

      expect(screen.queryByLabelText(/segment \(optional\)/i)).not.toBeInTheDocument();
    });

    it("contains no hockey vocabulary anywhere in the rendered output", () => {
      render(<GameForm {...baseProps} segmentsBySurface={circuitSegments} />);

      // The MUI Dialog renders into a portal, so sweep the whole document.
      expect(document.body.textContent ?? "").not.toMatch(HOCKEY_VOCABULARY);
    });

    it("falls back to 'Whole surface' without a custom whole label", async () => {
      render(<GameForm {...baseProps} segmentsBySurface={circuitSegments} />);

      const user = await pickVenueAndSurface(/circuit \(optional\)/i);
      await user.click(screen.getByLabelText(/segment \(optional\)/i));

      const listbox = await screen.findByRole("listbox");
      expect(within(listbox).getByRole("option", { name: "Whole surface" })).toBeInTheDocument();
    });
  });
});
