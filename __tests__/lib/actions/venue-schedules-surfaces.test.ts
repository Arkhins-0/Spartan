import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { mockRequireVenueScheduleManager, mockPrisma, mockLogVenueActivity } = vi.hoisted(() => ({
  mockRequireVenueScheduleManager: vi.fn(),
  mockLogVenueActivity: vi.fn(),
  mockPrisma: {
    venue: {
      findFirst: vi.fn(),
    },
    venueSurface: {
      create: vi.fn(),
      update: vi.fn(),
        findFirst: vi.fn(),
    },
    venueOperatingHour: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
    // Surface-capable booking sources checked by the FR-007 archive guard.
    seasonGame: {
      findMany: vi.fn(),
    },
    eventGame: {
      findMany: vi.fn(),
    },
    venueScheduleBlock: {
      findMany: vi.fn(),
    },
    venueReservation: {
      findMany: vi.fn(),
    },
    surfaceTimeRequest: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  VENUE_SCHEDULE_ROLES: ["OWNER", "MANAGER", "SCHEDULER"],
  requireVenueScheduleManager: (...args: unknown[]) => mockRequireVenueScheduleManager(...args),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mockPrisma,
}));

// logVenueActivity moved to lib/services/venue-activity (out of the "use server"
// file); mock it at its new module home. The venue-organizations mock is kept
// for its other exports / module isolation.
vi.mock("@/lib/services/venue-activity", () => ({
  logVenueActivity: (...args: unknown[]) => mockLogVenueActivity(...args),
}));

vi.mock("@/lib/actions/venue-organizations", () => ({
  logVenueActivity: (...args: unknown[]) => mockLogVenueActivity(...args),
}));

import {
  archiveVenueSurface,
  createVenueSurface,
  setOperatingHours,
  updateVenueSurface,
} from "@/lib/actions/venue-schedules";

const USER_ID = "clusrxxxxxxxxxxxxxxxxxxxxxxx";
const ORGANIZATION_ID = "clorgxxxxxxxxxxxxxxxxxxxxxxx";
const VENUE_ID = "clvenxxxxxxxxxxxxxxxxxxxxxxx";
const SURFACE_ID = "clsurxxxxxxxxxxxxxxxxxxxxxxx";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireVenueScheduleManager.mockResolvedValue(USER_ID);
  mockPrisma.venue.findFirst.mockResolvedValue({ id: VENUE_ID, organizationId: ORGANIZATION_ID });
    mockPrisma.venueSurface.findFirst.mockResolvedValue({ id: SURFACE_ID });
  mockPrisma.seasonGame.findMany.mockResolvedValue([]);
  mockPrisma.eventGame.findMany.mockResolvedValue([]);
  mockPrisma.venueScheduleBlock.findMany.mockResolvedValue([]);
  mockPrisma.venueReservation.findMany.mockResolvedValue([]);
  mockPrisma.surfaceTimeRequest.findMany.mockResolvedValue([]);
  mockPrisma.$transaction.mockImplementation(
    async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
  );
  mockLogVenueActivity.mockResolvedValue({ id: "cllogxxxxxxxxxxxxxxxxxxxxxxx" });
});

