import { prisma } from "@/lib/db/prisma";

/**
 * Materializes volunteer reminders into the durable outbox.
 *
 * Modelled on `lib/services/gear-reminders.ts`, and for the same reasons: the
 * candidate set only grows, so an unbounded `findMany` would eventually read a
 * whole season into memory on every cron tick. The scan is paged and budgeted,
 * and each reminder is queued in its own write so one bad row — a deleted user,
 * a constraint violation — costs that one reminder rather than every reminder
 * behind it.
 *
 * Two kinds of reminder, aimed at different people:
 *
 *  - `volunteer.shift.reminder` tells somebody holding a shift that it is
 *    coming, once at a week out and again at a day out.
 *  - `volunteer.need.shortage` tells the organizers that a post is still short
 *    while there is time to do something about it. Racing clubs allocate posts
 *    around ten days before an event, so the default lead time is ten days:
 *    a shortage notice that arrives on the morning of the race is useless.
 *
 * Repeat runs are idempotent because the occurrence is part of the dedupe key
 * and the outbox has a unique index on (leagueId, dedupeKey).
 */

/** Shifts read per database round trip. */
export const VOLUNTEER_REMINDER_PAGE_SIZE = 100;
/** Shifts a single run will process before deferring the rest. */
export const VOLUNTEER_REMINDER_BUDGET = 500;

/** How far ahead each reminder fires. */
export const SHIFT_REMINDER_WINDOWS = [
  { key: "7d", ms: 7 * 24 * 60 * 60 * 1_000 },
  { key: "24h", ms: 24 * 60 * 60 * 1_000 },
] as const;

/**
 * How long before a shift an unfilled post becomes worth chasing. Ten days
 * matches the point at which clubs actually allocate posts.
 */
export const SHORTAGE_LEAD_MS = 10 * 24 * 60 * 60 * 1_000;

export type VolunteerReminderResult = {
  shiftReminders: number;
  shortageNotices: number;
  /** Reminders that could not be queued; the run continued. */
  failed: number;
  scanned: number;
  /** True when the budget was exhausted before the backlog was. */
  truncated: boolean;
};

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Queue reminders for shifts starting inside each window.
 *
 * The window is a slice, not a threshold: a shift is reminded about when it
 * falls into the 7-day or 24-hour band, and the band is one cron period wide on
 * the near side so a shift cannot fall between two runs. Overlap is harmless —
 * the dedupe key collapses it.
 */
