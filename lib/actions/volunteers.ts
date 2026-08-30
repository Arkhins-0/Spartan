"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import type {
  AssociationRoleScopeType,
  VolunteerCredentialKind,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Capability, hasCapability, loadActiveGrants } from "@/lib/auth/capabilities";
import { ROLE_CAPABILITY_MATRIX } from "@/lib/auth/capability-matrix";
import { rethrowIfNextRedirectError } from "@/lib/utils/next-errors";
import { scopeBelongsToLeague } from "@/lib/services/association-roles";

/**
 * Volunteer needs and assignments (feature 007 / User Story 3).
 *
 * Organizing is gated on MANAGE_VOLUNTEERS at the need's own scope, so a
 * team-scoped volunteer coordinator can staff their team's needs and nothing
 * else. Volunteers themselves need no capability: they act on assignments
 * addressed to them, which is checked by ownership rather than by role.
 */

/** Rolls the acceptance transaction back with a reason the caller can report. */
class VolunteerClaimError extends Error {
  constructor(
    readonly reason:
      | "FULL"
      | "ALREADY_ANSWERED"
      | "ALREADY_HOLDING"
      | "NO_WAITLIST",
  ) {
    super(reason);
    this.name = "VolunteerClaimError";
  }
}

/** Statuses that mean the person still holds, or held, a place on this need. */
const LIVE_ASSIGNMENT_STATUSES = [
  "INVITED",
  "ACCEPTED",
  "WAITLISTED",
  "COMPLETED",
] as const;

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

const cuid = z.string().cuid("Invalid ID format");

const createNeedSchema = z
  .object({
    leagueId: cuid,
    roleLabel: z.string().min(1, "A role is required").max(120),
    description: z.string().max(2000).optional(),
    capacity: z.number().int().min(1, "Capacity must be at least 1").max(500),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    timezone: z.string().min(1).max(64),
    divisionId: cuid.optional(),
    teamId: cuid.optional(),
    eventId: cuid.optional(),
    signupEventId: cuid.optional(),
    roundId: cuid.optional(),
    sessionId: cuid.optional(),
    signupMode: z.enum(["INVITE_ONLY", "OPEN_SIGNUP"]).default("INVITE_ONLY"),
    waitlistEnabled: z.boolean().default(true),
    postLabel: z.string().max(120).optional(),
    briefingAt: z.coerce.date().optional(),
    requiredCredentialKind: z
      .enum(["MARSHAL_GRADE", "LICENCE", "FIRST_AID", "SCRUTINEER", "TRAINING"])
      .optional(),
    requiredCredentialLabel: z.string().max(120).optional(),
  })
  .refine((value) => value.endAt > value.startAt, {
    message: "The end time must be after the start time",
    path: ["endAt"],
  })
  // A session shift has to say which weekend it belongs to; the board groups by
  // round, and the database CHECK would reject the row anyway.
  .refine((value) => !value.sessionId || Boolean(value.roundId), {
    message: "A session shift must also name its round",
    path: ["roundId"],
  })
  .refine((value) => !value.briefingAt || value.briefingAt <= value.endAt, {
    message: "The briefing must be at or before the end of the shift",
    path: ["briefingAt"],
  });

export type CreateVolunteerNeedInput = z.input<typeof createNeedSchema>;

/**
 * Can this user organize volunteers for the given need scope?
 *
 * The scope of the *need* is what is checked, not the association as a whole:
 * a team-scoped coordinator organizing a team need passes, the same coordinator
 * reaching for an association-wide need does not.
 */
async function canOrganize(
  userId: string,
  leagueId: string,
  scope: {
    teamId?: string | null;
    divisionId?: string | null;
    eventId?: string | null;
    signupEventId?: string | null;
    roundId?: string | null;
  },
): Promise<boolean> {
  return hasCapability({
    userId,
    leagueId,
    capability: Capability.MANAGE_VOLUNTEERS,
    teamId: scope.teamId ?? undefined,
    divisionId: scope.divisionId ?? undefined,
    eventId: scope.eventId ?? undefined,
    signupEventId: scope.signupEventId ?? undefined,
    roundId: scope.roundId ?? undefined,
  });
}

