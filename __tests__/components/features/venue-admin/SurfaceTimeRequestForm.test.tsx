import { ThemeProvider } from "@mui/material/styles";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvailableSurfaceBrowser } from "@/components/features/venue-admin/AvailableSurfaceBrowser";
import { SurfaceTimeRequestForm } from "@/components/features/venue-admin/SurfaceTimeRequestForm";
import { SurfaceTimeRequestQueue } from "@/components/features/venue-admin/SurfaceTimeRequestQueue";
import theme from "@/lib/theme";

const { mockSubmitSurfaceTimeRequest } = vi.hoisted(() => ({
  mockSubmitSurfaceTimeRequest: vi.fn(),
}));

vi.mock("@/lib/actions/venue-requests", () => ({
  submitSurfaceTimeRequest: (...args: unknown[]) => mockSubmitSurfaceTimeRequest(...args),
}));

function renderWithTheme(component: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
}

describe("track time request components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = MockResizeObserver as typeof ResizeObserver;
    mockSubmitSurfaceTimeRequest.mockResolvedValue({
      success: true,
      data: { requestId: "clreqxxxxxxxxxxxxxxxxxxxxxxx", status: "SUBMITTED" },
    });
  });

  it("renders available track time browser and request form", () => {
    renderWithTheme(
      <>
        <AvailableSurfaceBrowser
          mode="public"
          timeZone="America/New_York"
          blocks={[{
            id: "block-1",
            title: "Available Ice",
            startsAt: new Date("2026-03-01T10:00:00Z"),
            endsAt: new Date("2026-03-01T11:00:00Z"),
            remainingSlices: [{
              startsAt: new Date("2026-03-01T10:00:00Z"),
              endsAt: new Date("2026-03-01T11:00:00Z"),
            }],
          }]}
        />
        <SurfaceTimeRequestForm
          scheduleBlockId="block-1"
          venueId="venue-1"
          venueName="North Rink"
          startsAt="2026-03-01T10:00:00Z"
          endsAt="2026-03-01T11:00:00Z"
        />
      </>
    );

    expect(screen.getByText("Available track time")).toBeInTheDocument();
    expect(screen.getByText("Available Ice")).toBeInTheDocument();
    expect(screen.getByText("Requesting track time at North Rink")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit request" })).toBeInTheDocument();
  });

  it("submits track time request details through the Server Action", async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <SurfaceTimeRequestForm
        scheduleBlockId="block-1"
        venueId="venue-1"
        venueName="North Rink"
        startsAt="2026-03-01T10:00:00Z"
        endsAt="2026-03-01T11:00:00Z"
      />
    );

    await user.type(screen.getByLabelText("Requester organization"), "Sharks Hockey");
    await user.type(screen.getByLabelText(/Contact name/), "Coach One");
    await user.type(screen.getByLabelText(/Contact email/), "coach@example.com");
    await user.type(screen.getByLabelText(/Notes/), "Need a goalie net.");
    await user.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => {
      expect(mockSubmitSurfaceTimeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduleBlockId: "block-1",
          venueId: "venue-1",
          requesterOrganizationName: "Sharks Hockey",
          contactName: "Coach One",
          contactEmail: "coach@example.com",
          notes: "Need a goalie net.",
          requestedStartAt: expect.any(Date),
          requestedEndAt: expect.any(Date),
        })
      );
    });
    expect(await screen.findByText("Track time request submitted.")).toBeInTheDocument();
  });

  it("renders private manager request queue details", () => {
    renderWithTheme(
      <SurfaceTimeRequestQueue
        organizationId="corg000000000000000000000"
        venueId="cvenue0000000000000000000"
        requests={[
          {
            id: "request-1",
            contactName: "Coach One",
            contactEmail: "coach@example.com",
            status: "SUBMITTED",
            timezone: "America/New_York",
            requestedStartAt: new Date("2026-03-01T10:00:00Z"),
            requestedEndAt: new Date("2026-03-01T11:00:00Z"),
          },
        ]}
      />
    );

    expect(screen.getByText("Request queue")).toBeInTheDocument();
    expect(screen.getByText("coach@example.com")).toBeInTheDocument();
  });
});
