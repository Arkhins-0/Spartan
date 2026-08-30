import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireUserId, mockHasCapability, mockPrisma } = vi.hoisted(() => ({
  mockRequireUserId: vi.fn(),
  mockHasCapability: vi.fn(),
  mockPrisma: {
    leagueUser: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    raceRound: { findUnique: vi.fn() },
    roundWaiver: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    roundWaiverAcceptance: { upsert: vi.fn(), count: vi.fn() },
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
vi.mock("next/headers", () => ({
  headers: async () => new Map<string, string>() as unknown as Headers,
}));

import {
  acceptRoundWaiver,
  getRoundWaiver,
  upsertRoundWaiver,
} from "@/lib/actions/round-waivers";

const USER = "cluser0000000000000001";
const LEAGUE = "clleague0000000000000001";
const ROUND = "clround00000000000000001";
const WAIVER = "clwaiver0000000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUserId.mockResolvedValue(USER);
  mockHasCapability.mockResolvedValue(true);
  mockPrisma.leagueUser.count.mockResolvedValue(1);
  mockPrisma.user.findUnique.mockResolvedValue({ name: "A. Kumar", email: "a@example.com" });
  mockPrisma.raceRound.findUnique.mockResolvedValue({ id: ROUND, leagueId: LEAGUE });
  mockPrisma.roundWaiver.findUnique.mockResolvedValue(null);
  mockPrisma.roundWaiver.create.mockResolvedValue({ id: WAIVER, version: 1 });
  mockPrisma.roundWaiver.update.mockResolvedValue({ id: WAIVER, version: 2 });
  mockPrisma.roundWaiverAcceptance.upsert.mockResolvedValue({ id: "acc-1" });
  mockPrisma.roundWaiverAcceptance.count.mockResolvedValue(0);
});

describe("upsertRoundWaiver", () => {
  it("creates a draft that gates nothing until it is published", async () => {
    const result = await upsertRoundWaiver({
      roundId: ROUND,
      title: "Assumption of risk",
      body: "Motorsport is dangerous.",
    });

    expect(result.success).toBe(true);
    expect(mockPrisma.roundWaiver.create.mock.calls[0][0].data.publishedAt).toBeNull();
  });

  it("bumps the version when published wording changes", async () => {
    mockPrisma.roundWaiver.findUnique.mockResolvedValue({
      id: WAIVER,
      version: 1,
      title: "Assumption of risk",
      body: "Old wording.",
      publishedAt: new Date("2026-02-01T00:00:00Z"),
    });

    await upsertRoundWaiver({
      roundId: ROUND,
      title: "Assumption of risk",
      body: "New wording.",
    });

    // Consent to the old text is not consent to the new; the bump is what
    // makes everyone accept again.
    expect(mockPrisma.roundWaiver.update.mock.calls[0][0].data.version).toEqual({
      increment: 1,
    });
  });

  it("does not bump when editing a draft nobody has been shown", async () => {
    mockPrisma.roundWaiver.findUnique.mockResolvedValue({
      id: WAIVER,
      version: 1,
      title: "Assumption of risk",
      body: "Old wording.",
      publishedAt: null,
    });

    await upsertRoundWaiver({
      roundId: ROUND,
      title: "Assumption of risk",
      body: "New wording.",
    });

    expect(mockPrisma.roundWaiver.update.mock.calls[0][0].data.version).toBeUndefined();
  });

  it("does not bump when the wording is unchanged", async () => {
    mockPrisma.roundWaiver.findUnique.mockResolvedValue({
      id: WAIVER,
      version: 4,
      title: "Assumption of risk",
      body: "Same wording.",
      publishedAt: new Date("2026-02-01T00:00:00Z"),
    });

    await upsertRoundWaiver({
      roundId: ROUND,
      title: "Assumption of risk",
      body: "Same wording.",
    });

    expect(mockPrisma.roundWaiver.update.mock.calls[0][0].data.version).toBeUndefined();
  });

  it("refuses a caller without authority over the weekend", async () => {
    mockHasCapability.mockResolvedValue(false);

    const result = await upsertRoundWaiver({
      roundId: ROUND,
      title: "Assumption of risk",
      body: "Motorsport is dangerous.",
    });

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.roundWaiver.create).not.toHaveBeenCalled();
  });
});

describe("acceptRoundWaiver", () => {
  beforeEach(() => {
    mockPrisma.roundWaiver.findUnique.mockResolvedValue({
      id: WAIVER,
      version: 3,
      publishedAt: new Date("2026-02-01T00:00:00Z"),
      round: { id: ROUND, leagueId: LEAGUE },
    });
  });

  it("records the version agreed to, not merely that something was agreed", async () => {
    const result = await acceptRoundWaiver(ROUND);

    expect(result).toEqual({ success: true, data: { waiverVersion: 3 } });
    expect(mockPrisma.roundWaiverAcceptance.upsert.mock.calls[0][0].create.waiverVersion).toBe(3);
  });

  it("keeps the signer's identity on the record so it outlives the account", async () => {
    await acceptRoundWaiver(ROUND);

    const create = mockPrisma.roundWaiverAcceptance.upsert.mock.calls[0][0].create;
    expect(create.acceptedByName).toBe("A. Kumar");
    expect(create.acceptedByEmail).toBe("a@example.com");
  });

  it("keeps the first timestamp when somebody accepts twice", async () => {
    await acceptRoundWaiver(ROUND);

    // Accepting again is not a second agreement.
    expect(mockPrisma.roundWaiverAcceptance.upsert.mock.calls[0][0].update).toEqual({});
  });

  it("refuses when there is no published waiver", async () => {
    mockPrisma.roundWaiver.findUnique.mockResolvedValue({
      id: WAIVER,
      version: 1,
      publishedAt: null,
      round: { id: ROUND, leagueId: LEAGUE },
    });

    const result = await acceptRoundWaiver(ROUND);

    expect(result).toMatchObject({ success: false });
    expect(mockPrisma.roundWaiverAcceptance.upsert).not.toHaveBeenCalled();
  });
});

describe("getRoundWaiver", () => {
  it("hides the acceptance tally from anyone who does not run the weekend", async () => {
    mockHasCapability.mockResolvedValue(false);
    mockPrisma.roundWaiver.findUnique.mockResolvedValue({
      id: WAIVER,
      title: "Assumption of risk",
      body: "Motorsport is dangerous.",
      version: 1,
      publishedAt: new Date("2026-02-01T00:00:00Z"),
    });

    const result = await getRoundWaiver(ROUND);

    expect(result.success).toBe(true);
    if (!result.success || !result.data) return;
    expect(result.data.acceptanceCount).toBeNull();
  });

  it("returns nothing for a round with no waiver", async () => {
    mockPrisma.roundWaiver.findUnique.mockResolvedValue(null);

    const result = await getRoundWaiver(ROUND);

    expect(result).toEqual({ success: true, data: null });
  });
});
