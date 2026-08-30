"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Capability, hasCapability } from "@/lib/auth/capabilities";
import {
  createRaceRoundSchema,
  updateRaceRoundSchema,
  recordRaceResultsSchema,
  getChampionshipStandingsSchema,
  roundIdSchema,
  leagueIdSchema,
  type CreateRaceRoundInput,
  type UpdateRaceRoundInput,
  type RecordRaceResultsInput,
  type GetChampionshipStandingsInput,
  type RoundIdInput,
  type LeagueIdInput,
} from "@/lib/utils/validation";
import type {
  ChampionshipStandings,
  RaceRoundDetail,
  RaceRoundView,
  StandingsRow,
} from "@/types/race-rounds";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

/**
 * Championship rounds and results.
 *
 * A round is a multi-entrant grid, which `SeasonGame` cannot express — that
 * model is a fixture between exactly two teams. Scope here is deliberately
 * position and points only; lap times and gaps stay with the sanctioning
 * body's timing system.
 *
 * Standings are computed from `RaceResult` on read and never stored, so
 * correcting a result can never leave a stale table behind.
 */

const UNAUTHORIZED = "Unauthorized: You do not have permission to manage this championship";

function revalidateRoundPaths(leagueId: string, roundId?: string) {
  revalidatePath(`/league/${leagueId}/rounds`);
  revalidatePath(`/league/${leagueId}/standings`);
  if (roundId) {
    revalidatePath(`/league/${leagueId}/rounds/${roundId}`);
  }
}

/**
 * Rounds are schedule work, so they answer to MANAGE_SCHEDULE like every other
 * scheduling path rather than to a direct LeagueUser lookup. The old check read
 * `role: LEAGUE_ADMIN` off `LeagueUser`, which meant a delegated SCHEDULER or a
 * round-scoped EVENT_MANAGER could not touch a championship they had expressly
 * been given. `hasCapability` still admits legacy league admins, so nobody who
 * could run rounds before loses the ability now.
 *
 * `roundId` is the scope target: omitting it (creating a round) deliberately
 * fails a round-scoped grant, because authority over one round is not authority
 * to invent another.
 */
async function canManageRounds(
  userId: string,
  leagueId: string,
  roundId?: string,
): Promise<boolean> {
  return hasCapability({
    userId,
    leagueId,
    capability: Capability.MANAGE_SCHEDULE,
    roundId,
  });
}

/** Date-only values are stored at UTC midnight so they never shift by timezone. */
function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnlyString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function createRaceRound(
  input: CreateRaceRoundInput
): Promise<ActionResult<{ roundId: string }>> {
  try {
    const validated = createRaceRoundSchema.parse(input);
    const userId = await requireUserId();

    if (!(await canManageRounds(userId, validated.leagueId))) {
      return { success: false, error: UNAUTHORIZED };
    }

    const round = await prisma.raceRound.create({
      data: {
        leagueId: validated.leagueId,
        name: validated.name,
        roundNumber: validated.roundNumber,
        raceDate: toUtcDate(validated.raceDate),
        venueId: validated.venueId || null,
        seasonId: validated.seasonId || null,
        locationText: validated.locationText || null,
        notes: validated.notes || null,
        createdById: userId,
      },
    });

    revalidateRoundPaths(validated.leagueId, round.id);

    return { success: true, data: { roundId: round.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "That round number is already used in this championship",
      };
    }
    console.error("Error creating race round:", error);
    return { success: false, error: "Failed to create the round. Please try again." };
  }
}

export async function updateRaceRound(
  input: UpdateRaceRoundInput
): Promise<ActionResult<{ roundId: string }>> {
  try {
    const validated = updateRaceRoundSchema.parse(input);
    const userId = await requireUserId();

    const existing = await prisma.raceRound.findUnique({
      where: { id: validated.roundId },
      select: { leagueId: true },
    });
    if (!existing) {
      return { success: false, error: "Round not found" };
    }

    if (!(await canManageRounds(userId, existing.leagueId, validated.roundId))) {
      return { success: false, error: UNAUTHORIZED };
    }

    await prisma.raceRound.update({
      where: { id: validated.roundId },
      data: {
        name: validated.name,
        roundNumber: validated.roundNumber,
        raceDate: toUtcDate(validated.raceDate),
        venueId: validated.venueId || null,
        seasonId: validated.seasonId || null,
        locationText: validated.locationText || null,
        notes: validated.notes || null,
        ...(validated.status ? { status: validated.status } : {}),
      },
    });

    revalidateRoundPaths(existing.leagueId, validated.roundId);

    return { success: true, data: { roundId: validated.roundId } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "That round number is already used in this championship",
      };
    }
    console.error("Error updating race round:", error);
    return { success: false, error: "Failed to update the round. Please try again." };
  }
}