export async function createVolunteerNeed(
  input: CreateVolunteerNeedInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const validated = createNeedSchema.parse(input);

    if (!(await canOrganize(userId, validated.leagueId, validated))) {
      return { success: false, error: "You do not have permission to organize volunteers." };
    }

    // Only teamId has a compound tenant foreign key; the other scope columns
    // would happily reference another association's division, event, or signup
    // event. Without this a scoped coordinator could attach an association-owned
    // need to a foreign tenant's activity.
    const tenancyChecks: Array<[AssociationRoleScopeType, string | undefined]> = [
      ["DIVISION", validated.divisionId],
      ["TEAM", validated.teamId],
      ["EVENT", validated.eventId],
      ["SIGNUP_EVENT", validated.signupEventId],
      ["RACE_ROUND", validated.roundId],
    ];
    for (const [scopeType, scopeId] of tenancyChecks) {
      if (!scopeId) continue;
      if (!(await scopeBelongsToLeague(validated.leagueId, scopeType, scopeId))) {
        return { success: false, error: "That scope does not belong to this association." };
      }
    }

    // `scopeBelongsToLeague` proves the round is ours; the session still has to
    // belong to that round, or a coordinator scoped to one weekend could hang a
    // shift off another weekend that happens to share the association.
    if (validated.sessionId) {
      const session = await prisma.raceSession.findFirst({
        where: { id: validated.sessionId, roundId: validated.roundId },
        select: { id: true },
      });
      if (!session) {
        return { success: false, error: "That session does not belong to this round." };
      }
    }

    const need = await prisma.volunteerNeed.create({
      data: {
        leagueId: validated.leagueId,
        roleLabel: validated.roleLabel,
        description: validated.description ?? null,
        capacity: validated.capacity,
        startAt: validated.startAt,
        endAt: validated.endAt,
        timezone: validated.timezone,
        divisionId: validated.divisionId ?? null,
        teamId: validated.teamId ?? null,
        eventId: validated.eventId ?? null,
        signupEventId: validated.signupEventId ?? null,
        roundId: validated.roundId ?? null,
        sessionId: validated.sessionId ?? null,
        signupMode: validated.signupMode,
        waitlistEnabled: validated.waitlistEnabled,
        postLabel: validated.postLabel ?? null,
        briefingAt: validated.briefingAt ?? null,
        requiredCredentialKind: validated.requiredCredentialKind ?? null,
        requiredCredentialLabel: validated.requiredCredentialLabel ?? null,
        createdById: userId,
      },
      select: { id: true },
    });

    revalidatePath(`/league/${validated.leagueId}/workforce`);
    return { success: true, data: { id: need.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input.", details: error.issues };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error creating volunteer need:", error);
    return { success: false, error: "Failed to create the volunteer need." };
  }
}

const updateNeedSchema = z.object({
  needId: cuid,
  roleLabel: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  capacity: z.number().int().min(1).max(500).optional(),
  status: z.enum(["OPEN", "CLOSED", "COMPLETED"]).optional(),
  signupMode: z.enum(["INVITE_ONLY", "OPEN_SIGNUP"]).optional(),
  waitlistEnabled: z.boolean().optional(),
  postLabel: z.string().max(120).nullable().optional(),
});

