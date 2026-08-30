import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { mockRequireUserId, mockHasCapability, mockPrisma } = vi.hoisted(() => ({
  mockRequireUserId: vi.fn(),
  mockHasCapability: vi.fn(),
  mockPrisma: {
    leagueUser: { count: vi.fn() },
    team: { count: vi.fn() },
    raceRound: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    raceResult: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUserId: (...args: unknown[]) => mockRequireUserId(...args),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

// Round writes authorize through the same delegated capability path as the rest
// of association scheduling. Mocking that seam keeps these tests about what the
// action decides rather than re-testing grant resolution. Reads still gate on
// plain association membership, which is why leagueUser.count remains mocked.
vi.mock("@/lib/auth/capabilities", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/capabilities")>();
  return { ...actual, hasCapability: mockHasCapability };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  createRaceRound,
  recordRaceResults,
  getChampionshipStandings,
} from "@/lib/actions/race-rounds";

const USER_ID = "cluser0000000000000001";
const LEAGUE_ID = "clleague0000000000000001";
const ROUND_ID = "clround00000000000000001";
const TEAM_A = "clteama00000000000000001";
const TEAM_B = "clteamb00000000000000001";
const DRIVER_A = "cldrivera000000000000001";

/** Points come back from Prisma as Decimal, so the fixtures use Decimal too. */
const dec = (value: number) => new Prisma.Decimal(value);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUserId.mockResolvedValue(USER_ID);
  mockHasCapability.mockResolvedValue(true);
  mockPrisma.leagueUser.count.mockResolvedValue(1);
  mockPrisma.$transaction.mockImplementation(
    async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma)
  );
});

describe("createRaceRound", () => {
  it("stores the race date at UTC midnight so it cannot shift a day", async () => {
    mockPrisma.raceRound.create.mockResolvedValue({ id: ROUND_ID });

    const result = await createRaceRound({
      leagueId: LEAGUE_ID,
      name: "Kari Motor Speedway",
      roundNumber: 1,
      raceDate: "2026-03-14",
    });

    expect(result.success).toBe(true);
    const data = mockPrisma.raceRound.create.mock.calls[0][0].data;
    expect(data.raceDate.toISOString()).toBe("2026-03-14T00:00:00.000Z");
  });

  it("rejects a caller without scheduling authority over the championship", async () => {
    mockHasCapability.mockResolvedValue(false);

    const result = await createRaceRound({
      leagueId: LEAGUE_ID,
      name: "Kari Motor Speedway",
      roundNumber: 1,
      raceDate: "2026-03-14",
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.raceRound.create).not.toHaveBeenCalled();
  });

  it("reports a duplicate round number as a readable error", async () => {
    mockPrisma.raceRound.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "7.0.0",
      })
    );

    const result = await createRaceRound({
      leagueId: LEAGUE_ID,
      name: "Chennai",
      roundNumber: 1,
      raceDate: "2026-04-11",
    });

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining("already used"),
    });
  });
});

