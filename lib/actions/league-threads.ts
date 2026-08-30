"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { isTeamAdmin, requireUserId } from "@/lib/auth/session";
import {
  createInstructionSchema,
  createTeamRequestSchema,
  postThreadEntrySchema,
  threadIdSchema,
  getLeagueThreadsSchema,
  getTeamThreadsSchema,
  type CreateInstructionInput,
  type CreateTeamRequestInput,
  type PostThreadEntryInput,
  type ThreadIdInput,
  type GetLeagueThreadsInput,
  type GetTeamThreadsInput,
} from "@/lib/utils/validation";
import { sendLeagueThreadNotifications } from "@/lib/email/templates";
import { checkRateLimit, rateLimitMessage, RATE_LIMITS } from "@/lib/utils/durable-rate-limit";
import type { LeagueThreadView, LeagueThreadSummary } from "@/types/league-threads";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

/**
 * Two-way operational threads between an association and its teams.
 *
 * `LeagueMessage` is a one-way broadcast: it records delivery but has no reply
 * path and no notion of an outstanding response. This module covers the work
 * that expects an answer — an admin issuing an instruction and tracking which
 * teams have replied, and a team raising a request the admin must handle.
 *
 * The mechanics follow `lib/actions/game-proposals.ts`: replies are appended,
 * never mutated; status transitions run through a guarded `updateMany` so two
 * concurrent actors cannot both resolve the same thread; and notifications are
 * fire-and-forget so a mail failure never rolls back a recorded decision.
 */

const UNAUTHORIZED_ADMIN = "Unauthorized: Only association admins can perform this action";
const UNAUTHORIZED_TEAM = "Unauthorized: Only team admins can perform this action";

function revalidateThreadPaths(leagueId: string, threadId?: string) {
  revalidatePath(`/league/${leagueId}/threads`);
  if (threadId) {
    revalidatePath(`/league/${leagueId}/threads/${threadId}`);
  }
  revalidatePath("/threads");
}

/** League admins are the association's operational authority for threads. */
async function isLeagueAdminUser(userId: string, leagueId: string): Promise<boolean> {
  const count = await prisma.leagueUser.count({
    where: { userId, leagueId, role: "LEAGUE_ADMIN", league: { isActive: true } },
  });
  return count > 0;
}

/**
 * Resolve an instruction's audience to concrete teams.
 *
 * Mirrors `getMessageRecipients` in lib/actions/communication.ts, but stops at
 * teams: an instruction is answered once per team, not once per member.
 */
async function resolveTargetTeamIds(
  leagueId: string,
  targeting: CreateInstructionInput["targeting"]
): Promise<string[]> {
  if (targeting.entireLeague) {
    const teams = await prisma.team.findMany({
      where: { leagueId, isActive: true },
      select: { id: true },
    });
    return teams.map((team) => team.id);
  }

  const teams = await prisma.team.findMany({
    where: {
      leagueId,
      isActive: true,
      OR: [
        ...(targeting.divisionIds?.length
          ? [{ divisionId: { in: targeting.divisionIds } }]
          : []),
        ...(targeting.teamIds?.length ? [{ id: { in: targeting.teamIds } }] : []),
      ],
    },
    select: { id: true },
  });

  return teams.map((team) => team.id);
}

/**
 * Issue an instruction to one, some, or all teams in the association.
 *
 * Creates the thread plus one status row per targeted team. When
 * `requiresResponse` is false the rows are written already ACKNOWLEDGED, so an
 * informational notice never shows as outstanding work.
 */
