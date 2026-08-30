import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireUserId, mockIsTeamAdmin, mockPrisma, mockSendNotifications } =
  vi.hoisted(() => {
    const mockPrisma = {
      leagueUser: { count: vi.fn(), findMany: vi.fn() },
      team: { findMany: vi.fn(), findFirst: vi.fn() },
      teamMember: { findFirst: vi.fn() },
      leagueThread: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        updateMany: vi.fn(),
      },
      leagueThreadTeamStatus: {
        createMany: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
      },
      leagueThreadEntry: { create: vi.fn() },
      $transaction: vi.fn(),
    };
    return {
      mockRequireUserId: vi.fn(),
      mockIsTeamAdmin: vi.fn(),
      mockSendNotifications: vi.fn((_threadId: string, _change: string) =>
        Promise.resolve()
      ),
      mockPrisma,
    };
  });

vi.mock("@/lib/auth/session", () => ({
  requireUserId: (...args: unknown[]) => mockRequireUserId(...args),
  isTeamAdmin: (...args: unknown[]) => mockIsTeamAdmin(...args),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/email/templates", () => ({
  sendLeagueThreadNotifications: (threadId: string, change: string) =>
    mockSendNotifications(threadId, change),
}));
vi.mock("@/lib/utils/durable-rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true })),
  rateLimitMessage: vi.fn(() => "rate limited"),
  RATE_LIMITS: { MESSAGE_SEND_PER_USER: {} },
}));

import {
  createInstruction,
  createTeamRequest,
  postThreadEntry,
  resolveThread,
} from "@/lib/actions/league-threads";

const USER_ID = "cluser0000000000000001";
const LEAGUE_ID = "clleague0000000000000001";
const TEAM_A = "clteama00000000000000001";
const TEAM_B = "clteamb00000000000000001";
const THREAD_ID = "clthread00000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUserId.mockResolvedValue(USER_ID);
  // Default: the caller is a league admin.
  mockPrisma.leagueUser.count.mockResolvedValue(1);
  mockPrisma.$transaction.mockImplementation(
    async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma)
  );
});

