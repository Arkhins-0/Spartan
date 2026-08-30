import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockNeed,
  mockAssignment,
  mockUser,
  mockLeagueUser,
  mockCredential,
  mockWaiver,
  mockWaiverAcceptance,
  mockTransaction,
  mockRequireUserId,
  mockHasCapability,
  mockLoadActiveGrants,
  mockScopeBelongsToLeague,
} = vi.hoisted(() => ({
  mockNeed: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  mockAssignment: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
  mockUser: { findUnique: vi.fn() },
  mockLeagueUser: { count: vi.fn() },
  mockCredential: { count: vi.fn() },
  mockWaiver: { findUnique: vi.fn() },
  mockWaiverAcceptance: { count: vi.fn() },
  mockTransaction: vi.fn(),
  mockRequireUserId: vi.fn(),
  mockHasCapability: vi.fn(),
  mockLoadActiveGrants: vi.fn(),
  mockScopeBelongsToLeague: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    leagueUser: mockLeagueUser,
    volunteerCredential: mockCredential,
    roundWaiver: mockWaiver,
    roundWaiverAcceptance: mockWaiverAcceptance,
    volunteerNeed: mockNeed,
    volunteerAssignment: mockAssignment,
    user: mockUser,
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/auth/session", () => ({ requireUserId: mockRequireUserId }));

vi.mock("@/lib/auth/capabilities", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/capabilities")>();
  return {
    ...actual,
    hasCapability: mockHasCapability,
    loadActiveGrants: mockLoadActiveGrants,
  };
});

// Tenancy validation shares the grant path's checker; here it is a seam so
// these tests assert the action's decisions rather than re-testing lookups.
vi.mock("@/lib/services/association-roles", () => ({
  scopeBelongsToLeague: mockScopeBelongsToLeague,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  assignVolunteer,
  checkInVolunteer,
  claimVolunteerShift,
  releaseVolunteerShift,
  cancelVolunteerNeed,
  completeVolunteerAssignment,
  createVolunteerNeed,
  getVolunteerBoard,
  respondToVolunteerAssignment,
  updateVolunteerNeed,
} from "@/lib/actions/volunteers";

const LEAGUE = "clfleague0000000000000001";
const NEED = "clfneed00000000000000001";
const ASSIGNMENT = "clfassign000000000000001";
const TEAM = "clfteam00000000000000001";
const VOLUNTEER = "clfuser00000000000000001";

const futureStart = new Date("2027-01-01T18:00:00Z");
const futureEnd = new Date("2027-01-01T20:00:00Z");

describe("volunteer needs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue("organizer-1");
    mockHasCapability.mockResolvedValue(true);
    mockLoadActiveGrants.mockResolvedValue([]);
    mockScopeBelongsToLeague.mockResolvedValue(true);
    mockNeed.create.mockResolvedValue({ id: NEED });
    mockTransaction.mockResolvedValue([]);
  });

  it("creates a need scoped to a team", async () => {
    const result = await createVolunteerNeed({
      leagueId: LEAGUE,
      roleLabel: "Scorekeeper",
      capacity: 2,
      startAt: futureStart,
      endAt: futureEnd,
      timezone: "America/Chicago",
      teamId: TEAM,
    });

    expect(result.success).toBe(true);
    expect(mockNeed.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roleLabel: "Scorekeeper", capacity: 2, teamId: TEAM }),
      }),
    );
  });

  it("checks the capability at the need's own scope, not the association", async () => {
    await createVolunteerNeed({
      leagueId: LEAGUE,
      roleLabel: "Scorekeeper",
      capacity: 1,
      startAt: futureStart,
      endAt: futureEnd,
      timezone: "America/Chicago",
      teamId: TEAM,
    });

    expect(mockHasCapability).toHaveBeenCalledWith(
      expect.objectContaining({ capability: "manage_volunteers", teamId: TEAM }),
    );
  });

  it("refuses a caller without the volunteer capability", async () => {
    mockHasCapability.mockResolvedValue(false);

    const result = await createVolunteerNeed({
      leagueId: LEAGUE,
      roleLabel: "Scorekeeper",
      capacity: 1,
      startAt: futureStart,
      endAt: futureEnd,
      timezone: "America/Chicago",
    });

    expect(result.success).toBe(false);
    expect(mockNeed.create).not.toHaveBeenCalled();
  });

  it("rejects an interval that ends before it starts", async () => {
    const result = await createVolunteerNeed({
      leagueId: LEAGUE,
      roleLabel: "Scorekeeper",
      capacity: 1,
      startAt: futureEnd,
      endAt: futureStart,
      timezone: "America/Chicago",
    });

    expect(result.success).toBe(false);
    expect(mockNeed.create).not.toHaveBeenCalled();
  });

  it("rejects a capacity below one", async () => {
    const result = await createVolunteerNeed({
      leagueId: LEAGUE,
      roleLabel: "Scorekeeper",
      capacity: 0,
      startAt: futureStart,
      endAt: futureEnd,
      timezone: "America/Chicago",
    });

    expect(result.success).toBe(false);
  });

  it("refuses to cut capacity below the accepted count", async () => {
    mockNeed.findUnique.mockResolvedValue({
      id: NEED,
      leagueId: LEAGUE,
      teamId: null,
      divisionId: null,
      eventId: null,
      signupEventId: null,
      acceptedCount: 3,
      status: "OPEN",
    });

    const result = await updateVolunteerNeed({ needId: NEED, capacity: 2 });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/3 volunteer/);
    expect(mockNeed.update).not.toHaveBeenCalled();
  });

  it("cancels live assignments alongside the need", async () => {
    mockNeed.findUnique.mockResolvedValue({
      id: NEED,
      leagueId: LEAGUE,
      teamId: null,
      divisionId: null,
      eventId: null,
      signupEventId: null,
    });

    const result = await cancelVolunteerNeed(NEED);

    expect(result.success).toBe(true);
    // Both writes go in one transaction so a cancelled need never keeps
    // assignments that still read as live.
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockAssignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { in: ["INVITED", "ACCEPTED", "WAITLISTED"] } }),
      }),
    );
  });
});

