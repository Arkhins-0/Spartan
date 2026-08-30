import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireUserId, mockHasCapability, mockPrisma } = vi.hoisted(() => ({
  mockRequireUserId: vi.fn(),
  mockHasCapability: vi.fn(),
  mockPrisma: {
    leagueUser: { count: vi.fn() },
    volunteerCredential: {
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

import {
  listVolunteerCredentials,
  recordVolunteerCredential,
  verifyVolunteerCredential,
} from "@/lib/actions/volunteer-credentials";

const ORGANIZER = "clorg0000000000000000001";
const HOLDER = "clhold000000000000000001";
const LEAGUE = "clleague0000000000000001";
const CREDENTIAL = "clcred000000000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUserId.mockResolvedValue(ORGANIZER);
  mockHasCapability.mockResolvedValue(true);
  mockPrisma.leagueUser.count.mockResolvedValue(1);
  mockPrisma.volunteerCredential.upsert.mockResolvedValue({ id: CREDENTIAL });
  mockPrisma.volunteerCredential.findMany.mockResolvedValue([]);
});

describe("recordVolunteerCredential", () => {
  it("corrects the existing row rather than adding a second for the same grade", async () => {
    const result = await recordVolunteerCredential({
      leagueId: LEAGUE,
      userId: HOLDER,
      kind: "MARSHAL_GRADE",
      label: "Post Chief",
      reference: "MSA-1234",
    });

    expect(result.success).toBe(true);
    const call = mockPrisma.volunteerCredential.upsert.mock.calls[0][0];
    expect(call.where.leagueId_userId_kind_label).toEqual({
      leagueId: LEAGUE,
      userId: HOLDER,
      kind: "MARSHAL_GRADE",
      label: "Post Chief",
    });
  });

  it("clears a previous verification, because the new details were not sighted", async () => {
    await recordVolunteerCredential({
      leagueId: LEAGUE,
      userId: HOLDER,
      kind: "LICENCE",
      label: "National B",
    });

    const call = mockPrisma.volunteerCredential.upsert.mock.calls[0][0];
    expect(call.update.verifiedById).toBeNull();
    expect(call.update.verifiedAt).toBeNull();
  });

  it("rejects an expiry that precedes the issue date", async () => {
    const result = await recordVolunteerCredential({
      leagueId: LEAGUE,
      userId: HOLDER,
      kind: "FIRST_AID",
      label: "First Aid at Work",
      issuedAt: new Date("2026-06-01"),
      expiresAt: new Date("2026-01-01"),
    });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.volunteerCredential.upsert).not.toHaveBeenCalled();
  });

  it("refuses to record against somebody outside the association", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await recordVolunteerCredential({
      leagueId: LEAGUE,
      userId: HOLDER,
      kind: "MARSHAL_GRADE",
      label: "Trainee",
    });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.volunteerCredential.upsert).not.toHaveBeenCalled();
  });

  it("refuses a caller without volunteer authority", async () => {
    mockHasCapability.mockResolvedValue(false);

    const result = await recordVolunteerCredential({
      leagueId: LEAGUE,
      userId: HOLDER,
      kind: "MARSHAL_GRADE",
      label: "Trainee",
    });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.volunteerCredential.upsert).not.toHaveBeenCalled();
  });
});

describe("verifyVolunteerCredential", () => {
  it("names the officer who sighted the original", async () => {
    mockPrisma.volunteerCredential.findUnique.mockResolvedValue({
      id: CREDENTIAL,
      leagueId: LEAGUE,
    });
    mockPrisma.volunteerCredential.update.mockResolvedValue({ id: CREDENTIAL });

    await verifyVolunteerCredential(CREDENTIAL);

    const data = mockPrisma.volunteerCredential.update.mock.calls[0][0].data;
    expect(data.verifiedById).toBe(ORGANIZER);
    expect(data.verifiedAt).toBeInstanceOf(Date);
  });
});

describe("listVolunteerCredentials", () => {
  it("shows a volunteer only their own, because a licence number is personal", async () => {
    mockHasCapability.mockResolvedValue(false);
    mockRequireUserId.mockResolvedValue(HOLDER);

    await listVolunteerCredentials(LEAGUE);

    expect(mockPrisma.volunteerCredential.findMany.mock.calls[0][0].where).toEqual({
      leagueId: LEAGUE,
      userId: HOLDER,
    });
  });

  it("shows an organizer everyone's, which is what staffing a post needs", async () => {
    await listVolunteerCredentials(LEAGUE);

    expect(mockPrisma.volunteerCredential.findMany.mock.calls[0][0].where).toEqual({
      leagueId: LEAGUE,
    });
  });

  it("marks a lapsed credential without hiding it", async () => {
    mockPrisma.volunteerCredential.findMany.mockResolvedValue([
      {
        id: CREDENTIAL,
        kind: "LICENCE",
        label: "National B",
        reference: "MSA-1234",
        issuedAt: new Date("2020-01-01"),
        expiresAt: new Date("2021-01-01"),
        verifiedAt: null,
        userId: HOLDER,
        user: { name: "A. Kumar", email: "a@example.com" },
      },
    ]);

    const result = await listVolunteerCredentials(LEAGUE);

    expect(result.success).toBe(true);
    if (!result.success) return;
    // Expiry is advisory: it is shown, never used to delete the record.
    expect(result.data.credentials[0].expired).toBe(true);
    expect(result.data.credentials[0].verified).toBe(false);
  });

  it("refuses somebody outside the association", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await listVolunteerCredentials(LEAGUE);

    expect(result.success).toBe(false);
    expect(mockPrisma.volunteerCredential.findMany).not.toHaveBeenCalled();
  });
});
