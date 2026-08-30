import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeWithTestDatabase = TEST_DATABASE_URL ? describe : describe.skip;

/**
 * Open signup under contention.
 *
 * Same guarantee as volunteer-capacity-concurrency.test.ts, one step harder:
 * there, two people answered invitations that already existed. Here they arrive
 * at a published post at the same instant with no assignment rows at all, so
 * the claim both creates a row and takes a slot. Exactly one may end ACCEPTED;
 * the rest go on the waiting list in arrival order, and releasing the accepted
 * slot must promote exactly one of them.
 *
 * Mocked Prisma cannot prove any of this — the guard is a conditional
 * `updateMany` evaluated by Postgres at write time, backed by the
 * `acceptedCount <= capacity` CHECK and the one-live-assignment-per-person
 * partial unique index. Skipped unless TEST_DATABASE_URL is set.
 */
function createBarrier(parties: number) {
  let arrivals = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  return async () => {
    arrivals += 1;
    if (arrivals === parties) {
      release();
    }
    await gate;
  };
}

describeWithTestDatabase("volunteer open-signup concurrency", () => {
  let prisma: any;
  let appPrisma: { $disconnect: () => Promise<void> } | null = null;
  let claimVolunteerShift: any;
  let releaseVolunteerShift: any;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  /** Which user the action sees, consumed one per invocation. */
  const actingUsers: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    vi.resetModules();

    vi.doMock("@/lib/auth/session", () => ({
      requireUserId: vi.fn(async () => actingUsers.shift()),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));

    const [{ PrismaClient }, dbModule, actionModule] = await Promise.all([
      import("@prisma/client"),
      import("@/lib/db/prisma"),
      import("@/lib/actions/volunteers"),
    ]);

    const connectionString = TEST_DATABASE_URL!;
    if (/\.neon\.tech[/:]/.test(connectionString)) {
      const { PrismaNeon } = await import("@prisma/adapter-neon");
      prisma = new PrismaClient({
        adapter: new PrismaNeon({ connectionString }),
        log: ["error"],
      });
    } else {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
        log: ["error"],
      });
    }

    appPrisma = dbModule.prisma;
    claimVolunteerShift = actionModule.claimVolunteerShift;
    releaseVolunteerShift = actionModule.releaseVolunteerShift;
  });

  afterAll(async () => {
    await Promise.allSettled([
      prisma?.$disconnect?.() ?? Promise.resolve(),
      appPrisma?.$disconnect?.() ?? Promise.resolve(),
    ]);

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  async function createFixture(volunteers: number) {
    const suffix = randomUUID().replace(/-/g, "").slice(0, 12);

    const league = await prisma.league.create({
      data: {
        name: `Signup League ${suffix}`,
        sport: "HOCKEY",
        contactEmail: `league-${suffix}@example.com`,
      },
      select: { id: true },
    });

    const users = await Promise.all(
      Array.from({ length: volunteers }, (_, index) =>
        prisma.user.create({
          data: {
            email: `marshal-${index}-${suffix}@example.com`,
            passwordHash: "x",
            emailVerified: new Date(),
          },
          select: { id: true },
        }),
      ),
    );

    // Claiming requires association membership, not a capability.
    await prisma.leagueUser.createMany({
      data: users.map((user: { id: string }) => ({
        leagueId: league.id,
        userId: user.id,
        role: "MEMBER",
      })),
    });

    const need = await prisma.volunteerNeed.create({
      data: {
        leagueId: league.id,
        roleLabel: "Post 4 — Turn 3",
        postLabel: "Post 4",
        capacity: 1,
        signupMode: "OPEN_SIGNUP",
        waitlistEnabled: true,
        startAt: new Date(Date.now() + 86_400_000),
        endAt: new Date(Date.now() + 90_000_000),
        timezone: "Asia/Kolkata",
      },
      select: { id: true },
    });

    return {
      leagueId: league.id,
      needId: need.id,
      userIds: users.map((user: { id: string }) => user.id) as string[],
    };
  }

  async function cleanup(leagueId: string, userIds: string[]) {
    await prisma.volunteerAssignment.deleteMany({ where: { need: { leagueId } } });
    await prisma.volunteerNeed.deleteMany({ where: { leagueId } });
    await prisma.leagueUser.deleteMany({ where: { leagueId } });
    await prisma.league.deleteMany({ where: { id: leagueId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  it("gives one slot to one claimant and waitlists the rest", async () => {
    const fixture = await createFixture(4);

    try {
      const barrier = createBarrier(4);
      actingUsers.length = 0;
      actingUsers.push(...fixture.userIds);

      const results = await Promise.all(
        fixture.userIds.map(async () => {
          await barrier();
          return claimVolunteerShift(fixture.needId);
        }),
      );

      const accepted = results.filter(
        (r: any) => r.success && r.data.status === "ACCEPTED",
      );
      const waitlisted = results.filter(
        (r: any) => r.success && r.data.status === "WAITLISTED",
      );

      expect(accepted).toHaveLength(1);
      expect(waitlisted).toHaveLength(3);

      const need = await prisma.volunteerNeed.findUnique({
        where: { id: fixture.needId },
        select: { acceptedCount: true, capacity: true },
      });
      // The invariant: never oversubscribed, however many arrive at once.
      expect(need.acceptedCount).toBe(1);
      expect(need.acceptedCount).toBeLessThanOrEqual(need.capacity);
    } finally {
      await cleanup(fixture.leagueId, fixture.userIds);
    }
  });

  it("promotes exactly one waiting volunteer when the slot is released", async () => {
    const fixture = await createFixture(3);

    try {
      // Claim in order so the waiting list has a known arrival order.
      actingUsers.length = 0;
      const claims: any[] = [];
      for (const userId of fixture.userIds) {
        actingUsers.push(userId);
        claims.push(await claimVolunteerShift(fixture.needId));
      }

      expect(claims[0].data.status).toBe("ACCEPTED");

      const holder = await prisma.volunteerAssignment.findFirst({
        where: { needId: fixture.needId, status: "ACCEPTED" },
        select: { id: true, userId: true },
      });

      actingUsers.length = 0;
      actingUsers.push(holder.userId);
      const released = await releaseVolunteerShift(holder.id);

      expect(released.success).toBe(true);
      // The longest-waiting volunteer takes the slot, not the newest arrival.
      expect(released.data.promotedUserId).toBe(fixture.userIds[1]);

      const [acceptedRows, need] = await Promise.all([
        prisma.volunteerAssignment.count({
          where: { needId: fixture.needId, status: "ACCEPTED" },
        }),
        prisma.volunteerNeed.findUnique({
          where: { id: fixture.needId },
          select: { acceptedCount: true },
        }),
      ]);

      expect(acceptedRows).toBe(1);
      // The slot moved rather than being returned: the counter never dips.
      expect(need.acceptedCount).toBe(1);
    } finally {
      await cleanup(fixture.leagueId, fixture.userIds);
    }
  });

  it("returns the capacity when nobody is waiting", async () => {
    const fixture = await createFixture(1);

    try {
      actingUsers.length = 0;
      actingUsers.push(fixture.userIds[0]);
      await claimVolunteerShift(fixture.needId);

      const holder = await prisma.volunteerAssignment.findFirst({
        where: { needId: fixture.needId, status: "ACCEPTED" },
        select: { id: true },
      });

      actingUsers.length = 0;
      actingUsers.push(fixture.userIds[0]);
      const released = await releaseVolunteerShift(holder.id);

      expect(released.data.promotedUserId).toBeNull();

      const need = await prisma.volunteerNeed.findUnique({
        where: { id: fixture.needId },
        select: { acceptedCount: true },
      });
      expect(need.acceptedCount).toBe(0);
    } finally {
      await cleanup(fixture.leagueId, fixture.userIds);
    }
  });

  it("refuses a second claim from somebody already holding the shift", async () => {
    const fixture = await createFixture(1);

    try {
      actingUsers.length = 0;
      actingUsers.push(fixture.userIds[0], fixture.userIds[0]);

      const first = await claimVolunteerShift(fixture.needId);
      const second = await claimVolunteerShift(fixture.needId);

      expect(first.success).toBe(true);
      expect(second.success).toBe(false);
      expect(second.error).toMatch(/already signed up/i);

      const need = await prisma.volunteerNeed.findUnique({
        where: { id: fixture.needId },
        select: { acceptedCount: true },
      });
      expect(need.acceptedCount).toBe(1);
    } finally {
      await cleanup(fixture.leagueId, fixture.userIds);
    }
  });
});