describe("volunteer assignment and capacity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue(VOLUNTEER);
    mockHasCapability.mockResolvedValue(true);
    mockLoadActiveGrants.mockResolvedValue([]);
    mockScopeBelongsToLeague.mockResolvedValue(true);
    mockAssignment.create.mockResolvedValue({ id: ASSIGNMENT });
    mockAssignment.update.mockResolvedValue({ id: ASSIGNMENT });
  });

  it("refuses to assign onto a closed need", async () => {
    mockNeed.findUnique.mockResolvedValue({
      id: NEED,
      leagueId: LEAGUE,
      teamId: null,
      divisionId: null,
      eventId: null,
      signupEventId: null,
      status: "CLOSED",
    });

    const result = await assignVolunteer({ needId: NEED, userId: VOLUNTEER });

    expect(result.success).toBe(false);
    expect(mockAssignment.create).not.toHaveBeenCalled();
  });

  it("requires exactly one of user or email", async () => {
    const both = await assignVolunteer({
      needId: NEED,
      userId: VOLUNTEER,
      invitedEmail: "v@example.com",
    });
    expect(both.success).toBe(false);

    const neither = await assignVolunteer({ needId: NEED });
    expect(neither.success).toBe(false);
  });

  describe("responding", () => {
    const acceptedNeed = {
      id: NEED,
      leagueId: LEAGUE,
      capacity: 2,
      status: "OPEN",
    };

    beforeEach(() => {
      mockAssignment.findUnique.mockResolvedValue({
        id: ASSIGNMENT,
        userId: VOLUNTEER,
        status: "INVITED",
        need: acceptedNeed,
      });
      mockAssignment.updateMany.mockResolvedValue({ count: 1 });
      mockNeed.updateMany.mockResolvedValue({ count: 1 });
      // Interactive transaction: run the callback against the same mocks so
      // the two conditional writes are observable.
      mockTransaction.mockImplementation(async (fn: unknown) =>
        typeof fn === "function"
          ? (fn as (client: unknown) => unknown)({
              volunteerAssignment: mockAssignment,
              volunteerNeed: mockNeed,
            })
          : undefined,
      );
    });

    it("claims the assignment and a slot inside one transaction", async () => {
      const result = await respondToVolunteerAssignment({
        assignmentId: ASSIGNMENT,
        response: "ACCEPTED",
      });

      expect(result).toEqual({ success: true, data: { status: "ACCEPTED" } });
      // Conditional on still being INVITED: this is what stops two requests
      // for the SAME assignment from each taking a slot on a multi-slot need.
      expect(mockAssignment.updateMany).toHaveBeenCalledWith({
        where: { id: ASSIGNMENT, status: "INVITED" },
        data: expect.objectContaining({ status: "ACCEPTED" }),
      });
      // Guarded on capacity: this is what stops two different volunteers from
      // taking the same last slot. Postgres evaluates it at write time.
      expect(mockNeed.updateMany).toHaveBeenCalledWith({
        where: { id: NEED, status: "OPEN", acceptedCount: { lt: 2 } },
        data: { acceptedCount: { increment: 1 } },
      });
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it("reports the need full when the capacity guard matches nothing", async () => {
      mockNeed.updateMany.mockResolvedValue({ count: 0 });

      const result = await respondToVolunteerAssignment({
        assignmentId: ASSIGNMENT,
        response: "ACCEPTED",
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/already full/);
    });

    it("reports an already-answered assignment when the claim matches nothing", async () => {
      // The row moved out of INVITED between the read and the write.
      mockAssignment.updateMany.mockResolvedValue({ count: 0 });

      const result = await respondToVolunteerAssignment({
        assignmentId: ASSIGNMENT,
        response: "ACCEPTED",
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/already been answered/);
      // The slot is never claimed when the assignment claim fails.
      expect(mockNeed.updateMany).not.toHaveBeenCalled();
    });

    it("does not touch capacity when declining", async () => {
      const result = await respondToVolunteerAssignment({
        assignmentId: ASSIGNMENT,
        response: "DECLINED",
      });

      expect(result).toEqual({ success: true, data: { status: "DECLINED" } });
      expect(mockNeed.updateMany).not.toHaveBeenCalled();
    });

    it("refuses to answer somebody else's assignment", async () => {
      mockAssignment.findUnique.mockResolvedValue({
        id: ASSIGNMENT,
        userId: "someone-else",
        status: "INVITED",
        need: acceptedNeed,
      });

      const result = await respondToVolunteerAssignment({
        assignmentId: ASSIGNMENT,
        response: "ACCEPTED",
      });

      expect(result.success).toBe(false);
      expect(mockNeed.updateMany).not.toHaveBeenCalled();
    });

    it("refuses to answer twice", async () => {
      mockAssignment.findUnique.mockResolvedValue({
        id: ASSIGNMENT,
        userId: VOLUNTEER,
        status: "ACCEPTED",
        need: acceptedNeed,
      });

      const result = await respondToVolunteerAssignment({
        assignmentId: ASSIGNMENT,
        response: "ACCEPTED",
      });

      expect(result.success).toBe(false);
      expect(mockNeed.updateMany).not.toHaveBeenCalled();
    });
  });

  it("only closes out an accepted assignment", async () => {
    mockAssignment.findUnique.mockResolvedValue({
      id: ASSIGNMENT,
      status: "INVITED",
      need: {
        leagueId: LEAGUE,
        teamId: null,
        divisionId: null,
        eventId: null,
        signupEventId: null,
      },
    });

    const result = await completeVolunteerAssignment(ASSIGNMENT);

    expect(result.success).toBe(false);
    expect(mockAssignment.update).not.toHaveBeenCalled();
  });
});

describe("volunteer board visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue(VOLUNTEER);
    mockLoadActiveGrants.mockResolvedValue([]);
    mockNeed.findMany.mockResolvedValue([]);
  });

  it("shows organizers every need with all assignments", async () => {
    mockHasCapability.mockResolvedValue(true);

    await getVolunteerBoard(LEAGUE);

    const args = mockNeed.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ leagueId: LEAGUE });
    expect(args.select.assignments.where).toEqual({});
  });

  it("treats a team-scoped coordinator as an organizer for their own team's needs", async () => {
    // The bug this covers: asking hasCapability with an empty target classified
    // every narrow coordinator as a non-organizer, so the people authorized to
    // run those shifts saw only their own rows.
    mockHasCapability.mockResolvedValue(false);
    mockLoadActiveGrants.mockResolvedValue([
      {
        role: "VOLUNTEER_COORDINATOR",
        scopeType: "TEAM",
        divisionId: null,
        teamId: TEAM,
        seasonId: null,
        eventId: null,
        signupEventId: null,
      },
    ]);
    mockNeed.findMany.mockResolvedValue([
      {
        id: "need-mine", roleLabel: "Scorekeeper", description: null, capacity: 2,
        acceptedCount: 0, status: "OPEN", startAt: new Date(), endAt: new Date(),
        timezone: "America/Chicago", teamId: TEAM, divisionId: null, eventId: null,
        signupEventId: null, team: { name: "Metro Blades", divisionId: null },
        assignments: [{ id: "a1", status: "ACCEPTED", invitedEmail: null, user: { name: "Sam", email: "s@e.com" } }],
      },
      {
        id: "need-other", roleLabel: "Timekeeper", description: null, capacity: 2,
        acceptedCount: 0, status: "OPEN", startAt: new Date(), endAt: new Date(),
        timezone: "America/Chicago", teamId: "other-team", divisionId: null, eventId: null,
        signupEventId: null, team: { name: "Harbor Hawks", divisionId: null },
        assignments: [],
      },
    ]);

    const result = await getVolunteerBoard(LEAGUE);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.isOrganizer).toBe(true);
    // Their own team's need is visible with fulfillment; the other team's is not.
    expect(result.data.needs.map((n) => n.id)).toEqual(["need-mine"]);
    expect(result.data.needs[0].assignments).toHaveLength(1);
  });

  it("shows a volunteer their own shifts plus anything open for signup", async () => {
    mockHasCapability.mockResolvedValue(false);
    mockLoadActiveGrants.mockResolvedValue([]);

    await getVolunteerBoard(LEAGUE);

    const args = mockNeed.findMany.mock.calls[0][0];
    // A published open-signup shift has to be visible or nobody can claim it.
    // Whose names are visible is a separate question, settled by the assignment
    // filter: a volunteer still never reads who else was rostered.
    expect(args.where).toEqual({
      leagueId: LEAGUE,
      OR: [
        { assignments: { some: { userId: VOLUNTEER } } },
        { signupMode: "OPEN_SIGNUP", status: "OPEN" },
      ],
    });
    expect(args.select.assignments.where).toEqual({ userId: VOLUNTEER });
  });
});

