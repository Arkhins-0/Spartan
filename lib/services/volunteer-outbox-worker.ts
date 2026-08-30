import { NotificationOutboxStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  sendVolunteerShiftReminderEmail,
  sendVolunteerShortageEmail,
} from "@/lib/email/templates";

/**
 * Drains `volunteer.*` rows from the durable outbox.
 *
 * Deliberately much smaller than the gear worker. Gear messages carry digest
 * windows, per-recipient suppression, and a strict ordering rule between events
 * about the same aggregate; a volunteer reminder is a single message to a single
 * person about a single shift, with none of that. Sharing the gear worker would
 * mean registering volunteer events in the gear notification registry, where
 * they do not belong and whose payload contracts they do not satisfy.
 *
 * What is shared is the outbox table itself, so a message is never lost between
 * a mutation and its send, and the retry/dead-letter shape, so a provider
 * outage retries rather than silently dropping.
 */

export const VOLUNTEER_OUTBOX_BATCH_SIZE = 50;
export const VOLUNTEER_OUTBOX_MAX_ATTEMPTS = 5;
const STALE_LOCK_MS = 10 * 60 * 1_000;
const VOLUNTEER_EVENT_TYPE_FILTER = { startsWith: "volunteer." } as const;

export type VolunteerOutboxResult = {
  sent: number;
  retried: number;
  deadLettered: number;
  /** Rows whose payload no longer parses; parked rather than retried forever. */
  rejected: number;
  recoveredLocks: number;
};

type PayloadRecord = Record<string, unknown>;

function asRecord(value: unknown): PayloadRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as PayloadRecord)
    : null;
}

function str(record: PayloadRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

/**
 * Return rows whose worker died mid-send to the pending pool.
 *
 * Without this a crash between locking and sending strands the message
 * permanently: it is PROCESSING, so no later run picks it up.
 */
async function recoverStaleLocks(now: Date): Promise<number> {
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  const result = await prisma.notificationOutbox.updateMany({
    where: {
      eventType: VOLUNTEER_EVENT_TYPE_FILTER,
      status: NotificationOutboxStatus.PROCESSING,
      lockedAt: { lt: staleBefore },
    },
    data: { status: NotificationOutboxStatus.PENDING, lockedAt: null },
  });
  return result.count;
}

export async function processVolunteerOutbox(
  now = new Date(),
): Promise<VolunteerOutboxResult> {
  const result: VolunteerOutboxResult = {
    sent: 0,
    retried: 0,
    deadLettered: 0,
    rejected: 0,
    recoveredLocks: await recoverStaleLocks(now),
  };

  const candidates = await prisma.notificationOutbox.findMany({
    where: {
      eventType: VOLUNTEER_EVENT_TYPE_FILTER,
      status: NotificationOutboxStatus.PENDING,
      scheduledAt: { lte: now },
    },
    select: { id: true },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    take: VOLUNTEER_OUTBOX_BATCH_SIZE,
  });

  for (const candidate of candidates) {
    // Claim conditionally so two overlapping cron runs cannot both send the
    // same message: the second matches zero rows and moves on.
    const claimed = await prisma.notificationOutbox.updateMany({
      where: { id: candidate.id, status: NotificationOutboxStatus.PENDING },
      data: {
        status: NotificationOutboxStatus.PROCESSING,
        lockedAt: now,
        attempts: { increment: 1 },
        lastAttemptAt: now,
      },
    });
    if (claimed.count === 0) continue;

    const row = await prisma.notificationOutbox.findUnique({
      where: { id: candidate.id },
    });
    if (!row) continue;

    const payload = asRecord(row.payload);
    if (!payload) {
      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: {
          status: NotificationOutboxStatus.FAILED,
          failedAt: new Date(),
          lockedAt: null,
          lastError: "Payload is not an object",
        },
      });
      result.rejected += 1;
      result.deadLettered += 1;
      continue;
    }

    try {
      if (row.eventType === "volunteer.shift.reminder") {
        await sendVolunteerShiftReminderEmail({
          to: row.recipientEmail,
          roleLabel: str(payload, "roleLabel") ?? "a volunteer shift",
          postLabel: str(payload, "postLabel"),
          startAt: str(payload, "startAt") ?? "",
          timezone: str(payload, "timezone") ?? "UTC",
        });
      } else if (row.eventType === "volunteer.need.shortage") {
        await sendVolunteerShortageEmail({
          to: row.recipientEmail,
          roleLabel: str(payload, "roleLabel") ?? "a volunteer shift",
          postLabel: str(payload, "postLabel"),
          shortfall: Number(payload.shortfall ?? 0),
          capacity: Number(payload.capacity ?? 0),
          startAt: str(payload, "startAt") ?? "",
          timezone: str(payload, "timezone") ?? "UTC",
        });
      } else {
        // An event type nobody can render is a contract break, not a transient
        // failure. Park it rather than retrying it four more times.
        await prisma.notificationOutbox.update({
          where: { id: row.id },
          data: {
            status: NotificationOutboxStatus.FAILED,
            failedAt: new Date(),
            lockedAt: null,
            lastError: `No handler for ${row.eventType}`,
          },
        });
        result.rejected += 1;
        result.deadLettered += 1;
        continue;
      }

      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: {
          status: NotificationOutboxStatus.SENT,
          sentAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      });
      result.sent += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
      const exhausted = row.attempts >= VOLUNTEER_OUTBOX_MAX_ATTEMPTS;

      await prisma.notificationOutbox.update({
        where: { id: row.id },
        data: {
          status: exhausted
            ? NotificationOutboxStatus.FAILED
            : NotificationOutboxStatus.PENDING,
          lockedAt: null,
          lastError: message,
          ...(exhausted ? { failedAt: new Date() } : {}),
          // Back off so a provider outage is not hammered every cron tick.
          ...(exhausted
            ? {}
            : {
                scheduledAt: new Date(
                  now.getTime() + Math.min(2 ** row.attempts, 60) * 60_000,
                ),
              }),
        },
      });

      if (exhausted) result.deadLettered += 1;
      else result.retried += 1;

      console.error("Volunteer outbox delivery failed", {
        outboxId: row.id,
        eventType: row.eventType,
        attempts: row.attempts,
      });
    }
  }

  return result;
}