/**
 * Record (or correct) a round's results.
 *
 * The whole grid is replaced in one transaction so a correction can never
 * leave half the old sheet behind — the unique key is (round, team, driver),
 * and results are only ever the current truth for that round.
 */
export async function recordRaceResults(
  input: RecordRaceResultsInput
): Promise<ActionResult<{ roundId: string; resultCount: number }>> {
  try {
    const validated = recordRaceResultsSchema.parse(input);
    const userId = await requireUserId();

    const round = await prisma.raceRound.findUnique({
      where: { id: validated.roundId },
      select: { id: true, leagueId: true },
    });
    if (!round) {
      return { success: false, error: "Round not found" };
    }

    if (!(await canManageRounds(userId, round.leagueId, round.id))) {
      return { success: false, error: UNAUTHORIZED };
    }

    // Reject duplicate entrant lines up front: the DB would raise an opaque
    // unique violation, and the admin needs to know which line is wrong.
    const seen = new Set<string>();
    for (const entry of validated.results) {
      const key = `${entry.teamId}:${entry.playerId ?? ""}`;
      if (seen.has(key)) {
        return {
          success: false,
          error: "The same team and driver appears more than once in these results",
        };
      }
      seen.add(key);
    }

    // Every entrant must belong to this championship.
    const teamIds = [...new Set(validated.results.map((entry) => entry.teamId))];
    const validTeams = await prisma.team.count({
      where: { id: { in: teamIds }, leagueId: round.leagueId },
    });
    if (validTeams !== teamIds.length) {
      return {
        success: false,
        error: "One or more teams do not belong to this championship",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.raceResult.deleteMany({ where: { roundId: round.id } });
      await tx.raceResult.createMany({
        data: validated.results.map((entry) => ({
          roundId: round.id,
          teamId: entry.teamId,
          playerId: entry.playerId || null,
          position: entry.position ?? null,
          points: new Prisma.Decimal(entry.points),
          status: entry.status,
          notes: entry.notes || null,
          recordedById: userId,
        })),
      });

      await tx.raceRound.update({
        where: { id: round.id },
        data: { status: validated.finalize ? "FINALIZED" : "RESULTS_PENDING" },
      });
    });

    revalidateRoundPaths(round.leagueId, round.id);

    return {
      success: true,
      data: { roundId: round.id, resultCount: validated.results.length },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error recording race results:", error);
    return { success: false, error: "Failed to record results. Please try again." };
  }
}

/** Rounds in a championship, for the admin list and the public-facing calendar. */
export async function getRaceRounds(
  input: LeagueIdInput
): Promise<ActionResult<RaceRoundView[]>> {
  try {
    const validated = leagueIdSchema.parse(input);
    const userId = await requireUserId();

    // Any association member may see the calendar; only admins can change it.
    const membership = await prisma.leagueUser.count({
      where: { userId, leagueId: validated.leagueId },
    });
    if (membership === 0) {
      return { success: false, error: "Unauthorized: You are not part of this association" };
    }

    const rounds = await prisma.raceRound.findMany({
      where: { leagueId: validated.leagueId },
      select: {
        id: true,
        name: true,
        roundNumber: true,
        raceDate: true,
        timezone: true,
        status: true,
        locationText: true,
        notes: true,
        seasonId: true,
        venue: { select: { id: true, name: true } },
        _count: { select: { results: true } },
      },
      orderBy: { roundNumber: "asc" },
    });

    return {
      success: true,
      data: rounds.map((round) => ({
        id: round.id,
        name: round.name,
        roundNumber: round.roundNumber,
        raceDate: toDateOnlyString(round.raceDate),
        timezone: round.timezone,
        status: round.status,
        locationText: round.locationText,
        notes: round.notes,
        venue: round.venue,
        seasonId: round.seasonId,
        resultCount: round._count.results,
      })),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error loading race rounds:", error);
    return { success: false, error: "Failed to load rounds. Please try again." };
  }
}

/** One round with its full results grid. */
export async function getRoundResults(
  input: RoundIdInput
): Promise<ActionResult<RaceRoundDetail>> {
  try {
    const validated = roundIdSchema.parse(input);
    const userId = await requireUserId();

    const round = await prisma.raceRound.findUnique({
      where: { id: validated.roundId },
      select: {
        id: true,
        name: true,
        roundNumber: true,
        raceDate: true,
        timezone: true,
        status: true,
        locationText: true,
        notes: true,
        seasonId: true,
        leagueId: true,
        venue: { select: { id: true, name: true } },
        results: {
          select: {
            id: true,
            position: true,
            points: true,
            status: true,
            notes: true,
            team: { select: { id: true, name: true } },
            player: { select: { id: true, name: true, carNumber: true } },
          },
          // Classified finishers in order, then everyone who did not finish.
          orderBy: [{ position: { sort: "asc", nulls: "last" } }, { id: "asc" }],
        },
      },
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

    return {
      success: true,
      data: {
        id: round.id,
        name: round.name,
        roundNumber: round.roundNumber,
        raceDate: toDateOnlyString(round.raceDate),
        timezone: round.timezone,
        status: round.status,
        locationText: round.locationText,
        notes: round.notes,
        venue: round.venue,
        seasonId: round.seasonId,
        resultCount: round.results.length,
        results: round.results.map((result) => ({
          id: result.id,
          position: result.position,
          points: result.points.toNumber(),
          status: result.status,
          notes: result.notes,
          team: result.team,
          driver: result.player
            ? {
                id: result.player.id,
                name: result.player.name,
                carNumber: result.player.carNumber,
              }
            : null,
        })),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error loading round results:", error);
    return { success: false, error: "Failed to load results. Please try again." };
  }
}

/**
 * Championship standings, summed from results at read time.
 *
 * Ties break on countback — most wins, then most podiums — which is the
 * convention in circuit racing.
 */
export async function getChampionshipStandings(
  input: GetChampionshipStandingsInput
): Promise<ActionResult<ChampionshipStandings>> {
  try {
    const validated = getChampionshipStandingsSchema.parse(input);
    const userId = await requireUserId();

    const membership = await prisma.leagueUser.count({
      where: { userId, leagueId: validated.leagueId },
    });
    if (membership === 0) {
      return { success: false, error: "Unauthorized: You are not part of this association" };
    }

    const results = await prisma.raceResult.findMany({
      where: {
        round: {
          leagueId: validated.leagueId,
          ...(validated.seasonId ? { seasonId: validated.seasonId } : {}),
        },
      },
      select: {
        points: true,
        position: true,
        team: { select: { id: true, name: true } },
        player: { select: { id: true, name: true } },
      },
    });

    const byDriver = validated.groupBy === "DRIVER";
    const rows = new Map<string, StandingsRow>();

    for (const result of results) {
      // Driver standings can only rank results actually attributed to a driver.
      if (byDriver && !result.player) continue;

      const key = byDriver ? result.player!.id : result.team.id;
      const row =
        rows.get(key) ??
        {
          key,
          name: byDriver ? result.player!.name : result.team.name,
          teamName: byDriver ? result.team.name : null,
          points: 0,
          rounds: 0,
          wins: 0,
          podiums: 0,
        };

      row.points += result.points.toNumber();
      row.rounds += 1;
      if (result.position === 1) row.wins += 1;
      if (result.position != null && result.position <= 3) row.podiums += 1;

      rows.set(key, row);
    }

    const ordered = [...rows.values()].sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.podiums - a.podiums ||
        a.name.localeCompare(b.name)
    );

    return {
      success: true,
      data: { groupBy: validated.groupBy, rows: ordered },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error computing standings:", error);
    return { success: false, error: "Failed to load standings. Please try again." };
  }
}