describe("open signup", () => {
  const openNeed = {
    id: NEED,
    leagueId: LEAGUE,
    capacity: 1,
    status: "OPEN",
    signupMode: "OPEN_SIGNUP",
    waitlistEnabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue(VOLUNTEER);
    mockLeagueUser.count.mockResolvedValue(1);
    mockNeed.findUnique.mockResolvedValue(openNeed);
    mockAssignment.count.mockResolvedValue(0);
    mockNeed.updateMany.mockResolvedValue({ count: 1 });
    mockAssignment.create.mockResolvedValue({ id: ASSIGNMENT });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        volunteerNeed: mockNeed,
        volunteerAssignment: mockAssignment,
      }),
    );
  });

  it("takes a slot without needing any capability", async () => {
    const result = await claimVolunteerShift(NEED);

    expect(result).toEqual({ success: true, data: { status: "ACCEPTED" } });
    // Membership is the gate, not MANAGE_VOLUNTEERS: the post is published to
    // the association and organizing it is a different job from working it.
    expect(mockHasCapability).not.toHaveBeenCalled();
    expect(mockAssignment.create.mock.calls[0][0].data.source).toBe("SELF_CLAIMED");
  });

  it("refuses somebody outside the association", async () => {
    mockLeagueUser.count.mockResolvedValue(0);

    const result = await claimVolunteerShift(NEED);

    expect(result).toMatchObject({ success: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("refuses to self-claim an invite-only shift", async () => {
    mockNeed.findUnique.mockResolvedValue({ ...openNeed, signupMode: "INVITE_ONLY" });

    const result = await claimVolunteerShift(NEED);

    expect(result).toMatchObject({ success: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("waitlists rather than oversubscribing when the guard matches no rows", async () => {
    // The conditional updateMany matching zero rows IS the full signal.
    mockNeed.updateMany.mockResolvedValue({ count: 0 });

    const result = await claimVolunteerShift(NEED);

    expect(result).toEqual({ success: true, data: { status: "WAITLISTED" } });
    expect(mockAssignment.create.mock.calls[0][0].data.status).toBe("WAITLISTED");
  });

  it("turns away a full shift that is not taking a waiting list", async () => {
    mockNeed.findUnique.mockResolvedValue({ ...openNeed, waitlistEnabled: false });
    mockNeed.updateMany.mockResolvedValue({ count: 0 });

    const result = await claimVolunteerShift(NEED);

    expect(result).toMatchObject({ success: false });
    expect(mockAssignment.create).not.toHaveBeenCalled();
  });

  it("refuses a second claim from somebody already holding a place", async () => {
    mockAssignment.count.mockResolvedValue(1);

    const result = await claimVolunteerShift(NEED);

    expect(result).toMatchObject({ success: false });
    expect(mockAssignment.create).not.toHaveBeenCalled();
  });
});

describe("releasing a shift", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue(VOLUNTEER);
    mockAssignment.updateMany.mockResolvedValue({ count: 1 });
    mockAssignment.findFirst.mockResolvedValue(null);
    mockNeed.updateMany.mockResolvedValue({ count: 1 });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        volunteerNeed: mockNeed,
        volunteerAssignment: mockAssignment,
      }),
    );
  });

  it("is not somebody else's to release", async () => {
    mockAssignment.findUnique.mockResolvedValue({
      id: ASSIGNMENT,
      userId: "somebody-else",
      status: "ACCEPTED",
      need: { id: NEED, leagueId: LEAGUE, status: "OPEN" },
    });

    const result = await releaseVolunteerShift(ASSIGNMENT);

    expect(result).toMatchObject({ success: false });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("hands the slot to the longest-waiting volunteer instead of returning it", async () => {
    mockAssignment.findUnique.mockResolvedValue({
      id: ASSIGNMENT,
      userId: VOLUNTEER,
      status: "ACCEPTED",
      need: { id: NEED, leagueId: LEAGUE, status: "OPEN" },
    });
    mockAssignment.findFirst.mockResolvedValue({
      id: "next-assignment",
      userId: "waiting-user",
    });

    const result = await releaseVolunteerShift(ASSIGNMENT);

    expect(result).toMatchObject({
      success: true,
      data: { promotedUserId: "waiting-user" },
    });
    // Arrival order, not a stored position that could drift.
    expect(mockAssignment.findFirst.mock.calls[0][0].orderBy).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ]);
    // The slot moved; the counter must not also be decremented.
    expect(mockNeed.updateMany).not.toHaveBeenCalled();
  });

  it("returns the capacity when nobody is waiting", async () => {
    mockAssignment.findUnique.mockResolvedValue({
      id: ASSIGNMENT,
      userId: VOLUNTEER,
      status: "ACCEPTED",
      need: { id: NEED, leagueId: LEAGUE, status: "OPEN" },
    });

    const result = await releaseVolunteerShift(ASSIGNMENT);

    expect(result).toMatchObject({ success: true, data: { promotedUserId: null } });
    expect(mockNeed.updateMany.mock.calls[0][0].data).toEqual({
      acceptedCount: { decrement: 1 },
    });
  });

  it("leaves the waiting list alone when standing down from it", async () => {
    mockAssignment.findUnique.mockResolvedValue({
      id: ASSIGNMENT,
      userId: VOLUNTEER,
      status: "WAITLISTED",
      need: { id: NEED, leagueId: LEAGUE, status: "OPEN" },
    });

    const result = await releaseVolunteerShift(ASSIGNMENT);

    expect(result.success).toBe(true);
    // No slot was held, so none is freed and nobody is promoted.
    expect(mockNeed.updateMany).not.toHaveBeenCalled();
    expect(mockAssignment.findFirst).not.toHaveBeenCalled();
  });
});

