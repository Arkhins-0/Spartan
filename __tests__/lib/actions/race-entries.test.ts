import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireUserId, mockHasCapability, mockPrisma } = vi.hoisted(() => ({
  mockRequireUserId: vi.fn(),
  mockHasCapability: vi.fn(),
  mockPrisma: {
    leagueUser: { count: vi.fn() },
    team: { findFirst: vi.fn() },
    player: { findFirst: vi.fn() },
    raceRound: { findUnique: vi.fn() },
    raceEntry: {
      upsert: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
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

import { upsertRaceEntry, getRaceEntries } from "@/lib/actions/race-entries";

const USER_ID = "cluser0000000000000001";
const LEAGUE_ID = "clleague0000000000000001";
const ROUND_ID = "clround00000000000000001";
const TEAM_ID = "clteama00000000000000001";
const DRIVER_ID = "cldrivera000000000000001";
const ENTRY_ID = "clentry00000000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUserId.mockResolvedValue(USER_ID);
  mockHasCapability.mockResolvedValue(true);
  mockPrisma.leagueUser.count.mockResolvedValue(1);
  mockPrisma.raceRound.findUnique.mockResolvedValue({
    id: ROUND_ID,
    leagueId: LEAGUE_ID,
    status: "SCHEDULED",
  });
  mockPrisma.team.findFirst.mockResolvedValue({ id: TEAM_ID });
  mockPrisma.player.findFirst.mockResolvedValue({ id: DRIVER_ID });
  mockPrisma.raceEntry.upsert.mockResolvedValue({ id: ENTRY_ID });
  mockPrisma.raceEntry.create.mockResolvedValue({ id: ENTRY_ID });
  mockPrisma.raceEntry.update.mockResolvedValue({ id: ENTRY_ID });
  mockPrisma.raceEntry.findFirst.mockResolvedValue(null);
});

describe("upsertRaceEntry", () => {
  it("keeps a leading zero in the car number", async () => {
    // "07" is not 7. Storing it as an integer would rename the car.
    const result = await upsertRaceEntry({
      roundId: ROUND_ID,
      teamId: TEAM_ID,
      playerId: DRIVER_ID,
      carNumber: "07",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.raceEntry.upsert.mock.calls[0][0].create.carNumber).toBe("07");
  });

  it("addresses a driverless team entry by find-then-write, not the compound key", async () => {
    // Postgres treats NULLs as distinct, so Prisma cannot target the compound
    // unique with a null driver.
    const result = await upsertRaceEntry({ roundId: ROUND_ID, teamId: TEAM_ID });

    expect(result.success).toBe(true);
    expect(mockPrisma.raceEntry.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.raceEntry.create).toHaveBeenCalled();
  });

  it("corrects the existing driverless entry rather than adding a second", async () => {
    mockPrisma.raceEntry.findFirst.mockResolvedValue({ id: ENTRY_ID });

    const result = await upsertRaceEntry({
      roundId: ROUND_ID,
      teamId: TEAM_ID,
      className: "GT4",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.raceEntry.create).not.toHaveBeenCalled();
    expect(mockPrisma.raceEntry.update).toHaveBeenCalled();
  });

  it("rejects a team from another championship", async () => {
    mockPrisma.team.findFirst.mockResolvedValue(null);

    const result = await upsertRaceEntry({ roundId: ROUND_ID, teamId: TEAM_ID });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.raceEntry.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.raceEntry.create).not.toHaveBeenCalled();
  });

  it("rejects a driver who is not on the entered team", async () => {
    mockPrisma.player.findFirst.mockResolvedValue(null);

    const result = await upsertRaceEntry({
      roundId: ROUND_ID,
      teamId: TEAM_ID,
      playerId: DRIVER_ID,
    });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.raceEntry.upsert).not.toHaveBeenCalled();
  });

  it("refuses a caller without authority over the weekend", async () => {
    mockHasCapability.mockResolvedValue(false);

    const result = await upsertRaceEntry({ roundId: ROUND_ID, teamId: TEAM_ID });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.team.findFirst).not.toHaveBeenCalled();
  });
});

describe("getRaceEntries", () => {
  it("exposes the driver name only, never roster-private fields", async () => {
    mockPrisma.raceEntry.findMany.mockResolvedValue([
      {
        id: ENTRY_ID,
        carNumber: "07",
        className: "GT4",
        status: "CONFIRMED",
        notes: null,
        team: { id: TEAM_ID, name: "Chennai Racing" },
        player: { id: DRIVER_ID, name: "A. Kumar" },
      },
    ]);

    const result = await getRaceEntries({ roundId: ROUND_ID });

    expect(result.success).toBe(true);
    const select = mockPrisma.raceEntry.findMany.mock.calls[0][0].select;
    expect(select.player.select).toEqual({ id: true, name: true });
  });

  it("refuses a caller outside the association", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await getRaceEntries({ roundId: ROUND_ID });

    expect(result.success).toBe(false);
    expect(mockPrisma.raceEntry.findMany).not.toHaveBeenCalled();
  });
});
