"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Capability, hasCapability } from "@/lib/auth/capabilities";
import { rethrowIfNextRedirectError } from "@/lib/utils/next-errors";
import {
  createRaceSessionSchema,
  updateRaceSessionSchema,
  sessionIdSchema,
  roundIdSchema,
  type CreateRaceSessionInput,
  type UpdateRaceSessionInput,
  type RoundIdInput,
} from "@/lib/utils/validation";
import type { RaceSessionView } from "@/types/race-rounds";

/**
 * The timetable of a race weekend.
 *
 * A session never creates a claim on venue space. When it occupies space it
 * names a reservation that a venue already confirmed, and its venue, surface,
 * and segment are copied from that reservation rather than typed in beside it —
 * so the two can never disagree about what is booked (FR-007, FR-008). A
 * session with no reservation is a paper timetable entry: sign-on, a briefing,
 * or a weekend at a circuit this installation does not manage.
 *
 * Several sessions deliberately share one reservation. Booking a circuit for
 * the day and running practice, qualifying, and two races inside it is the
 * normal shape of a race weekend, and it is still exactly one occupancy.
 */

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

const UNAUTHORIZED = "Unauthorized: You do not have permission to manage this race weekend";

function revalidateSessionPaths(leagueId: string, roundId: string) {
  revalidatePath(`/league/${leagueId}/rounds`);
  revalidatePath(`/league/${leagueId}/rounds/${roundId}`);
}

async function canManageRound(userId: string, leagueId: string, roundId: string) {
  return hasCapability({
    userId,
    leagueId,
    capability: Capability.MANAGE_SCHEDULE,
    roundId,
  });
}

/** Empty strings arrive from unselected MUI selects; they are not ids. */
function optional(value: string | undefined | null): string | null {
  return value ? value : null;
}

type ResolvedPlacement = {
  venueId: string | null;
  surfaceId: string | null;
  segmentId: string | null;
  reservationId: string | null;
};

/**
 * Decide where a session sits, and refuse anything that would double-book.
 *
 * With a reservation, the reservation wins outright: it is the occupancy
 * record, so its venue, surface, and segment are what the session stores. What
 * is checked is that the reservation is real, confirmed, owned by this
 * association, and wide enough to contain the session — a session running past
 * the end of its booking is a conflict nobody would see until race day.
 */
async function resolvePlacement(
  leagueId: string,
  input: {
    reservationId?: string;
    venueId?: string;
    surfaceId?: string;
    segmentId?: string;
    startAt: Date;
    endAt: Date;
  },
): Promise<{ ok: true; data: ResolvedPlacement } | { ok: false; error: string }> {
  const reservationId = optional(input.reservationId);

  if (!reservationId) {
    return {
      ok: true,
      data: {
        venueId: optional(input.venueId),
        surfaceId: optional(input.surfaceId),
        segmentId: optional(input.segmentId),
        reservationId: null,
      },
    };
  }

  const reservation = await prisma.venueReservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      status: true,
      venueId: true,
      surfaceId: true,
      segmentId: true,
      startsAt: true,
      endsAt: true,
      ownerLeagueId: true,
    },
  });

  if (!reservation) {
    return { ok: false, error: "That reservation could not be found." };
  }
  if (reservation.status !== "CONFIRMED") {
    return {
      ok: false,
      error: "A session can only use ice the venue has confirmed.",
    };
  }
  if (reservation.ownerLeagueId !== leagueId) {
    return {
      ok: false,
      error: "That reservation belongs to another association.",
    };
  }
  if (input.startAt < reservation.startsAt || input.endAt > reservation.endsAt) {
    return {
      ok: false,
      error: "The session runs outside the reserved time.",
    };
  }

  return {
    ok: true,
    data: {
      venueId: reservation.venueId,
      surfaceId: reservation.surfaceId,
      segmentId: reservation.segmentId,
      reservationId: reservation.id,
    },
  };
}