describe("check-in", () => {
  const accepted = {
    id: ASSIGNMENT,
    status: "ACCEPTED",
    checkedInAt: null,
    need: {
      leagueId: LEAGUE,
      teamId: null,
      divisionId: null,
      eventId: null,
      signupEventId: null,
      roundId: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue("organizer-1");
    mockHasCapability.mockResolvedValue(true);
    mockAssignment.findUnique.mockResolvedValue(accepted);
    mockAssignment.update.mockResolvedValue({ id: ASSIGNMENT });
  });

  it("signs on somebody holding the shift", async () => {
    const result = await checkInVolunteer(ASSIGNMENT);

    expect(result.success).toBe(true);
    expect(mockAssignment.update).toHaveBeenCalled();
  });

  it("is idempotent, so a second tap at the gate does not move the time", async () => {
    const checkedInAt = new Date("2027-01-01T17:45:00Z");
    mockAssignment.findUnique.mockResolvedValue({ ...accepted, checkedInAt });

    const result = await checkInVolunteer(ASSIGNMENT);

    expect(result).toEqual({ success: true, data: { checkedInAt } });
    expect(mockAssignment.update).not.toHaveBeenCalled();
  });

  it("refuses a shift nobody holds", async () => {
    mockAssignment.findUnique.mockResolvedValue({ ...accepted, status: "WAITLISTED" });

    const result = await checkInVolunteer(ASSIGNMENT);

    expect(result).toMatchObject({ success: false });
    expect(mockAssignment.update).not.toHaveBeenCalled();
  });

  it("refuses an organizer without authority over that need", async () => {
    mockHasCapability.mockResolvedValue(false);

    const result = await checkInVolunteer(ASSIGNMENT);

    expect(result).toMatchObject({ success: false });
    expect(mockAssignment.update).not.toHaveBeenCalled();
  });
});

