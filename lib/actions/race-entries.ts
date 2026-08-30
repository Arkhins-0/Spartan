"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Capability, hasCapability } from "@/lib/auth/capabilities";
import { rethrowIfNextRedirectError } from "@/lib/utils/next-errors";
import {
  upsertRaceEntrySchema,
  raceEntryIdSchema,
  roundIdSchema,
  type UpsertRaceEntryInput,
  type RoundIdInput,
} from "@/lib/utils/validation";
import type { RaceEntryView } from "@/types/race-rounds";

/**
 * The entry list for a round: who is expected on the grid.
 *
 * The unique key is (round, team, driver), the same key `RaceResult` uses, so
 * the results sheet and the entry list identify a car the same way and a
 * results grid can be seeded from entries without a second identity scheme.
 *
 * `carNumber` is stored here rather than read from `Player.carNumber`, which is
 * an integer and the driver's usual number. A car number is per-entry (a driver
 * may run a different number in a different car or class) and is not always
 * numeric — "07" and "1A" are both real, and "07" is not 7.
 */

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

const UNAUTHORIZED = "Unauthorized: You do not have permission to manage this entry list";

function revalidateEntryPaths(leagueId: string, roundId: string) {
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

function optional(value: string | undefined | null): string | null {
  return value ? value : null;
}

/**
 * Add a car to the entry list, or update the one already there.
 *
 * Upsert rather than create: an entry is identified by who is driving what for
 * whom, so re-submitting the same car is a correction, not a second entry. The
 * unique key makes that atomic without a read-then-write race.
 */
export async function upsertRaceEntry(
  input: UpsertRaceEntryInput,
): Promise<ActionResult<{ entryId: string }>> {
  try {
    const userId = await requireUserId();
    const validated = upsertRaceEntrySchema.parse(input);

    const round = await prisma.raceRound.findUnique({
      where: { id: validated.roundId },
      select: { id: true, leagueId: true, status: true },
    });
    if (!round) {
      return { success: false, error: "Round not found" };
    }

    if (!(await canManageRound(userId, round.leagueId, round.id))) {
      return { success: false, error: UNAUTHORIZED };
    }

    // The team must be in this championship, or an entry list could name a team
    // from another association.
    const team = await prisma.team.findFirst({
      where: { id: validated.teamId, leagueId: round.leagueId },
      select: { id: true },
    });
    if (!team) {
      return { success: false, error: "That team does not belong to this championship" };
    }

    const playerId = optional(validated.playerId);
    if (playerId) {
      // A driver entered for a team has to be on that team's roster; otherwise
      // the entry list and the roster tell different stories about who races.
      const player = await prisma.player.findFirst({
        where: { id: playerId, teamId: validated.teamId },
        select: { id: true },
      });
      if (!player) {
        return { success: false, error: "That driver is not on the entered team" };
      }
    }

    const data = {
      carNumber: optional(validated.carNumber),
      className: optional(validated.className),
      status: validated.status,
      notes: optional(validated.notes),
    };

    // Postgres treats NULLs as distinct, so the compound unique cannot address a
    // team-level entry and Prisma will not accept a null in the compound key.
    // A partial unique index guards that case in the database; here it is a
    // find-then-write, which the index keeps honest under concurrency.
    let entry: { id: string };
    if (playerId === null) {
      const existing = await prisma.raceEntry.findFirst({
        where: { roundId: round.id, teamId: validated.teamId, playerId: null },
        select: { id: true },
      });
      entry = existing
        ? await prisma.raceEntry.update({
            where: { id: existing.id },
            data,
            select: { id: true },
          })
        : await prisma.raceEntry.create({
            data: {
              roundId: round.id,
              teamId: validated.teamId,
              playerId: null,
              registeredById: userId,
              ...data,
            },
            select: { id: true },
          });
    } else {
      entry = await prisma.raceEntry.upsert({
        where: {
          roundId_teamId_playerId: {
            roundId: round.id,
            teamId: validated.teamId,
            playerId,
          },
        },
        create: {
          roundId: round.id,
          teamId: validated.teamId,
          playerId,
          registeredById: userId,
          ...data,
        },
        update: data,
        select: { id: true },
      });
    }

    revalidateEntryPaths(round.leagueId, round.id);
    return { success: true, data: { entryId: entry.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "That car is already on the entry list" };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error saving race entry:", error);
    return { success: false, error: "Failed to save the entry. Please try again." };
  }
}

/**
 * Remove an entry outright.
 *
 * Withdrawing is the usual action and is a status change, not a delete: a
 * withdrawn car stays on the published list so the grid is explicable. Deleting
 * is for an entry that should never have been recorded.
 */
export async function deleteRaceEntry(
  entryId: string,
): Promise<ActionResult<{ entryId: string }>> {
  try {
    const userId = await requireUserId();
    const validated = raceEntryIdSchema.parse({ entryId });

    const entry = await prisma.raceEntry.findUnique({
      where: { id: validated.entryId },
      select: { id: true, roundId: true, round: { select: { leagueId: true } } },
    });
    if (!entry) {
      return { success: false, error: "Entry not found" };
    }

    const leagueId = entry.round.leagueId;
    if (!(await canManageRound(userId, leagueId, entry.roundId))) {
      return { success: false, error: UNAUTHORIZED };
    }

    await prisma.raceEntry.delete({ where: { id: entry.id } });

    revalidateEntryPaths(leagueId, entry.roundId);
    return { success: true, data: { entryId: entry.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid entry ID" };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error deleting race entry:", error);
    return { success: false, error: "Failed to remove the entry. Please try again." };
  }
}

/** The entry list for one round. Any association member may read it. */
export async function getRaceEntries(
  input: RoundIdInput,
): Promise<ActionResult<RaceEntryView[]>> {
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

    const entries = await prisma.raceEntry.findMany({
      where: { roundId: round.id },
      select: {
        id: true,
        carNumber: true,
        className: true,
        status: true,
        notes: true,
        team: { select: { id: true, name: true } },
        // Name only. The roster holds emergency contacts and dates of birth,
        // and an entry list is read by anyone in the association.
        player: { select: { id: true, name: true } },
      },
      orderBy: [{ className: "asc" }, { carNumber: "asc" }, { id: "asc" }],
    });

    return {
      success: true,
      data: entries.map((entry) => ({
        id: entry.id,
        carNumber: entry.carNumber,
        className: entry.className,
        status: entry.status,
        notes: entry.notes,
        team: entry.team,
        driver: entry.player,
      })),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error loading race entries:", error);
    return { success: false, error: "Failed to load the entry list. Please try again." };
  }
}