/** A duplicate position in the timetable, reported by position rather than by constraint name. */
function isDuplicateOrder(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export async function createRaceSession(
  input: CreateRaceSessionInput,
): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const userId = await requireUserId();
    const validated = createRaceSessionSchema.parse(input);

    const round = await prisma.raceRound.findUnique({
      where: { id: validated.roundId },
      select: { id: true, leagueId: true },
    });
    if (!round) {
      return { success: false, error: "Round not found" };
    }

    if (!(await canManageRound(userId, round.leagueId, round.id))) {
      return { success: false, error: UNAUTHORIZED };
    }

    const placement = await resolvePlacement(round.leagueId, validated);
    if (!placement.ok) {
      return { success: false, error: placement.error };
    }

    const session = await prisma.raceSession.create({
      data: {
        roundId: round.id,
        name: validated.name,
        kind: validated.kind,
        startAt: validated.startAt,
        endAt: validated.endAt,
        timezone: validated.timezone,
        sortOrder: validated.sortOrder,
        notes: optional(validated.notes),
        createdById: userId,
        ...placement.data,
      },
      select: { id: true },
    });

    revalidateSessionPaths(round.leagueId, round.id);
    return { success: true, data: { sessionId: session.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    if (isDuplicateOrder(error)) {
      return {
        success: false,
        error: "Another session already holds that place in the timetable",
      };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error creating race session:", error);
    return { success: false, error: "Failed to add the session. Please try again." };
  }
}

export async function updateRaceSession(
  input: UpdateRaceSessionInput,
): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const userId = await requireUserId();
    const validated = updateRaceSessionSchema.parse(input);

    const existing = await prisma.raceSession.findUnique({
      where: { id: validated.sessionId },
      select: { id: true, roundId: true, round: { select: { leagueId: true } } },
    });
    if (!existing) {
      return { success: false, error: "Session not found" };
    }

    const leagueId = existing.round.leagueId;
    if (!(await canManageRound(userId, leagueId, existing.roundId))) {
      return { success: false, error: UNAUTHORIZED };
    }

    const placement = await resolvePlacement(leagueId, validated);
    if (!placement.ok) {
      return { success: false, error: placement.error };
    }

    await prisma.raceSession.update({
      where: { id: existing.id },
      data: {
        name: validated.name,
        kind: validated.kind,
        startAt: validated.startAt,
        endAt: validated.endAt,
        timezone: validated.timezone,
        sortOrder: validated.sortOrder,
        notes: optional(validated.notes),
        ...placement.data,
      },
    });

    revalidateSessionPaths(leagueId, existing.roundId);
    return { success: true, data: { sessionId: existing.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    if (isDuplicateOrder(error)) {
      return {
        success: false,
        error: "Another session already holds that place in the timetable",
      };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error updating race session:", error);
    return { success: false, error: "Failed to update the session. Please try again." };
  }
}

/**
 * Remove a session from the timetable.
 *
 * Volunteer needs pointed at it are not deleted with it: the shift still
 * happened, or is still owed to whoever accepted it. `sessionId` is nulled by
 * the schema's SetNull, leaving the need attached to the weekend.
 */
export async function deleteRaceSession(
  sessionId: string,
): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const userId = await requireUserId();
    const validated = sessionIdSchema.parse({ sessionId });

    const existing = await prisma.raceSession.findUnique({
      where: { id: validated.sessionId },
      select: { id: true, roundId: true, round: { select: { leagueId: true } } },
    });
    if (!existing) {
      return { success: false, error: "Session not found" };
    }

    const leagueId = existing.round.leagueId;
    if (!(await canManageRound(userId, leagueId, existing.roundId))) {
      return { success: false, error: UNAUTHORIZED };
    }

    await prisma.raceSession.delete({ where: { id: existing.id } });

    revalidateSessionPaths(leagueId, existing.roundId);
    return { success: true, data: { sessionId: existing.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid session ID" };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error deleting race session:", error);
    return { success: false, error: "Failed to remove the session. Please try again." };
  }
}

/** The timetable for one round. Any association member may read it. */
export async function getRaceSessions(
  input: RoundIdInput,
): Promise<ActionResult<RaceSessionView[]>> {
  try {
    const userId = await requireUserId();
    const validated = roundIdSchema.parse(input);

    const round = await prisma.raceRound.findUnique({
      where: { id: validated.roundId },
      select: { id: true, leagueId: true },
    });
    if (!round) {
      return { success: false, error: "Round not found" };
    }

    const membership = await prisma.leagueUser.count({
      where: { userId, leagueId: round.leagueId },
    });
    if (membership === 0) {
      return { success: false, error: "Unauthorized: You are not part of this association" };
    }

    const sessions = await prisma.raceSession.findMany({
      where: { roundId: round.id },
      select: {
        id: true,
        name: true,
        kind: true,
        startAt: true,
        endAt: true,
        timezone: true,
        sortOrder: true,
        notes: true,
        reservationId: true,
        venue: { select: { id: true, name: true } },
        surface: { select: { id: true, name: true } },
        segment: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { startAt: "asc" }],
    });

    return {
      success: true,
      data: sessions.map((session) => ({
        id: session.id,
        name: session.name,
        kind: session.kind,
        startAt: session.startAt.toISOString(),
        endAt: session.endAt.toISOString(),
        timezone: session.timezone,
        sortOrder: session.sortOrder,
        notes: session.notes,
        venue: session.venue,
        surface: session.surface,
        segment: session.segment,
        // The id alone: whether space is booked is what the timetable needs to
        // show, and the reservation itself has its own authorized views.
        hasReservation: session.reservationId !== null,
      })),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error loading race sessions:", error);
    return { success: false, error: "Failed to load the timetable. Please try again." };
  }
}