export async function createInstruction(
  input: CreateInstructionInput
): Promise<ActionResult<{ threadId: string; targetedTeamCount: number }>> {
  try {
    const validated = createInstructionSchema.parse(input);
    const userId = await requireUserId();

    const rl = await checkRateLimit(
      `message:user:${userId}`,
      RATE_LIMITS.MESSAGE_SEND_PER_USER
    );
    if (!rl.allowed) {
      return { success: false, error: rateLimitMessage(rl.retryAfterSec) };
    }

    if (!(await isLeagueAdminUser(userId, validated.leagueId))) {
      return { success: false, error: UNAUTHORIZED_ADMIN };
    }

    const teamIds = await resolveTargetTeamIds(validated.leagueId, validated.targeting);
    if (teamIds.length === 0) {
      return {
        success: false,
        error: "No teams matched the selected recipients",
      };
    }

    const respondedAt = validated.requiresResponse ? null : new Date();

    const thread = await prisma.$transaction(async (tx) => {
      const created = await tx.leagueThread.create({
        data: {
          kind: "INSTRUCTION",
          subject: validated.subject,
          body: validated.body,
          priority: validated.priority,
          requiresResponse: validated.requiresResponse,
          leagueId: validated.leagueId,
          createdById: userId,
        },
      });

      await tx.leagueThreadTeamStatus.createMany({
        data: teamIds.map((teamId) => ({
          threadId: created.id,
          teamId,
          status: validated.requiresResponse
            ? ("PENDING" as const)
            : ("ACKNOWLEDGED" as const),
          respondedAt,
        })),
      });

      return created;
    });

    // Fire-and-forget: a mail failure must never undo a recorded instruction.
    sendLeagueThreadNotifications(thread.id, "instruction_issued").catch((error) => {
      console.error("Failed to send instruction notifications:", error);
    });

    revalidateThreadPaths(validated.leagueId, thread.id);

    return {
      success: true,
      data: { threadId: thread.id, targetedTeamCount: teamIds.length },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error creating instruction:", error);
    return { success: false, error: "Failed to issue the instruction. Please try again." };
  }
}

/**
 * Raise a request or update from a team to the association.
 *
 * There is exactly one team involved, so no per-team status rows are written —
 * `originTeamId` carries the relationship and the thread's own status tracks
 * whether the admin has dealt with it.
 */
export async function createTeamRequest(
  input: CreateTeamRequestInput
): Promise<ActionResult<{ threadId: string }>> {
  try {
    const validated = createTeamRequestSchema.parse(input);
    const userId = await requireUserId();

    const rl = await checkRateLimit(
      `message:user:${userId}`,
      RATE_LIMITS.MESSAGE_SEND_PER_USER
    );
    if (!rl.allowed) {
      return { success: false, error: rateLimitMessage(rl.retryAfterSec) };
    }

    if (!(await isTeamAdmin(userId, validated.teamId))) {
      return { success: false, error: UNAUTHORIZED_TEAM };
    }

    // The team must actually belong to the association it is writing to.
    const team = await prisma.team.findFirst({
      where: { id: validated.teamId, leagueId: validated.leagueId, isActive: true },
      select: { id: true },
    });
    if (!team) {
      return { success: false, error: "This team does not belong to that association" };
    }

    const thread = await prisma.leagueThread.create({
      data: {
        kind: "TEAM_REQUEST",
        subject: validated.subject,
        body: validated.body,
        priority: validated.priority,
        // The admin owes the answer here, so there is no per-team response to track.
        requiresResponse: false,
        leagueId: validated.leagueId,
        originTeamId: validated.teamId,
        createdById: userId,
      },
    });

    sendLeagueThreadNotifications(thread.id, "request_raised").catch((error) => {
      console.error("Failed to send team request notifications:", error);
    });

    revalidateThreadPaths(validated.leagueId, thread.id);

    return { success: true, data: { threadId: thread.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error creating team request:", error);
    return { success: false, error: "Failed to raise the request. Please try again." };
  }
}

/**
 * Append a reply from either side.
 *
 * When a targeted team replies to an instruction, the same call flips that
 * team's status PENDING -> ACKNOWLEDGED through a guarded `updateMany`: if a
 * concurrent reply already claimed it, the update matches zero rows and the
 * reply still lands, rather than double-counting the response.
 */
export async function postThreadEntry(
  input: PostThreadEntryInput
): Promise<ActionResult<{ entryId: string }>> {
  try {
    const validated = postThreadEntrySchema.parse(input);
    const userId = await requireUserId();

    const thread = await prisma.leagueThread.findUnique({
      where: { id: validated.threadId },
      select: {
        id: true,
        kind: true,
        status: true,
        leagueId: true,
        originTeamId: true,
        requiresResponse: true,
      },
    });

    if (!thread) {
      return { success: false, error: "Thread not found" };
    }

    if (thread.status !== "OPEN") {
      return { success: false, error: "This thread is no longer open" };
    }

    const actingAsTeam = validated.actorTeamId ?? null;

    if (actingAsTeam) {
      if (!(await isTeamAdmin(userId, actingAsTeam))) {
        return { success: false, error: UNAUTHORIZED_TEAM };
      }

      // A team may only speak on a thread it owns or was targeted by.
      const participates =
        thread.originTeamId === actingAsTeam ||
        (await prisma.leagueThreadTeamStatus.count({
          where: { threadId: thread.id, teamId: actingAsTeam },
        })) > 0;

      if (!participates) {
        return { success: false, error: "This team is not part of that thread" };
      }
    } else if (!(await isLeagueAdminUser(userId, thread.leagueId))) {
      return { success: false, error: UNAUTHORIZED_ADMIN };
    }

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.leagueThreadEntry.create({
        data: {
          threadId: thread.id,
          kind: "MESSAGE",
          body: validated.body,
          actorTeamId: actingAsTeam,
          actorUserId: userId,
        },
      });

      // Guarded transition: only the first reply from this team claims the
      // response, exactly as acceptGameProposal guards on status: PENDING.
      if (actingAsTeam && thread.kind === "INSTRUCTION" && thread.requiresResponse) {
        await tx.leagueThreadTeamStatus.updateMany({
          where: { threadId: thread.id, teamId: actingAsTeam, status: "PENDING" },
          data: { status: "ACKNOWLEDGED", respondedAt: new Date() },
        });
      }

      return created;
    });

    sendLeagueThreadNotifications(
      thread.id,
      actingAsTeam ? "team_replied" : "admin_replied"
    ).catch((error) => {
      console.error("Failed to send thread reply notifications:", error);
    });

    revalidateThreadPaths(thread.leagueId, thread.id);

    return { success: true, data: { entryId: entry.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error posting thread entry:", error);
    return { success: false, error: "Failed to post the reply. Please try again." };
  }
}

/** Shared guarded OPEN -> terminal transition for resolve and close. */
async function transitionThread(
  input: ThreadIdInput,
  nextStatus: "RESOLVED" | "CLOSED",
  entryKind: "RESOLVE" | "CLOSE"
): Promise<ActionResult<{ threadId: string }>> {
  const validated = threadIdSchema.parse(input);
  const userId = await requireUserId();

  const thread = await prisma.leagueThread.findUnique({
    where: { id: validated.threadId },
    select: { id: true, leagueId: true },
  });

  if (!thread) {
    return { success: false, error: "Thread not found" };
  }

  if (!(await isLeagueAdminUser(userId, thread.leagueId))) {
    return { success: false, error: UNAUTHORIZED_ADMIN };
  }

  const claimed = await prisma.$transaction(async (tx) => {
    // First decision wins: a zero-row update means someone else already
    // resolved or closed this thread, so we must not append a second entry.
    const { count } = await tx.leagueThread.updateMany({
      where: { id: thread.id, status: "OPEN" },
      data: {
        status: nextStatus,
        resolvedAt: new Date(),
        resolvedById: userId,
      },
    });

    if (count === 0) return false;

    await tx.leagueThreadEntry.create({
      data: {
        threadId: thread.id,
        kind: entryKind,
        actorUserId: userId,
      },
    });

    return true;
  });

  if (!claimed) {
    return { success: false, error: "This thread is no longer open" };
  }

  sendLeagueThreadNotifications(
    thread.id,
    nextStatus === "RESOLVED" ? "resolved" : "closed"
  ).catch((error) => {
    console.error("Failed to send thread transition notifications:", error);
  });

  revalidateThreadPaths(thread.leagueId, thread.id);

  return { success: true, data: { threadId: thread.id } };
}

/** Mark a thread resolved — the work it describes is done. */
export async function resolveThread(
  input: ThreadIdInput
): Promise<ActionResult<{ threadId: string }>> {
  try {
    return await transitionThread(input, "RESOLVED", "RESOLVE");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error resolving thread:", error);
    return { success: false, error: "Failed to resolve the thread. Please try again." };
  }
}

/** Close a thread without resolving it (superseded, withdrawn, obsolete). */
export async function closeThread(
  input: ThreadIdInput
): Promise<ActionResult<{ threadId: string }>> {
  try {
    return await transitionThread(input, "CLOSED", "CLOSE");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error closing thread:", error);
    return { success: false, error: "Failed to close the thread. Please try again." };
  }
}

const threadInclude = {
  originTeam: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  targets: {
    select: {
      id: true,
      status: true,
      respondedAt: true,
      team: { select: { id: true, name: true } },
    },
  },
  entries: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      kind: true,
      body: true,
      createdAt: true,
      actorTeam: { select: { id: true, name: true } },
      actorUser: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

type ThreadRow = {
  id: string;
  kind: "INSTRUCTION" | "TEAM_REQUEST";
  subject: string;
  body: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "OPEN" | "RESOLVED" | "CLOSED";
  requiresResponse: boolean;
  createdAt: Date;
  resolvedAt: Date | null;
  originTeam: { id: string; name: string } | null;
  createdBy: { id: string; name: string | null; email: string };
  targets: Array<{
    id: string;
    status: "PENDING" | "ACKNOWLEDGED";
    respondedAt: Date | null;
    team: { id: string; name: string };
  }>;
  entries: Array<{
    id: string;
    kind: "MESSAGE" | "RESOLVE" | "CLOSE" | "REOPEN";
    body: string | null;
    createdAt: Date;
    actorTeam: { id: string; name: string } | null;
    actorUser: { id: string; name: string | null; email: string };
  }>;
};

/**
 * Shape a row for the client. Dates are serialized because these cross the
 * server/client boundary into the thread UI.
 */
function toThreadView(row: ThreadRow, viewerTeamId: string | null): LeagueThreadView {
  const acknowledged = row.targets.filter((t) => t.status === "ACKNOWLEDGED").length;
  const viewerTarget = viewerTeamId
    ? row.targets.find((t) => t.team.id === viewerTeamId) ?? null
    : null;

  return {
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    body: row.body,
    priority: row.priority,
    status: row.status,
    requiresResponse: row.requiresResponse,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    originTeam: row.originTeam,
    createdBy: {
      id: row.createdBy.id,
      name: row.createdBy.name ?? row.createdBy.email,
    },
    targets: row.targets.map((target) => ({
      id: target.id,
      status: target.status,
      respondedAt: target.respondedAt?.toISOString() ?? null,
      team: target.team,
    })),
    respondedCount: acknowledged,
    targetCount: row.targets.length,
    // What this viewer still owes: only outstanding for a targeted team on an
    // open instruction that asked for a response.
    viewerResponsePending:
      row.status === "OPEN" &&
      row.requiresResponse &&
      viewerTarget?.status === "PENDING",
    entries: row.entries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      body: entry.body,
      createdAt: entry.createdAt.toISOString(),
      actorTeam: entry.actorTeam,
      actorName: entry.actorUser.name ?? entry.actorUser.email,
    })),
  };
}

/** Association-side inbox: every thread in the league, with response rollups. */
export async function getLeagueThreads(
  input: GetLeagueThreadsInput
): Promise<ActionResult<LeagueThreadSummary>> {
  try {
    const validated = getLeagueThreadsSchema.parse(input);
    const userId = await requireUserId();

    if (!(await isLeagueAdminUser(userId, validated.leagueId))) {
      return { success: false, error: UNAUTHORIZED_ADMIN };
    }

    const rows = await prisma.leagueThread.findMany({
      where: {
        leagueId: validated.leagueId,
        ...(validated.kind ? { kind: validated.kind } : {}),
        ...(validated.status ? { status: validated.status } : {}),
      },
      include: threadInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return {
      success: true,
      data: { threads: rows.map((row) => toThreadView(row, null)), viewerTeamId: null },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error loading league threads:", error);
    return { success: false, error: "Failed to load threads. Please try again." };
  }
}

/**
 * Team-side inbox: instructions this team was targeted by, plus requests it
 * raised itself.
 */
export async function getTeamThreads(
  input: GetTeamThreadsInput
): Promise<ActionResult<LeagueThreadSummary>> {
  try {
    const validated = getTeamThreadsSchema.parse(input);
    const userId = await requireUserId();

    const membership = await prisma.teamMember.findFirst({
      where: { userId, teamId: validated.teamId },
      select: { id: true },
    });
    if (!membership) {
      return { success: false, error: "Unauthorized: You are not a member of this team" };
    }

    const rows = await prisma.leagueThread.findMany({
      where: {
        OR: [
          { originTeamId: validated.teamId },
          { targets: { some: { teamId: validated.teamId } } },
        ],
      },
      include: threadInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return {
      success: true,
      data: {
        threads: rows.map((row) => toThreadView(row, validated.teamId)),
        viewerTeamId: validated.teamId,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error loading team threads:", error);
    return { success: false, error: "Failed to load threads. Please try again." };
  }
}
