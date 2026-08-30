"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Capability, hasCapability } from "@/lib/auth/capabilities";
import { rethrowIfNextRedirectError } from "@/lib/utils/next-errors";

/**
 * The waiver for one race weekend.
 *
 * Versioned wording with a per-person acceptance record, following the shape of
 * `ParentalConsent`: the acceptance outlives the account that made it, and the
 * exact text agreed to is recoverable later. Editing published wording bumps
 * the version, which invalidates prior acceptances *for gating purposes* while
 * leaving the old records intact — an edit must not silently re-scope what
 * somebody already agreed to.
 *
 * One waiver per round, so the gate is unambiguous.
 */

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

const cuid = z.string().cuid("Invalid ID format");

const upsertSchema = z.object({
  roundId: cuid,
  title: z.string().min(1, "A title is required").max(200),
  body: z.string().min(1, "The waiver text is required").max(20000),
  publish: z.boolean().default(false),
});

export type UpsertRoundWaiverInput = z.input<typeof upsertSchema>;

async function canManageRound(userId: string, leagueId: string, roundId: string) {
  return hasCapability({
    userId,
    leagueId,
    capability: Capability.MANAGE_SCHEDULE,
    roundId,
  });
}

export async function upsertRoundWaiver(
  input: UpsertRoundWaiverInput,
): Promise<ActionResult<{ id: string; version: number }>> {
  try {
    const userId = await requireUserId();
    const validated = upsertSchema.parse(input);

    const round = await prisma.raceRound.findUnique({
      where: { id: validated.roundId },
      select: { id: true, leagueId: true },
    });
    if (!round) {
      return { success: false, error: "Round not found" };
    }

    if (!(await canManageRound(userId, round.leagueId, round.id))) {
      return {
        success: false,
        error: "You do not have permission to publish a waiver for this weekend.",
      };
    }

    const existing = await prisma.roundWaiver.findUnique({
      where: { roundId: round.id },
      select: { id: true, version: true, body: true, title: true, publishedAt: true },
    });

    if (!existing) {
      const created = await prisma.roundWaiver.create({
        data: {
          roundId: round.id,
          title: validated.title,
          body: validated.body,
          publishedAt: validated.publish ? new Date() : null,
          createdById: userId,
        },
        select: { id: true, version: true },
      });
      revalidatePath(`/league/${round.leagueId}/rounds/${round.id}`);
      return { success: true, data: created };
    }

    // Only a change to *published* wording bumps the version. Editing a draft
    // nobody has been shown does not invalidate acceptances, because there are
    // none, and bumping there would make the version number meaningless.
    const wordingChanged =
      existing.body !== validated.body || existing.title !== validated.title;
    const bump = Boolean(existing.publishedAt) && wordingChanged;

    const updated = await prisma.roundWaiver.update({
      where: { id: existing.id },
      data: {
        title: validated.title,
        body: validated.body,
        ...(bump ? { version: { increment: 1 } } : {}),
        ...(validated.publish && !existing.publishedAt ? { publishedAt: new Date() } : {}),
      },
      select: { id: true, version: true },
    });

    revalidatePath(`/league/${round.leagueId}/rounds/${round.id}`);
    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input.", details: error.issues };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error saving round waiver:", error);
    return { success: false, error: "Failed to save the waiver." };
  }
}

/**
 * Accept the published waiver for a round.
 *
 * The signer's name and address are denormalized onto the acceptance so the
 * record still says who agreed after the account is gone — the same retention
 * reasoning as `ParentalConsent`.
 */
export async function acceptRoundWaiver(
  roundId: string,
): Promise<ActionResult<{ waiverVersion: number }>> {
  try {
    const userId = await requireUserId();
    const validated = cuid.parse(roundId);

    const waiver = await prisma.roundWaiver.findUnique({
      where: { roundId: validated },
      select: {
        id: true,
        version: true,
        publishedAt: true,
        round: { select: { id: true, leagueId: true } },
      },
    });
    if (!waiver || !waiver.publishedAt) {
      return { success: false, error: "There is no published waiver for this weekend." };
    }

    const membership = await prisma.leagueUser.count({
      where: { userId, leagueId: waiver.round.leagueId },
    });
    if (membership === 0) {
      return { success: false, error: "You are not part of this association." };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Best-effort, and never trusted for anything but the record: a proxy can
    // rewrite it. It is captured for the same evidentiary reason as the
    // consent method on ParentalConsent.
    let ipAddress: string | null = null;
    try {
      const headerList = await headers();
      ipAddress =
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headerList.get("x-real-ip");
    } catch {
      ipAddress = null;
    }

    await prisma.roundWaiverAcceptance.upsert({
      where: {
        waiverId_userId_waiverVersion: {
          waiverId: waiver.id,
          userId,
          waiverVersion: waiver.version,
        },
      },
      create: {
        waiverId: waiver.id,
        userId,
        waiverVersion: waiver.version,
        ipAddress,
        acceptedByName: user?.name ?? null,
        acceptedByEmail: user?.email ?? null,
      },
      // Accepting twice is not a second agreement; keep the first timestamp.
      update: {},
    });

    revalidatePath(`/league/${waiver.round.leagueId}/rounds/${waiver.round.id}`);
    revalidatePath(`/league/${waiver.round.leagueId}/workforce`);
    return { success: true, data: { waiverVersion: waiver.version } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid round ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error accepting round waiver:", error);
    return { success: false, error: "Failed to record your acceptance." };
  }
}

export interface RoundWaiverView {
  id: string;
  title: string;
  body: string;
  version: number;
  published: boolean;
  /** Whether the viewer has accepted the *current* version. */
  acceptedByViewer: boolean;
  /** Organizers only: how many people have accepted the current version. */
  acceptanceCount: number | null;
}

export async function getRoundWaiver(
  roundId: string,
): Promise<ActionResult<RoundWaiverView | null>> {
  try {
    const userId = await requireUserId();
    const validated = cuid.parse(roundId);

    const round = await prisma.raceRound.findUnique({
      where: { id: validated },
      select: { id: true, leagueId: true },
    });
    if (!round) {
      return { success: false, error: "Round not found" };
    }

    const membership = await prisma.leagueUser.count({
      where: { userId, leagueId: round.leagueId },
    });
    if (membership === 0) {
      return { success: false, error: "You are not part of this association." };
    }

    const waiver = await prisma.roundWaiver.findUnique({
      where: { roundId: round.id },
      select: {
        id: true,
        title: true,
        body: true,
        version: true,
        publishedAt: true,
      },
    });
    if (!waiver) {
      return { success: true, data: null };
    }

    const isOrganizer = await canManageRound(userId, round.leagueId, round.id);

    const [accepted, acceptanceCount] = await Promise.all([
      prisma.roundWaiverAcceptance.count({
        where: { waiverId: waiver.id, userId, waiverVersion: waiver.version },
      }),
      isOrganizer
        ? prisma.roundWaiverAcceptance.count({
            where: { waiverId: waiver.id, waiverVersion: waiver.version },
          })
        : Promise.resolve(null),
    ]);

    return {
      success: true,
      data: {
        id: waiver.id,
        title: waiver.title,
        body: waiver.body,
        version: waiver.version,
        published: waiver.publishedAt !== null,
        acceptedByViewer: accepted > 0,
        acceptanceCount,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid round ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error loading round waiver:", error);
    return { success: false, error: "Failed to load the waiver." };
  }
}