describe("credential and waiver gates", () => {
  const gatedNeed = {
    id: NEED,
    leagueId: LEAGUE,
    capacity: 1,
    status: "OPEN",
    signupMode: "OPEN_SIGNUP",
    waitlistEnabled: true,
    roundId: "clround00000000000000001",
    requiredCredentialKind: "MARSHAL_GRADE",
    requiredCredentialLabel: "Post Chief",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue(VOLUNTEER);
    mockLeagueUser.count.mockResolvedValue(1);
    mockNeed.findUnique.mockResolvedValue(gatedNeed);
    mockCredential.count.mockResolvedValue(1);
    mockWaiver.findUnique.mockResolvedValue(null);
    mockWaiverAcceptance.count.mockResolvedValue(0);
    mockAssignment.count.mockResolvedValue(0);
    mockNeed.updateMany.mockResolvedValue({ count: 1 });
    mockAssignment.create.mockResolvedValue({ id: ASSIGNMENT });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        volunteerNeed: mockNeed,
        volunteerAssignment: mockAssignment,
      }),
    );
  });

  it("turns away somebody without the qualification, and says what is missing", async () => {
    mockCredential.count.mockResolvedValue(0);

    const result = await claimVolunteerShift(NEED);

    expect(result).toMatchObject({ success: false });
    if (result.success) return;
    expect(result.error).toContain("Post Chief");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("treats a lapsed credential as no credential", async () => {
    await claimVolunteerShift(NEED);

    const where = mockCredential.count.mock.calls[0][0].where;
    // A credential with no expiry never lapses; one with a past expiry does.
    expect(where.OR).toEqual([{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }]);
    expect(where.kind).toBe("MARSHAL_GRADE");
    expect(where.label).toEqual({ equals: "Post Chief", mode: "insensitive" });
  });

  it("blocks a claim until the published waiver is accepted", async () => {
    mockWaiver.findUnique.mockResolvedValue({
      id: "waiver-1",
      version: 2,
      publishedAt: new Date("2026-02-01T00:00:00Z"),
    });

    const result = await claimVolunteerShift(NEED);

    expect(result).toMatchObject({ success: false });
    if (result.success) return;
    expect(result.error).toMatch(/waiver/i);
    // The gate runs before the credential check, so a volunteer is told about
    // the paperwork they can actually do something about first.
    expect(mockCredential.count).not.toHaveBeenCalled();
  });

  it("checks acceptance against the current version, not any version", async () => {
    mockWaiver.findUnique.mockResolvedValue({
      id: "waiver-1",
      version: 3,
      publishedAt: new Date("2026-02-01T00:00:00Z"),
    });
    mockWaiverAcceptance.count.mockResolvedValue(1);

    await claimVolunteerShift(NEED);

    // Republished wording bumps the version; consent to the old text is not
    // consent to the new.
    expect(mockWaiverAcceptance.count.mock.calls[0][0].where.waiverVersion).toBe(3);
  });

  it("lets an unpublished draft waiver gate nothing", async () => {
    mockWaiver.findUnique.mockResolvedValue({
      id: "waiver-1",
      version: 1,
      publishedAt: null,
    });

    const result = await claimVolunteerShift(NEED);

    expect(result).toEqual({ success: true, data: { status: "ACCEPTED" } });
  });
});