export async function updateVolunteerNeed(
  input: z.infer<typeof updateNeedSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const validated = updateNeedSchema.parse(input);

    const need = await prisma.volunteerNeed.findUnique({
      where: { id: validated.needId },
      select: {
        id: true,
        leagueId: true,
        teamId: true,
        divisionId: true,
        eventId: true,
        signupEventId: true,
        roundId: true,
        acceptedCount: true,
        status: true,
      },
    });
    if (!need) return { success: false, error: "That volunteer need could not be found." };

    if (!(await canOrganize(userId, need.leagueId, need))) {
      return { success: false, error: "You do not have permission to organize volunteers." };
    }

    // Capacity may not be cut below what has already been accepted: the people
    // holding those slots were told they had them, and the database CHECK would
    // reject it anyway.
    if (validated.capacity !== undefined && validated.capacity < need.acceptedCount) {
      return {
        success: false,
        error: `Capacity cannot be lower than the ${need.acceptedCount} volunteer(s) already accepted.`,
      };
    }

    await prisma.volunteerNeed.update({
      where: { id: need.id },
      data: {
        ...(validated.roleLabel !== undefined ? { roleLabel: validated.roleLabel } : {}),
        ...(validated.description !== undefined ? { description: validated.description } : {}),
        ...(validated.capacity !== undefined ? { capacity: validated.capacity } : {}),
        ...(validated.status !== undefined ? { status: validated.status } : {}),
        ...(validated.signupMode !== undefined ? { signupMode: validated.signupMode } : {}),
        ...(validated.waitlistEnabled !== undefined
          ? { waitlistEnabled: validated.waitlistEnabled }
          : {}),
        ...(validated.postLabel !== undefined ? { postLabel: validated.postLabel } : {}),
        ...(validated.status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });

    revalidatePath(`/league/${need.leagueId}/workforce`);
    return { success: true, data: { id: need.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input.", details: error.issues };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error updating volunteer need:", error);
    return { success: false, error: "Failed to update the volunteer need." };
  }
}

export async function cancelVolunteerNeed(
  needId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const validated = cuid.parse(needId);

    const need = await prisma.volunteerNeed.findUnique({
      where: { id: validated },
      select: {
        id: true,
        leagueId: true,
        teamId: true,
        divisionId: true,
        eventId: true,
        signupEventId: true,
        roundId: true,
      },
    });
    if (!need) return { success: false, error: "That volunteer need could not be found." };

    if (!(await canOrganize(userId, need.leagueId, need))) {
      return { success: false, error: "You do not have permission to organize volunteers." };
    }

    // Cancelling the need cancels its live assignments too, so nobody is left
    // believing they are still expected to turn up.
    await prisma.$transaction([
      prisma.volunteerNeed.update({
        where: { id: need.id },
        data: { status: "CANCELED", canceledAt: new Date() },
      }),
      prisma.volunteerAssignment.updateMany({
        where: {
          needId: need.id,
          status: { in: ["INVITED", "ACCEPTED", "WAITLISTED"] },
        },
        data: { status: "CANCELED" },
      }),
    ]);

    revalidatePath(`/league/${need.leagueId}/workforce`);
    return { success: true, data: { id: need.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid volunteer need ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error cancelling volunteer need:", error);
    return { success: false, error: "Failed to cancel the volunteer need." };
  }
}

const assignSchema = z
  .object({
    needId: cuid,
    userId: cuid.optional(),
    invitedEmail: z.string().email().max(255).optional(),
  })
  .refine((v) => Boolean(v.userId) !== Boolean(v.invitedEmail), {
    message: "Provide either a user or an email address, not both",
  });

export async function assignVolunteer(
  input: z.infer<typeof assignSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actingUserId = await requireUserId();
    const validated = assignSchema.parse(input);

    const need = await prisma.volunteerNeed.findUnique({
      where: { id: validated.needId },
      select: {
        id: true,
        leagueId: true,
        teamId: true,
        divisionId: true,
        eventId: true,
        signupEventId: true,
        roundId: true,
        status: true,
        requiredCredentialKind: true,
        requiredCredentialLabel: true,
      },
    });
    if (!need) return { success: false, error: "That volunteer need could not be found." };
    if (need.status !== "OPEN") {
      return { success: false, error: "That volunteer need is no longer open." };
    }

    if (!(await canOrganize(actingUserId, need.leagueId, need))) {
      return { success: false, error: "You do not have permission to organize volunteers." };
    }

    // An assignment carrying only an email can never be answered: responding
    // requires the signed-in user to own the row, and nothing claims an email
    // assignment on signup. Resolve the address to an account, or say so
    // plainly rather than creating a permanently dead shift.
    let subjectUserId = validated.userId ?? null;
    if (!subjectUserId && validated.invitedEmail) {
      const existing = await prisma.user.findUnique({
        where: { email: validated.invitedEmail.toLowerCase() },
        select: { id: true },
      });
      if (!existing) {
        return {
          success: false,
          error:
            "That email address has no account yet. Invite them to the association first, then assign the shift.",
        };
      }
      subjectUserId = existing.id;
    }

    // An organizer may assign past a credential gate — pairing a trainee with
    // an experienced marshal is normal practice — but the exception is recorded
    // rather than silently allowed, so the day sheet can show who is covered.
    const credentialSatisfied =
      !subjectUserId ||
      (await holdsRequiredCredential(subjectUserId, need.leagueId, need));

    const assignment = await prisma.volunteerAssignment.create({
      data: {
        needId: need.id,
        userId: subjectUserId,
        assignedById: actingUserId,
        ...(credentialSatisfied
          ? {}
          : { credentialWaivedAt: new Date(), credentialWaivedById: actingUserId }),
      },
      select: { id: true },
    });

    revalidatePath(`/league/${need.leagueId}/workforce`);
    return { success: true, data: { id: assignment.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input.", details: error.issues };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error assigning volunteer:", error);
    return { success: false, error: "Failed to assign the volunteer." };
  }
}

const respondSchema = z.object({
  assignmentId: cuid,
  response: z.enum(["ACCEPTED", "DECLINED"]),
});

/**
 * A volunteer accepts or declines their own assignment.
 *
 * Acceptance claims a capacity slot atomically. The claim is a conditional
 * `updateMany` guarded on `acceptedCount < capacity`, evaluated by Postgres at
 * write time: two simultaneous acceptances of a one-slot need both issue the
 * same guarded update, the first matches one row, and the second matches zero
 * because the counter has already moved. ADR-0003 rules out
 * `SELECT ... FOR UPDATE`, and this needs no lock.
 *
 * The `acceptedCount <= capacity` CHECK on the table is the backstop if the
 * guard is ever wrong.
 */
export async function respondToVolunteerAssignment(
  input: z.infer<typeof respondSchema>,
): Promise<ActionResult<{ status: "ACCEPTED" | "DECLINED" }>> {
  try {
    const userId = await requireUserId();
    const validated = respondSchema.parse(input);

    const assignment = await prisma.volunteerAssignment.findUnique({
      where: { id: validated.assignmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        need: { select: { id: true, leagueId: true, capacity: true, status: true } },
      },
    });
    if (!assignment) {
      return { success: false, error: "That assignment could not be found." };
    }

    // Ownership, not capability: a volunteer answers only for themselves.
    if (assignment.userId !== userId) {
      return { success: false, error: "That assignment is not yours to answer." };
    }
    if (assignment.status !== "INVITED") {
      return { success: false, error: "That assignment has already been answered." };
    }
    if (assignment.need.status !== "OPEN") {
      return { success: false, error: "That volunteer need is no longer open." };
    }

    if (validated.response === "DECLINED") {
      await prisma.volunteerAssignment.update({
        where: { id: assignment.id },
        data: { status: "DECLINED", respondedAt: new Date() },
      });
      revalidatePath(`/league/${assignment.need.leagueId}/workforce`);
      return { success: true, data: { status: "DECLINED" } };
    }

    // Both writes commit together or neither does. Claiming the assignment
    // conditionally (still INVITED) is what stops two requests for the SAME
    // assignment from each incrementing a multi-slot need; the guarded
    // increment is what stops two different volunteers from taking one slot.
    // A compensating decrement cannot cover the first case, because both
    // callers would have already passed the status check.
    try {
      await prisma.$transaction(async (tx) => {
        const claimedAssignment = await tx.volunteerAssignment.updateMany({
          where: { id: assignment.id, status: "INVITED" },
          data: { status: "ACCEPTED", respondedAt: new Date() },
        });
        if (claimedAssignment.count === 0) {
          throw new VolunteerClaimError("ALREADY_ANSWERED");
        }

        const claimedSlot = await tx.volunteerNeed.updateMany({
          where: {
            id: assignment.need.id,
            status: "OPEN",
            acceptedCount: { lt: assignment.need.capacity },
          },
          data: { acceptedCount: { increment: 1 } },
        });
        if (claimedSlot.count === 0) {
          // Rolls the assignment transition back with it.
          throw new VolunteerClaimError("FULL");
        }
      });
    } catch (error) {
      if (error instanceof VolunteerClaimError) {
        return {
          success: false,
          error:
            error.reason === "FULL"
              ? "That volunteer need is already full."
              : "That assignment has already been answered.",
        };
      }
      throw error;
    }

    revalidatePath(`/league/${assignment.need.leagueId}/workforce`);
    return { success: true, data: { status: "ACCEPTED" } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input.", details: error.issues };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error responding to volunteer assignment:", error);
    return { success: false, error: "Failed to record your response." };
  }
}

/**
 * Does this person hold the qualification a shift asks for, unexpired?
 *
 * Matching is on kind, and on label too when the need names one — "Marshal
 * grade" is too broad a gate when the post actually needs a Post Chief. The
 * label comparison is case-insensitive because it is free text typed by two
 * different people.
 *
 * A credential with no expiry never lapses: plenty of qualifications do not.
 */
async function holdsRequiredCredential(
  userId: string,
  leagueId: string,
  need: {
    requiredCredentialKind: VolunteerCredentialKind | null;
    requiredCredentialLabel: string | null;
  },
  now = new Date(),
): Promise<boolean> {
  if (!need.requiredCredentialKind) return true;

  const count = await prisma.volunteerCredential.count({
    where: {
      leagueId,
      userId,
      kind: need.requiredCredentialKind,
      ...(need.requiredCredentialLabel
        ? { label: { equals: need.requiredCredentialLabel, mode: "insensitive" } }
        : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
  return count > 0;
}

/**
 * Has this person accepted the current waiver for the weekend a shift belongs
 * to? A shift with no round, or a round with no published waiver, gates nothing.
 *
 * The check is against the *current* version: republishing changed wording
 * bumps the version, and consent to the old text is not consent to the new.
 */
async function hasAcceptedRoundWaiver(
  userId: string,
  roundId: string | null,
): Promise<boolean> {
  if (!roundId) return true;

  const waiver = await prisma.roundWaiver.findUnique({
    where: { roundId },
    select: { id: true, version: true, publishedAt: true },
  });
  if (!waiver || !waiver.publishedAt) return true;

  const accepted = await prisma.roundWaiverAcceptance.count({
    where: { waiverId: waiver.id, userId, waiverVersion: waiver.version },
  });
  return accepted > 0;
}

/**
 * A volunteer claims an open shift for themselves.
 *
 * This is the marshal-post model: the need is published, and whoever wants the
 * post takes it. No capability is required — the need being OPEN_SIGNUP inside
 * an association the caller belongs to *is* the authorization.
 *
 * The slot claim reuses the concurrency pattern proven in
 * `respondToVolunteerAssignment`: a conditional `updateMany` guarded on
 * `acceptedCount < capacity`, evaluated by Postgres at write time. Two people
 * claiming the last slot both issue the same guarded update; the first matches
 * one row, the second matches zero and lands on the waitlist instead. ADR-0003
 * rules out `SELECT ... FOR UPDATE`, and this needs no lock.
 */
export async function claimVolunteerShift(
  needId: string,
): Promise<ActionResult<{ status: "ACCEPTED" | "WAITLISTED" }>> {
  try {
    const userId = await requireUserId();
    const validated = cuid.parse(needId);

    const need = await prisma.volunteerNeed.findUnique({
      where: { id: validated },
      select: {
        id: true,
        leagueId: true,
        capacity: true,
        status: true,
        signupMode: true,
        waitlistEnabled: true,
        roundId: true,
        requiredCredentialKind: true,
        requiredCredentialLabel: true,
      },
    });
    if (!need) {
      return { success: false, error: "That volunteer need could not be found." };
    }
    if (need.status !== "OPEN") {
      return { success: false, error: "That volunteer need is no longer open." };
    }
    if (need.signupMode !== "OPEN_SIGNUP") {
      return {
        success: false,
        error: "That shift is filled by invitation. Ask the coordinator to assign it to you.",
      };
    }

    // Association membership, not a capability: the shift is published to the
    // association, and a stranger should not be able to claim it.
    const membership = await prisma.leagueUser.count({
      where: { userId, leagueId: need.leagueId },
    });
    if (membership === 0) {
      return { success: false, error: "You are not part of this association." };
    }

    // Both gates refuse in plain language rather than failing silently: a
    // volunteer turned away needs to know what to go and do about it.
    if (!(await hasAcceptedRoundWaiver(userId, need.roundId))) {
      return {
        success: false,
        error: "Accept the waiver for this race weekend before signing up for a shift.",
      };
    }

    if (!(await holdsRequiredCredential(userId, need.leagueId, need))) {
      const wanted = need.requiredCredentialLabel
        ? `${need.requiredCredentialLabel}`
        : "the required qualification";
      return {
        success: false,
        error: `That post needs ${wanted}. Ask the coordinator to record yours, or to assign you alongside somebody who holds it.`,
      };
    }

    let outcome: "ACCEPTED" | "WAITLISTED" = "ACCEPTED";
    try {
      await prisma.$transaction(async (tx) => {
        const held = await tx.volunteerAssignment.count({
          where: {
            needId: need.id,
            userId,
            status: { in: [...LIVE_ASSIGNMENT_STATUSES] },
          },
        });
        if (held > 0) {
          throw new VolunteerClaimError("ALREADY_HOLDING");
        }

        const claimedSlot = await tx.volunteerNeed.updateMany({
          where: {
            id: need.id,
            status: "OPEN",
            acceptedCount: { lt: need.capacity },
          },
          data: { acceptedCount: { increment: 1 } },
        });

        if (claimedSlot.count === 0) {
          if (!need.waitlistEnabled) {
            throw new VolunteerClaimError("NO_WAITLIST");
          }
          outcome = "WAITLISTED";
        }

        await tx.volunteerAssignment.create({
          data: {
            needId: need.id,
            userId,
            status: outcome,
            source: "SELF_CLAIMED",
            // A self-claim is its own answer; there was never an invitation to
            // respond to.
            respondedAt: new Date(),
          },
        });
      });
    } catch (error) {
      if (error instanceof VolunteerClaimError) {
        return {
          success: false,
          error:
            error.reason === "ALREADY_HOLDING"
              ? "You are already signed up for that shift."
              : "That shift is full and is not taking a waiting list.",
        };
      }
      throw error;
    }

    revalidatePath(`/league/${need.leagueId}/workforce`);
    return { success: true, data: { status: outcome } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid volunteer need ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error claiming volunteer shift:", error);
    return { success: false, error: "Failed to sign you up. Please try again." };
  }
}

/**
 * A volunteer gives up a shift they hold, or leaves the waiting list.
 *
 * Releasing an accepted slot promotes the longest-waiting person in the same
 * transaction, so the freed capacity is never visible as unclaimed and cannot
 * be taken by a later arrival ahead of someone already waiting. Order is
 * arrival order (`createdAt`), which cannot drift the way a stored position
 * would.
 */
export async function releaseVolunteerShift(
  assignmentId: string,
): Promise<ActionResult<{ promotedUserId: string | null }>> {
  try {
    const userId = await requireUserId();
    const validated = cuid.parse(assignmentId);

    const assignment = await prisma.volunteerAssignment.findUnique({
      where: { id: validated },
      select: {
        id: true,
        userId: true,
        status: true,
        need: { select: { id: true, leagueId: true, status: true } },
      },
    });
    if (!assignment) {
      return { success: false, error: "That assignment could not be found." };
    }
    // Ownership, not capability: a volunteer stands down only for themselves.
    // An organizer removing somebody else uses cancelVolunteerAssignment.
    if (assignment.userId !== userId) {
      return { success: false, error: "That assignment is not yours to release." };
    }
    if (assignment.status !== "ACCEPTED" && assignment.status !== "WAITLISTED") {
      return { success: false, error: "That shift is not one you currently hold." };
    }

    const wasAccepted = assignment.status === "ACCEPTED";
    let promotedUserId: string | null = null;

    await prisma.$transaction(async (tx) => {
      const released = await tx.volunteerAssignment.updateMany({
        where: { id: assignment.id, status: assignment.status },
        data: { status: "CANCELED" },
      });
      // Somebody else already moved this row; leave the counter alone rather
      // than decrementing for a release that did not happen.
      if (released.count === 0) return;

      if (!wasAccepted) return;

      // Hand the slot straight to the head of the queue. If nobody is waiting,
      // give the capacity back.
      const next = await tx.volunteerAssignment.findFirst({
        where: { needId: assignment.need.id, status: "WAITLISTED" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, userId: true },
      });

      if (next) {
        const promoted = await tx.volunteerAssignment.updateMany({
          where: { id: next.id, status: "WAITLISTED" },
          data: {
            status: "ACCEPTED",
            source: "PROMOTED_FROM_WAITLIST",
            respondedAt: new Date(),
          },
        });
        if (promoted.count > 0) {
          promotedUserId = next.userId;
          return;
        }
      }

      await tx.volunteerNeed.updateMany({
        where: { id: assignment.need.id, acceptedCount: { gt: 0 } },
        data: { acceptedCount: { decrement: 1 } },
      });
    });

    revalidatePath(`/league/${assignment.need.leagueId}/workforce`);
    return { success: true, data: { promotedUserId } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid assignment ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error releasing volunteer shift:", error);
    return { success: false, error: "Failed to release the shift. Please try again." };
  }
}

/**
 * Sign somebody on at the shift.
 *
 * Distinct from completing it: check-in says they arrived, completion says the
 * organizer closed the shift out afterwards. Marking check-in is idempotent so
 * a second tap on a phone at the gate does not move the recorded time.
 */
export async function checkInVolunteer(
  assignmentId: string,
): Promise<ActionResult<{ checkedInAt: Date }>> {
  try {
    const userId = await requireUserId();
    const validated = cuid.parse(assignmentId);

    const assignment = await prisma.volunteerAssignment.findUnique({
      where: { id: validated },
      select: {
        id: true,
        status: true,
        checkedInAt: true,
        need: {
          select: {
            leagueId: true,
            teamId: true,
            divisionId: true,
            eventId: true,
            signupEventId: true,
            roundId: true,
          },
        },
      },
    });
    if (!assignment) {
      return { success: false, error: "That assignment could not be found." };
    }

    if (!(await canOrganize(userId, assignment.need.leagueId, assignment.need))) {
      return { success: false, error: "You do not have permission to organize volunteers." };
    }

    if (assignment.status !== "ACCEPTED") {
      return { success: false, error: "Only somebody holding the shift can be signed on." };
    }

    if (assignment.checkedInAt) {
      return { success: true, data: { checkedInAt: assignment.checkedInAt } };
    }

    const checkedInAt = new Date();
    await prisma.volunteerAssignment.update({
      where: { id: assignment.id },
      data: { checkedInAt },
    });

    revalidatePath(`/league/${assignment.need.leagueId}/workforce`);
    return { success: true, data: { checkedInAt } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid assignment ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error checking in volunteer:", error);
    return { success: false, error: "Failed to sign them on. Please try again." };
  }
}

const outcomeSchema = z.object({
  assignmentId: cuid,
  outcome: z.enum(["COMPLETED", "MISSED"]),
});

/** Organizer records whether an accepted volunteer actually turned up. */
async function recordAssignmentOutcome(
  input: z.infer<typeof outcomeSchema>,
): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const validated = outcomeSchema.parse(input);

  const assignment = await prisma.volunteerAssignment.findUnique({
    where: { id: validated.assignmentId },
    select: {
      id: true,
      status: true,
      need: {
        select: {
          leagueId: true,
          teamId: true,
          divisionId: true,
          eventId: true,
          signupEventId: true,
          roundId: true,
        },
      },
    },
  });
  if (!assignment) {
    return { success: false, error: "That assignment could not be found." };
  }

  if (!(await canOrganize(userId, assignment.need.leagueId, assignment.need))) {
    return { success: false, error: "You do not have permission to organize volunteers." };
  }

  if (assignment.status !== "ACCEPTED") {
    return { success: false, error: "Only an accepted assignment can be closed out." };
  }

  await prisma.volunteerAssignment.update({
    where: { id: assignment.id },
    data: {
      status: validated.outcome,
      ...(validated.outcome === "COMPLETED" ? { completedAt: new Date() } : {}),
    },
  });

  revalidatePath(`/league/${assignment.need.leagueId}/workforce`);
  return { success: true, data: { id: assignment.id } };
}

export async function completeVolunteerAssignment(
  assignmentId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    return await recordAssignmentOutcome({ assignmentId, outcome: "COMPLETED" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid assignment ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error completing volunteer assignment:", error);
    return { success: false, error: "Failed to complete the assignment." };
  }
}

export async function markVolunteerAssignmentMissed(
  assignmentId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    return await recordAssignmentOutcome({ assignmentId, outcome: "MISSED" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid assignment ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error marking volunteer assignment missed:", error);
    return { success: false, error: "Failed to update the assignment." };
  }
}

export interface VolunteerNeedSummary {
  id: string;
  roleLabel: string;
  description: string | null;
  capacity: number;
  acceptedCount: number;
  status: string;
  signupMode: "INVITE_ONLY" | "OPEN_SIGNUP";
  waitlistEnabled: boolean;
  /** Where the shift is worked: "Post 4 — Turn 3". Drives day-sheet grouping. */
  postLabel: string | null;
  briefingAt: Date | null;
  startAt: Date;
  endAt: Date;
  timezone: string;
  teamName: string | null;
  /** Set when the shift belongs to a race weekend, for grouping on the board. */
  roundLabel: string | null;
  /** Set when the shift is narrowed to one session of that weekend. */
  sessionLabel: string | null;
  /**
   * How many people are ahead of the viewer in the queue, or null when they
   * are not waiting. Derived from arrival order, never stored.
   */
  viewerWaitlistPosition: number | null;
  /** True when the viewer may claim this shift right now. */
  canClaim: boolean;
  /** Populated for organizers only; volunteers see just their own assignment. */
  assignments: Array<{
    id: string;
    status: string;
    personLabel: string;
    checkedInAt: Date | null;
    /** Whether this row belongs to the viewer, so they can release it. */
    isSelf: boolean;
  }>;
}

/**
 * Board data for one association.
 *
 * Organizers see fulfillment across every need. Everyone else sees only needs
 * they hold an assignment on, with no other volunteer's identity attached —
 * "authorized organizers see fulfillment; volunteers see only their own
 * assignments and safe activity context" (contracts/association-actions.md).
 */
export async function getVolunteerBoard(
  leagueId: string,
): Promise<ActionResult<{ needs: VolunteerNeedSummary[]; isOrganizer: boolean }>> {
  try {
    const userId = await requireUserId();
    const validated = cuid.parse(leagueId);

    // Organizing authority is per need, not per association. Asking with an
    // empty target classified every team-, division-, or event-scoped
    // coordinator as a non-organizer, because narrow grants deliberately do
    // not match an empty target — so the very people authorized to run those
    // shifts saw only their own rows.
    const grants = (await loadActiveGrants(userId, validated)).filter(
      (grant) => ROLE_CAPABILITY_MATRIX[grant.role]?.capabilities.includes(
        Capability.MANAGE_VOLUNTEERS,
      ) && ROLE_CAPABILITY_MATRIX[grant.role]?.scopes.includes(grant.scopeType),
    );

    // Association-wide authority (a grant at association scope, or a legacy
    // league admin) still short-circuits the per-need matching below.
    const isAssociationOrganizer = await hasCapability({
      userId,
      leagueId: validated,
      capability: Capability.MANAGE_VOLUNTEERS,
    });

    const hasAnyOrganizingGrant = isAssociationOrganizer || grants.length > 0;

    const needs = await prisma.volunteerNeed.findMany({
      where: {
        leagueId: validated,
        ...(hasAnyOrganizingGrant
          ? {}
          : {
              // A volunteer sees their own shifts, plus anything published for
              // open signup — a shift nobody can see is a shift nobody claims.
              // Whose names they see is a separate question, settled by the
              // assignment filter below.
              OR: [
                { assignments: { some: { userId } } },
                { signupMode: "OPEN_SIGNUP", status: "OPEN" },
              ],
            }),
      },
      select: {
        id: true,
        roleLabel: true,
        description: true,
        capacity: true,
        acceptedCount: true,
        status: true,
        signupMode: true,
        waitlistEnabled: true,
        postLabel: true,
        briefingAt: true,
        startAt: true,
        endAt: true,
        timezone: true,
        // Scope columns: needed to decide organizer standing per need.
        teamId: true,
        divisionId: true,
        eventId: true,
        signupEventId: true,
        roundId: true,
        team: { select: { name: true, divisionId: true } },
        round: { select: { name: true, roundNumber: true } },
        session: { select: { name: true, kind: true } },
        assignments: {
          where: hasAnyOrganizingGrant ? {} : { userId },
          select: {
            id: true,
            status: true,
            invitedEmail: true,
            userId: true,
            checkedInAt: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
      orderBy: { startAt: "asc" },
    });

    // The viewer's place in each queue. Only computable for an organizer's
    // view, which holds every row; a volunteer is told their position by a
    // separate count so no other volunteer's identity is loaded to produce it.
    const waitingAhead = new Map<string, number>();
    const viewerWaiting = needs.filter((need) =>
      need.assignments.some(
        (assignment) => assignment.userId === userId && assignment.status === "WAITLISTED",
      ),
    );
    for (const need of viewerWaiting) {
      const own = need.assignments.find(
        (assignment) => assignment.userId === userId && assignment.status === "WAITLISTED",
      );
      if (!own) continue;
      waitingAhead.set(
        need.id,
        await prisma.volunteerAssignment.count({
          where: {
            needId: need.id,
            status: "WAITLISTED",
            createdAt: { lt: own.createdAt },
          },
        }),
      );
    }

    // Decide organizer standing per need, in memory, from the grants already
    // loaded — one query rather than a hasCapability round-trip per row.
    const organizesNeed = (need: {
      teamId: string | null;
      divisionId: string | null;
      eventId: string | null;
      signupEventId: string | null;
      roundId: string | null;
      team: { divisionId: string | null } | null;
    }): boolean => {
      if (isAssociationOrganizer) return true;
      return grants.some((grant) => {
        switch (grant.scopeType) {
          case "ASSOCIATION":
            return true;
          case "DIVISION":
            return (
              grant.divisionId !== null &&
              (grant.divisionId === need.divisionId ||
                grant.divisionId === need.team?.divisionId)
            );
          case "TEAM":
            return grant.teamId !== null && grant.teamId === need.teamId;
          case "EVENT":
            return grant.eventId !== null && grant.eventId === need.eventId;
          case "SIGNUP_EVENT":
            return (
              grant.signupEventId !== null && grant.signupEventId === need.signupEventId
            );
          case "RACE_ROUND":
            return grant.roundId !== null && grant.roundId === need.roundId;
          default:
            return false;
        }
      });
    };

    // Three ways a need is visible: you run it, you hold a place on it, or it
    // is published for anyone in the association to claim.
    const visible = needs.filter(
      (need) =>
        organizesNeed(need) ||
        need.assignments.length > 0 ||
        (need.signupMode === "OPEN_SIGNUP" && need.status === "OPEN"),
    );

    return {
      success: true,
      data: {
        isOrganizer: isAssociationOrganizer || visible.some(organizesNeed),
        needs: visible.map((need) => ({
          id: need.id,
          roleLabel: need.roleLabel,
          description: need.description,
          capacity: need.capacity,
          acceptedCount: need.acceptedCount,
          status: need.status,
          startAt: need.startAt,
          endAt: need.endAt,
          timezone: need.timezone,
          signupMode: need.signupMode,
          waitlistEnabled: need.waitlistEnabled,
          postLabel: need.postLabel,
          briefingAt: need.briefingAt,
          // Claimable when it is published for signup, still open, and the
          // viewer is not already holding a place on it.
          canClaim:
            need.signupMode === "OPEN_SIGNUP" &&
            need.status === "OPEN" &&
            (need.waitlistEnabled || need.acceptedCount < need.capacity) &&
            !need.assignments.some(
              (assignment) =>
                assignment.userId === userId &&
                ["INVITED", "ACCEPTED", "WAITLISTED", "COMPLETED"].includes(
                  assignment.status,
                ),
            ),
          viewerWaitlistPosition: waitingAhead.has(need.id)
            ? (waitingAhead.get(need.id) as number) + 1
            : null,
          teamName: need.team?.name ?? null,
          roundLabel: need.round
            ? `Round ${need.round.roundNumber} — ${need.round.name}`
            : null,
          sessionLabel: need.session?.name ?? null,
          assignments: need.assignments.map((assignment) => ({
            id: assignment.id,
            status: assignment.status,
            personLabel:
              assignment.user?.name ??
              assignment.user?.email ??
              assignment.invitedEmail ??
              "Invited volunteer",
            checkedInAt: assignment.checkedInAt,
            isSelf: assignment.userId === userId,
          })),
        })),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid association ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error loading volunteer board:", error);
    return { success: false, error: "Failed to load volunteers." };
  }
}