describe("createInstruction", () => {
  it("fans out one status row per targeted team", async () => {
    mockPrisma.team.findMany.mockResolvedValue([{ id: TEAM_A }, { id: TEAM_B }]);
    mockPrisma.leagueThread.create.mockResolvedValue({ id: THREAD_ID });

    const result = await createInstruction({
      leagueId: LEAGUE_ID,
      subject: "Scrutineering at 08:00",
      body: "Bring logbooks and licences to bay 3.",
      priority: "HIGH",
      requiresResponse: true,
      targeting: { entireLeague: true },
    });

    expect(result).toEqual({
      success: true,
      data: { threadId: THREAD_ID, targetedTeamCount: 2 },
    });

    const createManyArg = mockPrisma.leagueThreadTeamStatus.createMany.mock.calls[0][0];
    expect(createManyArg.data).toHaveLength(2);
    expect(createManyArg.data.every((row: { status: string }) => row.status === "PENDING")).toBe(
      true
    );
  });

  it("marks targets acknowledged up front when no response is required", async () => {
    mockPrisma.team.findMany.mockResolvedValue([{ id: TEAM_A }]);
    mockPrisma.leagueThread.create.mockResolvedValue({ id: THREAD_ID });

    await createInstruction({
      leagueId: LEAGUE_ID,
      subject: "Paddock map",
      body: "Attached for reference.",
      priority: "LOW",
      requiresResponse: false,
      targeting: { entireLeague: true },
    });

    const createManyArg = mockPrisma.leagueThreadTeamStatus.createMany.mock.calls[0][0];
    expect(createManyArg.data[0].status).toBe("ACKNOWLEDGED");
  });

  it("rejects a caller who is not a league admin", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await createInstruction({
      leagueId: LEAGUE_ID,
      subject: "Scrutineering",
      body: "Bring logbooks.",
      priority: "NORMAL",
      requiresResponse: true,
      targeting: { entireLeague: true },
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.leagueThread.create).not.toHaveBeenCalled();
  });

  it("refuses to send when the targeting matches no teams", async () => {
    mockPrisma.team.findMany.mockResolvedValue([]);

    const result = await createInstruction({
      leagueId: LEAGUE_ID,
      subject: "Scrutineering",
      body: "Bring logbooks.",
      priority: "NORMAL",
      requiresResponse: true,
      targeting: { entireLeague: false, teamIds: [TEAM_A] },
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.leagueThread.create).not.toHaveBeenCalled();
  });
});

describe("createTeamRequest", () => {
  it("records the raising team and needs no per-team status rows", async () => {
    mockIsTeamAdmin.mockResolvedValue(true);
    mockPrisma.team.findFirst.mockResolvedValue({ id: TEAM_A });
    mockPrisma.leagueThread.create.mockResolvedValue({ id: THREAD_ID });

    const result = await createTeamRequest({
      leagueId: LEAGUE_ID,
      teamId: TEAM_A,
      subject: "Extra garage space",
      body: "We have a second entry for round 3.",
      priority: "NORMAL",
    });

    expect(result).toEqual({ success: true, data: { threadId: THREAD_ID } });
    expect(mockPrisma.leagueThread.create.mock.calls[0][0].data).toMatchObject({
      kind: "TEAM_REQUEST",
      originTeamId: TEAM_A,
    });
    expect(mockPrisma.leagueThreadTeamStatus.createMany).not.toHaveBeenCalled();
  });

  it("rejects a caller who does not administer the team", async () => {
    mockIsTeamAdmin.mockResolvedValue(false);

    const result = await createTeamRequest({
      leagueId: LEAGUE_ID,
      teamId: TEAM_A,
      subject: "Extra garage space",
      body: "We have a second entry.",
      priority: "NORMAL",
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.leagueThread.create).not.toHaveBeenCalled();
  });

  it("rejects a team that does not belong to the association", async () => {
    mockIsTeamAdmin.mockResolvedValue(true);
    mockPrisma.team.findFirst.mockResolvedValue(null);

    const result = await createTeamRequest({
      leagueId: LEAGUE_ID,
      teamId: TEAM_A,
      subject: "Extra garage space",
      body: "We have a second entry.",
      priority: "NORMAL",
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.leagueThread.create).not.toHaveBeenCalled();
  });
});

describe("postThreadEntry", () => {
  const openInstruction = {
    id: THREAD_ID,
    kind: "INSTRUCTION" as const,
    status: "OPEN" as const,
    leagueId: LEAGUE_ID,
    originTeamId: null,
    requiresResponse: true,
  };

  it("flips the replying team from PENDING to ACKNOWLEDGED", async () => {
    mockPrisma.leagueThread.findUnique.mockResolvedValue(openInstruction);
    mockIsTeamAdmin.mockResolvedValue(true);
    mockPrisma.leagueThreadTeamStatus.count.mockResolvedValue(1);
    mockPrisma.leagueThreadEntry.create.mockResolvedValue({ id: "clentry000000000000001" });
    mockPrisma.leagueThreadTeamStatus.updateMany.mockResolvedValue({ count: 1 });

    const result = await postThreadEntry({
      threadId: THREAD_ID,
      body: "Logbooks ready, we will be at bay 3 by 07:45.",
      actorTeamId: TEAM_A,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.leagueThreadTeamStatus.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { threadId: THREAD_ID, teamId: TEAM_A, status: "PENDING" },
      })
    );
  });

  it("still records a second concurrent reply when the status was already claimed", async () => {
    mockPrisma.leagueThread.findUnique.mockResolvedValue(openInstruction);
    mockIsTeamAdmin.mockResolvedValue(true);
    mockPrisma.leagueThreadTeamStatus.count.mockResolvedValue(1);
    mockPrisma.leagueThreadEntry.create.mockResolvedValue({ id: "clentry000000000000002" });
    // The guarded update matches nothing: another reply won the race.
    mockPrisma.leagueThreadTeamStatus.updateMany.mockResolvedValue({ count: 0 });

    const result = await postThreadEntry({
      threadId: THREAD_ID,
      body: "Adding: we also need a transponder.",
      actorTeamId: TEAM_A,
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.leagueThreadEntry.create).toHaveBeenCalled();
  });

  it("rejects a team that was never part of the thread", async () => {
    mockPrisma.leagueThread.findUnique.mockResolvedValue(openInstruction);
    mockIsTeamAdmin.mockResolvedValue(true);
    mockPrisma.leagueThreadTeamStatus.count.mockResolvedValue(0);

    const result = await postThreadEntry({
      threadId: THREAD_ID,
      body: "Can we join?",
      actorTeamId: TEAM_B,
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.leagueThreadEntry.create).not.toHaveBeenCalled();
  });

  it("refuses replies once the thread is no longer open", async () => {
    mockPrisma.leagueThread.findUnique.mockResolvedValue({
      ...openInstruction,
      status: "RESOLVED",
    });

    const result = await postThreadEntry({
      threadId: THREAD_ID,
      body: "One more thing.",
      actorTeamId: TEAM_A,
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.leagueThreadEntry.create).not.toHaveBeenCalled();
  });
});

describe("resolveThread", () => {
  it("resolves an open thread and appends a RESOLVE entry", async () => {
    mockPrisma.leagueThread.findUnique.mockResolvedValue({
      id: THREAD_ID,
      leagueId: LEAGUE_ID,
    });
    mockPrisma.leagueThread.updateMany.mockResolvedValue({ count: 1 });

    const result = await resolveThread({ threadId: THREAD_ID });

    expect(result.success).toBe(true);
    expect(mockPrisma.leagueThread.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: THREAD_ID, status: "OPEN" } })
    );
    expect(mockPrisma.leagueThreadEntry.create).toHaveBeenCalled();
  });

  it("does not append a second entry when another admin resolved it first", async () => {
    mockPrisma.leagueThread.findUnique.mockResolvedValue({
      id: THREAD_ID,
      leagueId: LEAGUE_ID,
    });
    // First-decision-wins: the guarded update matched nothing.
    mockPrisma.leagueThread.updateMany.mockResolvedValue({ count: 0 });

    const result = await resolveThread({ threadId: THREAD_ID });

    expect(result.success).toBe(false);
    expect(mockPrisma.leagueThreadEntry.create).not.toHaveBeenCalled();
  });

  it("rejects a caller who is not a league admin", async () => {
    mockPrisma.leagueThread.findUnique.mockResolvedValue({
      id: THREAD_ID,
      leagueId: LEAGUE_ID,
    });
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await resolveThread({ threadId: THREAD_ID });

    expect(result.success).toBe(false);
    expect(mockPrisma.leagueThread.updateMany).not.toHaveBeenCalled();
  });
});
