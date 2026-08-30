import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireUserId, mockHasCapability, mockPrisma } = vi.hoisted(() => ({
  mockRequireUserId: vi.fn(),
  mockHasCapability: vi.fn(),
  mockPrisma: {
    leagueUser: { count: vi.fn() },
    raceRound: { findUnique: vi.fn() },
    raceSession: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    venueReservation: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUserId: (...args: unknown[]) => mockRequireUserId(...args),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth/capabilities", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/capabilities")>();
  return { ...actual, hasCapability: mockHasCapability };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createRaceSession,
  updateRaceSession,
  getRaceSessions,
} from "@/lib/actions/race-sessions";

const USER_ID = "cluser0000000000000001";
const LEAGUE_ID = "clleague0000000000000001";
const ROUND_ID = "clround00000000000000001";
const SESSION_ID = "clsessio0000000000000001";
const RESERVATION_ID = "clresrv00000000000000001";
const VENUE_ID = "clvenue00000000000000001";
const SURFACE_ID = "clsurfac0000000000000001";

const base = {
  roundId: ROUND_ID,
  name: "Qualifying",
  kind: "QUALIFYING" as const,
  startAt: new Date("2026-03-14T09:00:00.000Z"),
  endAt: new Date("2026-03-14T09:30:00.000Z"),
  timezone: "Asia/Kolkata",
  sortOrder: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUserId.mockResolvedValue(USER_ID);
  mockHasCapability.mockResolvedValue(true);
  mockPrisma.leagueUser.count.mockResolvedValue(1);
  mockPrisma.raceRound.findUnique.mockResolvedValue({
    id: ROUND_ID,
    leagueId: LEAGUE_ID,
  });
  mockPrisma.raceSession.create.mockResolvedValue({ id: SESSION_ID });
  mockPrisma.raceSession.update.mockResolvedValue({ id: SESSION_ID });
});

describe("createRaceSession", () => {
  it("stores a paper timetable entry with no space claimed", async () => {
    const result = await createRaceSession({ ...base, kind: "ADMIN", name: "Sign-on" });

    expect(result.success).toBe(true);
    const data = mockPrisma.raceSession.create.mock.calls[0][0].data;
    expect(data.reservationId).toBeNull();
    expect(data.venueId).toBeNull();
    expect(mockPrisma.venueReservation.findUnique).not.toHaveBeenCalled();
  });

  it("asks the round scope, not the association, for authority", async () => {
    await createRaceSession(base);

    expect(mockHasCapability).toHaveBeenCalledWith(
      expect.objectContaining({ leagueId: LEAGUE_ID, roundId: ROUND_ID }),
    );
  });

  it("refuses a caller without authority over the weekend", async () => {
    mockHasCapability.mockResolvedValue(false);

    const result = await createRaceSession(base);

    expect(result.success).toBe(false);
    expect(mockPrisma.raceSession.create).not.toHaveBeenCalled();
  });

  it("copies venue, surface, and segment from the reservation rather than the form", async () => {
    mockPrisma.venueReservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CONFIRMED",
      venueId: VENUE_ID,
      surfaceId: SURFACE_ID,
      segmentId: null,
      startsAt: new Date("2026-03-14T08:00:00.000Z"),
      endsAt: new Date("2026-03-14T18:00:00.000Z"),
      ownerLeagueId: LEAGUE_ID,
    });

    // The form claims a different venue; the reservation is the occupancy
    // record, so it must win.
    const result = await createRaceSession({
      ...base,
      reservationId: RESERVATION_ID,
      venueId: "clvenue00000000000000009",
    });

    expect(result.success).toBe(true);
    const data = mockPrisma.raceSession.create.mock.calls[0][0].data;
    expect(data.venueId).toBe(VENUE_ID);
    expect(data.surfaceId).toBe(SURFACE_ID);
    expect(data.reservationId).toBe(RESERVATION_ID);
  });

  it("rejects ice the venue has not confirmed", async () => {
    mockPrisma.venueReservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "HELD",
      venueId: VENUE_ID,
      surfaceId: null,
      segmentId: null,
      startsAt: new Date("2026-03-14T08:00:00.000Z"),
      endsAt: new Date("2026-03-14T18:00:00.000Z"),
      ownerLeagueId: LEAGUE_ID,
    });

    const result = await createRaceSession({ ...base, reservationId: RESERVATION_ID });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.raceSession.create).not.toHaveBeenCalled();
  });

  it("rejects a reservation owned by another association", async () => {
    mockPrisma.venueReservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CONFIRMED",
      venueId: VENUE_ID,
      surfaceId: null,
      segmentId: null,
      startsAt: new Date("2026-03-14T08:00:00.000Z"),
      endsAt: new Date("2026-03-14T18:00:00.000Z"),
      ownerLeagueId: "clleague0000000000000009",
    });

    const result = await createRaceSession({ ...base, reservationId: RESERVATION_ID });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.raceSession.create).not.toHaveBeenCalled();
  });

  it("rejects a session that runs past the end of its booking", async () => {
    mockPrisma.venueReservation.findUnique.mockResolvedValue({
      id: RESERVATION_ID,
      status: "CONFIRMED",
      venueId: VENUE_ID,
      surfaceId: null,
      segmentId: null,
      startsAt: new Date("2026-03-14T09:00:00.000Z"),
      endsAt: new Date("2026-03-14T09:15:00.000Z"),
      ownerLeagueId: LEAGUE_ID,
    });

    const result = await createRaceSession({ ...base, reservationId: RESERVATION_ID });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.raceSession.create).not.toHaveBeenCalled();
  });

  it("rejects an interval that ends before it starts", async () => {
    const result = await createRaceSession({
      ...base,
      endAt: new Date("2026-03-14T08:00:00.000Z"),
    });

    expect(result).toMatchObject({ success: false, error: "Invalid input" });
  });
});

describe("updateRaceSession", () => {
  beforeEach(() => {
    mockPrisma.raceSession.findUnique.mockResolvedValue({
      id: SESSION_ID,
      roundId: ROUND_ID,
      round: { leagueId: LEAGUE_ID },
    });
  });

  it("reports a clashing timetable position in the organizer's language", async () => {
    const { Prisma } = await import("@prisma/client");
    mockPrisma.raceSession.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "7",
      }),
    );

    const result = await updateRaceSession({ ...base, sessionId: SESSION_ID });

    expect(result).toMatchObject({
      success: false,
      error: "Another session already holds that place in the timetable",
    });
  });
});

describe("getRaceSessions", () => {
  it("tells the client whether space is booked without leaking the reservation id", async () => {
    mockPrisma.raceSession.findMany.mockResolvedValue([
      {
        id: SESSION_ID,
        name: "Race 1",
        kind: "RACE",
        startAt: new Date("2026-03-14T11:00:00.000Z"),
        endAt: new Date("2026-03-14T11:30:00.000Z"),
        timezone: "Asia/Kolkata",
        sortOrder: 2,
        notes: null,
        reservationId: RESERVATION_ID,
        venue: { id: VENUE_ID, name: "Kari Motor Speedway" },
        surface: null,
        segment: null,
      },
    ]);

    const result = await getRaceSessions({ roundId: ROUND_ID });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data[0].hasReservation).toBe(true);
    expect(JSON.stringify(result.data)).not.toContain(RESERVATION_ID);
  });

  it("refuses a caller outside the association", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await getRaceSessions({ roundId: ROUND_ID });

    expect(result.success).toBe(false);
    expect(mockPrisma.raceSession.findMany).not.toHaveBeenCalled();
  });
});