export async function queueVolunteerShiftReminders(
  now = new Date(),
): Promise<VolunteerReminderResult> {
  const result: VolunteerReminderResult = {
    shiftReminders: 0,
    shortageNotices: 0,
    failed: 0,
    scanned: 0,
    truncated: false,
  };

  for (const window of SHIFT_REMINDER_WINDOWS) {
    // A generous trailing edge: the dedupe key stops a shift being reminded
    // about twice for the same window, so a wide band costs nothing and a
    // narrow one risks missing a shift entirely if a cron run is skipped.
    const from = new Date(now.getTime() + window.ms - 6 * 60 * 60 * 1_000);
    const to = new Date(now.getTime() + window.ms + 6 * 60 * 60 * 1_000);

    let cursor: string | undefined;

    while (result.scanned < VOLUNTEER_REMINDER_BUDGET) {
      const assignments = await prisma.volunteerAssignment.findMany({
        where: {
          status: "ACCEPTED",
          need: {
            status: "OPEN",
            startAt: { gte: from, lte: to },
          },
          user: { isNot: null },
        },
        select: {
          id: true,
          userId: true,
          user: { select: { email: true } },
          need: {
            select: {
              id: true,
              leagueId: true,
              roleLabel: true,
              postLabel: true,
              startAt: true,
              timezone: true,
            },
          },
        },
        orderBy: { id: "asc" },
        take: VOLUNTEER_REMINDER_PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      if (assignments.length === 0) break;
      cursor = assignments[assignments.length - 1].id;
      result.scanned += assignments.length;

      for (const assignment of assignments) {
        if (!assignment.userId || !assignment.user?.email) continue;
        try {
          const created = await prisma.notificationOutbox.createMany({
            data: [
              {
                leagueId: assignment.need.leagueId,
                recipientUserId: assignment.userId,
                recipientEmail: assignment.user.email,
                eventType: "volunteer.shift.reminder",
                aggregateType: "VOLUNTEER_ASSIGNMENT",
                aggregateId: assignment.id,
                payload: {
                  roleLabel: assignment.need.roleLabel,
                  postLabel: assignment.need.postLabel,
                  startAt: assignment.need.startAt.toISOString(),
                  timezone: assignment.need.timezone,
                  window: window.key,
                },
                dedupeKey: `volunteer.shift.reminder:${assignment.id}:${window.key}`,
              },
            ],
            skipDuplicates: true,
          });
          result.shiftReminders += created.count;
        } catch (error) {
          result.failed += 1;
          console.error("Failed to queue a volunteer shift reminder", {
            assignmentId: assignment.id,
            window: window.key,
            error: error instanceof Error ? error.message.slice(0, 200) : "unknown",
          });
        }
      }

      if (assignments.length < VOLUNTEER_REMINDER_PAGE_SIZE) break;
    }
  }

  result.truncated = result.scanned >= VOLUNTEER_REMINDER_BUDGET;
  return result;
}

/**
 * Tell the people who can fix it that a post is still short.
 *
 * One notice per need per day until it is filled or the shift passes: the same
 * "one per calendar day" shape the gear overdue reminder uses, because a
 * shortage stays a shortage until somebody acts and a single notice is easy to
 * miss.
 *
 * Recipients are the association's organizers — anyone holding MANAGE_VOLUNTEERS
 * through a grant, plus legacy league admins. Resolving them here rather than
 * in the worker keeps the outbox row fully addressed at enqueue time, which is
 * what makes delivery independent of a later role change.
 */
export async function queueVolunteerShortageNotices(
  now = new Date(),
): Promise<VolunteerReminderResult> {
  const result: VolunteerReminderResult = {
    shiftReminders: 0,
    shortageNotices: 0,
    failed: 0,
    scanned: 0,
    truncated: false,
  };

  const horizon = new Date(now.getTime() + SHORTAGE_LEAD_MS);
  const day = isoDay(now);

  let cursor: string | undefined;

  while (result.scanned < VOLUNTEER_REMINDER_BUDGET) {
    const needs = await prisma.volunteerNeed.findMany({
      where: {
        status: "OPEN",
        startAt: { gt: now, lte: horizon },
      },
      select: {
        id: true,
        leagueId: true,
        roleLabel: true,
        postLabel: true,
        capacity: true,
        acceptedCount: true,
        startAt: true,
        timezone: true,
      },
      orderBy: { id: "asc" },
      take: VOLUNTEER_REMINDER_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (needs.length === 0) break;
    cursor = needs[needs.length - 1].id;
    result.scanned += needs.length;

    for (const need of needs) {
      // Postgres cannot compare two columns in a Prisma `where`, so the
      // shortfall is filtered here rather than in the query.
      if (need.acceptedCount >= need.capacity) continue;

      try {
        const organizers = await organizersFor(need.leagueId);
        if (organizers.length === 0) continue;

        const created = await prisma.notificationOutbox.createMany({
          data: organizers.map((organizer) => ({
            leagueId: need.leagueId,
            recipientUserId: organizer.id,
            recipientEmail: organizer.email,
            eventType: "volunteer.need.shortage",
            aggregateType: "VOLUNTEER_NEED",
            aggregateId: need.id,
            payload: {
              roleLabel: need.roleLabel,
              postLabel: need.postLabel,
              shortfall: need.capacity - need.acceptedCount,
              capacity: need.capacity,
              startAt: need.startAt.toISOString(),
              timezone: need.timezone,
            },
            dedupeKey: `volunteer.need.shortage:${need.id}:${day}:${organizer.id}`,
          })),
          skipDuplicates: true,
        });
        result.shortageNotices += created.count;
      } catch (error) {
        result.failed += 1;
        console.error("Failed to queue a volunteer shortage notice", {
          needId: need.id,
          error: error instanceof Error ? error.message.slice(0, 200) : "unknown",
        });
      }
    }

    if (needs.length < VOLUNTEER_REMINDER_PAGE_SIZE) break;
  }

  result.truncated = result.scanned >= VOLUNTEER_REMINDER_BUDGET;
  return result;
}

/** Everyone in one association who can act on a volunteer shortage. */
async function organizersFor(
  leagueId: string,
): Promise<Array<{ id: string; email: string }>> {
  const [admins, granted] = await Promise.all([
    prisma.leagueUser.findMany({
      where: { leagueId, role: "LEAGUE_ADMIN" },
      select: { user: { select: { id: true, email: true } } },
    }),
    prisma.associationRoleGrant.findMany({
      where: {
        leagueId,
        state: "ACTIVE",
        role: { in: ["ASSOCIATION_ADMIN", "VOLUNTEER_COORDINATOR", "TEAM_MANAGER"] },
      },
      select: { user: { select: { id: true, email: true } } },
    }),
  ]);

  const byId = new Map<string, { id: string; email: string }>();
  for (const row of [...admins, ...granted]) {
    if (row.user?.email) byId.set(row.user.id, { id: row.user.id, email: row.user.email });
  }
  return [...byId.values()];
}
