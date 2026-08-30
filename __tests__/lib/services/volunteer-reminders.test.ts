import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    volunteerAssignment: { findMany: vi.fn() },
    volunteerNeed: { findMany: vi.fn() },
    notificationOutbox: { createMany: vi.fn() },
    leagueUser: { findMany: vi.fn() },
    associationRoleGrant: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import {
  SHORTAGE_LEAD_MS,
  queueVolunteerShiftReminders,
  queueVolunteerShortageNotices,
} from "@/lib/services/volunteer-reminders";

const NOW = new Date("2026-03-01T12:00:00.000Z");
const LEAGUE = "clleague0000000000000001";

function assignment(id: string, startAt: Date) {
  return {
    id,
    userId: "cluser0000000000000001",
    user: { email: "marshal@example.com" },
    need: {
      id: "clneed000000000000000001",
      leagueId: LEAGUE,
      roleLabel: "Post 4 — Turn 3",
      postLabel: "Post 4",
      startAt,
      timezone: "Asia/Kolkata",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.notificationOutbox.createMany.mockResolvedValue({ count: 1 });
  mockPrisma.volunteerAssignment.findMany.mockResolvedValue([]);
  mockPrisma.volunteerNeed.findMany.mockResolvedValue([]);
  mockPrisma.leagueUser.findMany.mockResolvedValue([
    { user: { id: "clorg0000000000000000001", email: "chief@example.com" } },
  ]);
  mockPrisma.associationRoleGrant.findMany.mockResolvedValue([]);
});

describe("queueVolunteerShiftReminders", () => {
  it("puts the window in the dedupe key so the same shift is reminded once per band", async () => {
    mockPrisma.volunteerAssignment.findMany
      .mockResolvedValueOnce([assignment("a1", new Date("2026-03-08T12:00:00.000Z"))])
      .mockResolvedValue([]);

    await queueVolunteerShiftReminders(NOW);

    const rows = mockPrisma.notificationOutbox.createMany.mock.calls[0][0];
    expect(rows.data[0].dedupeKey).toBe("volunteer.shift.reminder:a1:7d");
    // The unique index on (leagueId, dedupeKey) is what makes a repeat cron
    // tick a no-op rather than a second email.
    expect(rows.skipDuplicates).toBe(true);
  });

  it("reminds only people who actually hold the shift", async () => {
    await queueVolunteerShiftReminders(NOW);

    const where = mockPrisma.volunteerAssignment.findMany.mock.calls[0][0].where;
    expect(where.status).toBe("ACCEPTED");
    // A waitlisted volunteer is not expected to turn up, so must not be told to.
    expect(where.need.status).toBe("OPEN");
  });

  it("captures the address at queue time rather than at send time", async () => {
    mockPrisma.volunteerAssignment.findMany
      .mockResolvedValueOnce([assignment("a1", new Date("2026-03-08T12:00:00.000Z"))])
      .mockResolvedValue([]);

    await queueVolunteerShiftReminders(NOW);

    const row = mockPrisma.notificationOutbox.createMany.mock.calls[0][0].data[0];
    expect(row.recipientEmail).toBe("marshal@example.com");
    expect(row.recipientUserId).toBe("cluser0000000000000001");
  });

  it("stops at the budget rather than reading a whole season into memory", async () => {
    const page = Array.from({ length: 100 }, (_, index) =>
      assignment(`a${index}`, new Date("2026-03-08T12:00:00.000Z")),
    );
    mockPrisma.volunteerAssignment.findMany.mockResolvedValue(page);

    const result = await queueVolunteerShiftReminders(NOW);

    expect(result.truncated).toBe(true);
    expect(result.scanned).toBeLessThanOrEqual(500);
  });
});

describe("queueVolunteerShortageNotices", () => {
  const short = {
    id: "clneed000000000000000001",
    leagueId: LEAGUE,
    roleLabel: "Post 4 — Turn 3",
    postLabel: "Post 4",
    capacity: 4,
    acceptedCount: 2,
    startAt: new Date("2026-03-06T12:00:00.000Z"),
    timezone: "Asia/Kolkata",
  };

  it("chases a post while there is still time to fill it", async () => {
    mockPrisma.volunteerNeed.findMany.mockResolvedValueOnce([short]).mockResolvedValue([]);

    await queueVolunteerShortageNotices(NOW);

    const where = mockPrisma.volunteerNeed.findMany.mock.calls[0][0].where;
    // Ten days: the point at which clubs actually allocate posts. A shortage
    // notice on race morning is useless.
    expect(where.startAt.lte.getTime()).toBe(NOW.getTime() + SHORTAGE_LEAD_MS);
    expect(where.startAt.gt).toEqual(NOW);
  });

  it("says nothing about a post that is already full", async () => {
    mockPrisma.volunteerNeed.findMany
      .mockResolvedValueOnce([{ ...short, acceptedCount: 4 }])
      .mockResolvedValue([]);

    await queueVolunteerShortageNotices(NOW);

    expect(mockPrisma.notificationOutbox.createMany).not.toHaveBeenCalled();
  });

  it("dates the dedupe key so a standing shortage is chased once a day", async () => {
    mockPrisma.volunteerNeed.findMany.mockResolvedValueOnce([short]).mockResolvedValue([]);

    await queueVolunteerShortageNotices(NOW);

    const row = mockPrisma.notificationOutbox.createMany.mock.calls[0][0].data[0];
    expect(row.dedupeKey).toBe(
      "volunteer.need.shortage:clneed000000000000000001:2026-03-01:clorg0000000000000000001",
    );
    expect(row.payload.shortfall).toBe(2);
  });

  it("addresses the people who can fix it, deduped across grants and admins", async () => {
    mockPrisma.volunteerNeed.findMany.mockResolvedValueOnce([short]).mockResolvedValue([]);
    // The same person as both a legacy league admin and a coordinator.
    mockPrisma.associationRoleGrant.findMany.mockResolvedValue([
      { user: { id: "clorg0000000000000000001", email: "chief@example.com" } },
      { user: { id: "clorg0000000000000000002", email: "deputy@example.com" } },
    ]);

    await queueVolunteerShortageNotices(NOW);

    const rows = mockPrisma.notificationOutbox.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(2);
    expect(rows.map((row: { recipientEmail: string }) => row.recipientEmail).sort()).toEqual([
      "chief@example.com",
      "deputy@example.com",
    ]);
  });
});