describe("recordRaceResults", () => {
  beforeEach(() => {
    mockPrisma.raceRound.findUnique.mockResolvedValue({
      id: ROUND_ID,
      leagueId: LEAGUE_ID,
    });
    mockPrisma.team.count.mockResolvedValue(2);
  });

  it("replaces the whole grid so a correction leaves nothing stale", async () => {
    const result = await recordRaceResults({
      roundId: ROUND_ID,
      finalize: true,
      results: [
        { teamId: TEAM_A, position: 1, points: 25, status: "CLASSIFIED" },
        { teamId: TEAM_B, position: 2, points: 18, status: "CLASSIFIED" },
      ],
    });

    expect(result).toEqual({
      success: true,
      data: { roundId: ROUND_ID, resultCount: 2 },
    });
    expect(mockPrisma.raceResult.deleteMany).toHaveBeenCalledWith({
      where: { roundId: ROUND_ID },
    });
    expect(mockPrisma.raceResult.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(mockPrisma.raceRound.update.mock.calls[0][0].data.status).toBe("FINALIZED");
  });

  it("leaves the round open for corrections when finalize is false", async () => {
    mockPrisma.team.count.mockResolvedValue(1);

    await recordRaceResults({
      roundId: ROUND_ID,
      finalize: false,
      results: [{ teamId: TEAM_A, position: 1, points: 25, status: "CLASSIFIED" }],
    });

    expect(mockPrisma.raceRound.update.mock.calls[0][0].data.status).toBe(
      "RESULTS_PENDING"
    );
  });

  it("rejects the same entrant appearing twice", async () => {
    const result = await recordRaceResults({
      roundId: ROUND_ID,
      finalize: true,
      results: [
        { teamId: TEAM_A, playerId: DRIVER_A, position: 1, points: 25, status: "CLASSIFIED" },
        { teamId: TEAM_A, playerId: DRIVER_A, position: 2, points: 18, status: "CLASSIFIED" },
      ],
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.raceResult.createMany).not.toHaveBeenCalled();
  });

  it("rejects a team from outside the championship", async () => {
    mockPrisma.team.count.mockResolvedValue(1);

    const result = await recordRaceResults({
      roundId: ROUND_ID,
      finalize: true,
      results: [
        { teamId: TEAM_A, position: 1, points: 25, status: "CLASSIFIED" },
        { teamId: TEAM_B, position: 2, points: 18, status: "CLASSIFIED" },
      ],
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.raceResult.createMany).not.toHaveBeenCalled();
  });

  it("rejects a classified finish with no position", async () => {
    const result = await recordRaceResults({
      roundId: ROUND_ID,
      finalize: true,
      results: [{ teamId: TEAM_A, points: 25, status: "CLASSIFIED" }],
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.raceResult.createMany).not.toHaveBeenCalled();
  });

  it("rejects a DNF that still carries a position", async () => {
    const result = await recordRaceResults({
      roundId: ROUND_ID,
      finalize: true,
      results: [{ teamId: TEAM_A, position: 4, points: 0, status: "DNF" }],
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.raceResult.createMany).not.toHaveBeenCalled();
  });

  it("rejects a caller without scheduling authority over the championship", async () => {
    mockHasCapability.mockResolvedValue(false);

    const result = await recordRaceResults({
      roundId: ROUND_ID,
      finalize: true,
      results: [{ teamId: TEAM_A, position: 1, points: 25, status: "CLASSIFIED" }],
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.raceResult.deleteMany).not.toHaveBeenCalled();
  });
});

describe("getChampionshipStandings", () => {
  it("sums points per team across rounds", async () => {
    mockPrisma.raceResult.findMany.mockResolvedValue([
      { points: dec(25), position: 1, team: { id: TEAM_A, name: "Turbo" }, player: null },
      { points: dec(18), position: 2, team: { id: TEAM_B, name: "Blitz" }, player: null },
      { points: dec(15), position: 3, team: { id: TEAM_A, name: "Turbo" }, player: null },
    ]);

    const result = await getChampionshipStandings({
      leagueId: LEAGUE_ID,
      groupBy: "TEAM",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.rows).toHaveLength(2);
    expect(result.data.rows[0]).toMatchObject({
      name: "Turbo",
      points: 40,
      rounds: 2,
      wins: 1,
      podiums: 2,
    });
    expect(result.data.rows[1]).toMatchObject({ name: "Blitz", points: 18 });
  });

  it("breaks a points tie on wins, then podiums", async () => {
    mockPrisma.raceResult.findMany.mockResolvedValue([
      // Both teams finish on 25, but only Blitz has a win.
      { points: dec(25), position: 2, team: { id: TEAM_A, name: "Turbo" }, player: null },
      { points: dec(25), position: 1, team: { id: TEAM_B, name: "Blitz" }, player: null },
    ]);

    const result = await getChampionshipStandings({
      leagueId: LEAGUE_ID,
      groupBy: "TEAM",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.rows.map((row) => row.name)).toEqual(["Blitz", "Turbo"]);
  });

  it("omits team-level entries from driver standings", async () => {
    mockPrisma.raceResult.findMany.mockResolvedValue([
      {
        points: dec(25),
        position: 1,
        team: { id: TEAM_A, name: "Turbo" },
        player: { id: DRIVER_A, name: "A. Kumar" },
      },
      // No driver attributed — must not appear in the driver table.
      { points: dec(18), position: 2, team: { id: TEAM_B, name: "Blitz" }, player: null },
    ]);

    const result = await getChampionshipStandings({
      leagueId: LEAGUE_ID,
      groupBy: "DRIVER",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.rows).toHaveLength(1);
    expect(result.data.rows[0]).toMatchObject({
      name: "A. Kumar",
      teamName: "Turbo",
      points: 25,
    });
  });

  it("rejects a caller outside the association", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await getChampionshipStandings({
      leagueId: LEAGUE_ID,
      groupBy: "TEAM",
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.raceResult.findMany).not.toHaveBeenCalled();
  });
});