describe("assigning past a credential gate", () => {
  const gatedNeed = {
    id: NEED,
    leagueId: LEAGUE,
    teamId: null,
    divisionId: null,
    eventId: null,
    signupEventId: null,
    roundId: null,
    status: "OPEN",
    requiredCredentialKind: "MARSHAL_GRADE",
    requiredCredentialLabel: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUserId.mockResolvedValue("organizer-1");
    mockHasCapability.mockResolvedValue(true);
    mockNeed.findUnique.mockResolvedValue(gatedNeed);
    mockUser.findUnique.mockResolvedValue({ id: VOLUNTEER });
    mockAssignment.create.mockResolvedValue({ id: ASSIGNMENT });
  });

  it("records the override when the assignee does not hold the credential", async () => {
    mockCredential.count.mockResolvedValue(0);

    const result = await assignVolunteer({
      needId: NEED,
      invitedEmail: "trainee@example.com",
    });

    expect(result.success).toBe(true);
    const data = mockAssignment.create.mock.calls[0][0].data;
    // Pairing a trainee with an experienced marshal is normal practice, so the
    // assignment goes through — but it says who allowed it.
    expect(data.credentialWaivedById).toBe("organizer-1");
    expect(data.credentialWaivedAt).toBeInstanceOf(Date);
  });

  it("records no override when the assignee is qualified", async () => {
    mockCredential.count.mockResolvedValue(1);

    await assignVolunteer({ needId: NEED, invitedEmail: "marshal@example.com" });

    const data = mockAssignment.create.mock.calls[0][0].data;
    expect(data.credentialWaivedById).toBeUndefined();
  });
});