describe("surface actions", () => {
  it("creates an surface for authorized venue schedulers", async () => {
    mockPrisma.venueSurface.create.mockResolvedValue({
      id: SURFACE_ID,
      venueId: VENUE_ID,
      name: "Main Rink",
    });

    const result = await createVenueSurface({
      organizationId: ORGANIZATION_ID,
      venueId: VENUE_ID,
      name: "Main Rink",
      surfaceType: "CIRCUIT",
      isDefault: true,
    });

    expect(result.success).toBe(true);
    expect(mockRequireVenueScheduleManager).toHaveBeenCalledWith(ORGANIZATION_ID, VENUE_ID);
    expect(mockPrisma.venueSurface.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          venueId: VENUE_ID,
          name: "Main Rink",
          surfaceType: "CIRCUIT",
          isDefault: true,
        }),
      })
    );
  });

  it("updates and archives surfaces without hard deletion", async () => {
    mockPrisma.venueSurface.update
      .mockResolvedValueOnce({ id: SURFACE_ID, venueId: VENUE_ID, name: "Studio" })
      .mockResolvedValueOnce({ id: SURFACE_ID, venueId: VENUE_ID, isActive: false });

    const updateResult = await updateVenueSurface({
      organizationId: ORGANIZATION_ID,
      venueId: VENUE_ID,
      surfaceId: SURFACE_ID,
      name: "Studio",
      surfaceType: "ROOM",
    });
    const archiveResult = await archiveVenueSurface({
      organizationId: ORGANIZATION_ID,
      venueId: VENUE_ID,
      surfaceId: SURFACE_ID,
    });

    expect(updateResult.success).toBe(true);
    expect(archiveResult.success).toBe(true);
    expect(mockPrisma.venueSurface.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: SURFACE_ID, venueId: VENUE_ID },
        data: { isActive: false },
      })
    );
  });

  it("refuses to archive a surface with future bookings (FR-007)", async () => {
    mockPrisma.seasonGame.findMany.mockResolvedValue([
      {
        id: "clgamxxxxxxxxxxxxxxxxxxxxxxx",
        startAt: new Date("2027-01-10T18:00:00Z"),
        endAt: new Date("2027-01-10T19:30:00Z"),
        surfaceId: SURFACE_ID,
        segmentId: null,
        segment: null,
        homeTeam: { name: "Sharks" },
        awayTeam: { name: "Jets" },
      },
    ]);

    const result = await archiveVenueSurface({
      organizationId: ORGANIZATION_ID,
      venueId: VENUE_ID,
      surfaceId: SURFACE_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details).toEqual(
        expect.objectContaining({
          futureBookings: expect.arrayContaining([
            expect.objectContaining({
              source: "seasonGame",
              title: "Sharks vs Jets",
            }),
          ]),
        })
      );
    }
    expect(mockPrisma.venueSurface.update).not.toHaveBeenCalled();
  });

  it("refuses to archive when an active canonical reservation references the surface", async () => {
    mockPrisma.venueReservation.findMany.mockResolvedValue([
      {
        id: "clreservationxxxxxxxxxxxxxxxxx",
        startsAt: new Date("2027-01-10T18:00:00Z"),
        endsAt: new Date("2027-01-10T19:30:00Z"),
        surfaceId: SURFACE_ID,
        segmentId: null,
        sourceScheduleBlock: null,
      },
    ]);

    const result = await archiveVenueSurface({
      organizationId: ORGANIZATION_ID,
      venueId: VENUE_ID,
      surfaceId: SURFACE_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.details).toEqual(
        expect.objectContaining({
          futureBookings: expect.arrayContaining([
            expect.objectContaining({ source: "venueReservation" }),
          ]),
        }),
      );
    }
    expect(mockPrisma.venueReservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          venueId: VENUE_ID,
          surfaceId: SURFACE_ID,
        }),
      }),
    );
  });

  it("cannot bypass the reservation guard through generic surface update", async () => {
    mockPrisma.venueReservation.findMany.mockResolvedValue([{
      id: "clreservationxxxxxxxxxxxxxxxxx",
      startsAt: new Date("2027-01-10T18:00:00Z"),
      endsAt: new Date("2027-01-10T19:30:00Z"),
      surfaceId: SURFACE_ID,
      segmentId: null,
      sourceScheduleBlock: null,
    }]);

    const result = await updateVenueSurface({
      organizationId: ORGANIZATION_ID,
      venueId: VENUE_ID,
      surfaceId: SURFACE_ID,
      name: "Main",
      surfaceType: "CIRCUIT",
      isActive: false,
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.venueSurface.update).not.toHaveBeenCalled();
  });
});

describe("operating hour actions", () => {
  it("creates operating hours when no overlapping rule exists", async () => {
    mockPrisma.venueOperatingHour.findFirst.mockResolvedValue(null);
    mockPrisma.venueOperatingHour.create.mockResolvedValue({ id: "clhrxxxxxxxxxxxxxxxxxxxxxxxx", venueId: VENUE_ID });

    const result = await setOperatingHours({
      organizationId: ORGANIZATION_ID,
      venueId: VENUE_ID,
      surfaceId: SURFACE_ID,
      dayOfWeek: 1,
      opensAt: "08:00",
      closesAt: "22:00",
      effectiveStartDate: "2026-01-01T00:00:00Z",
      status: "OPEN",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.venueOperatingHour.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          venueId: VENUE_ID,
          surfaceId: SURFACE_ID,
          dayOfWeek: 1,
        }),
      })
    );
  });

  it("rejects overlapping operating hour rules for the same day and surface", async () => {
    mockPrisma.venueOperatingHour.findFirst.mockResolvedValue({ id: "existing-rule" });

    const result = await setOperatingHours({
      organizationId: ORGANIZATION_ID,
      venueId: VENUE_ID,
      surfaceId: SURFACE_ID,
      dayOfWeek: 1,
      opensAt: "08:00",
      closesAt: "22:00",
      effectiveStartDate: "2026-01-01T00:00:00Z",
      status: "OPEN",
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.venueOperatingHour.create).not.toHaveBeenCalled();
  });
});
