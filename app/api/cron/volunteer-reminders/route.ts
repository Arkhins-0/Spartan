import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  queueVolunteerShiftReminders,
  queueVolunteerShortageNotices,
} from "@/lib/services/volunteer-reminders";
import { processVolunteerOutbox } from "@/lib/services/volunteer-outbox-worker";

function authorized(request: NextRequest): boolean {
  const secret = env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !provided) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function failure(stage: string, error: unknown): { stage: string; error: string } {
  const message = error instanceof Error ? error.message.slice(0, 200) : "Unknown error";
  console.error("Volunteer reminder cron stage failed", { stage, message });
  return { stage, error: message };
}

/**
 * Three independent stages, following the gear notification cron.
 *
 * They share a schedule but not a fate: a shortage query that fails must not
 * stop reminders already sitting in the outbox from going out. Each stage is
 * attempted, its failure recorded, and the response is a 500 only when nothing
 * at all succeeded — so a partial outage still drains what it can and still
 * reports honestly.
 */
async function run(request: NextRequest) {
  if (!env.CRON_SECRET) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: Array<{ stage: string; error: string }> = [];
  const now = new Date();

  let shifts = null;
  try {
    shifts = await queueVolunteerShiftReminders(now);
  } catch (error) {
    errors.push(failure("queue-shift-reminders", error));
  }

  let shortages = null;
  try {
    shortages = await queueVolunteerShortageNotices(now);
  } catch (error) {
    errors.push(failure("queue-shortage-notices", error));
  }

  let delivery = null;
  try {
    delivery = await processVolunteerOutbox(now);
  } catch (error) {
    errors.push(failure("deliver-outbox", error));
  }

  const succeeded = shifts !== null || shortages !== null || delivery !== null;
  if (!succeeded) {
    return NextResponse.json(
      { error: "Volunteer reminder processing failed", errors },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: errors.length === 0,
    shifts,
    shortages,
    delivery,
    ...(errors.length > 0 ? { errors } : {}),
  });
}

export const GET = run;
export const POST = run;
