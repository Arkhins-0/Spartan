"use server";

import { z } from "zod";
import { Prisma, type VolunteerCredentialKind } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/session";
import { Capability, hasCapability } from "@/lib/auth/capabilities";
import { rethrowIfNextRedirectError } from "@/lib/utils/next-errors";
import { VOLUNTEER_CREDENTIAL_KINDS } from "@/lib/utils/validation";

/**
 * Volunteer qualifications: marshal grades, licences, first aid, scrutineering.
 *
 * These are *references*, not documents. A licence number and an expiry date is
 * enough to gate a shift and to tell an organizer who is qualified; storing
 * scans would pull identity documents into a system that neither needs them nor
 * could stay free to self-host with them (ADR-0008). Verifying a governing
 * body's licence is explicitly out of scope for feature 007 — `verifiedBy`
 * records that a named officer sighted the original, which is a claim about a
 * person, not an adjudication.
 *
 * Expiry is advisory. A lapsed credential blocks a self-claim and warns an
 * organizer; it never revokes a shift somebody already holds, because standing
 * somebody down on race morning over a paperwork date is worse than the risk it
 * was meant to manage.
 */

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

const cuid = z.string().cuid("Invalid ID format");

const recordSchema = z
  .object({
    leagueId: cuid,
    userId: cuid,
    kind: z.enum(VOLUNTEER_CREDENTIAL_KINDS),
    label: z.string().min(1, "A grade or qualification is required").max(120),
    reference: z.string().max(120).optional(),
    issuedAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (value) => !value.expiresAt || !value.issuedAt || value.expiresAt > value.issuedAt,
    { message: "The expiry must be after the issue date", path: ["expiresAt"] },
  );

export type RecordVolunteerCredentialInput = z.input<typeof recordSchema>;

async function canManageCredentials(userId: string, leagueId: string) {
  return hasCapability({
    userId,
    leagueId,
    capability: Capability.MANAGE_VOLUNTEERS,
  });
}

/**
 * Record or correct a credential.
 *
 * Upsert on (association, person, kind, label): re-recording the same grade is
 * a correction — a renewed licence with a new expiry — not a second row.
 * Re-recording deliberately clears any previous verification, because a changed
 * expiry or number has not been sighted by anyone yet.
 */
export async function recordVolunteerCredential(
  input: RecordVolunteerCredentialInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actingUserId = await requireUserId();
    const validated = recordSchema.parse(input);

    if (!(await canManageCredentials(actingUserId, validated.leagueId))) {
      return { success: false, error: "You do not have permission to record credentials." };
    }

    const membership = await prisma.leagueUser.count({
      where: { userId: validated.userId, leagueId: validated.leagueId },
    });
    if (membership === 0) {
      return { success: false, error: "That person is not part of this association." };
    }

    const data = {
      reference: validated.reference ?? null,
      issuedAt: validated.issuedAt ?? null,
      expiresAt: validated.expiresAt ?? null,
      notes: validated.notes ?? null,
      recordedById: actingUserId,
      verifiedById: null,
      verifiedAt: null,
    };

    const credential = await prisma.volunteerCredential.upsert({
      where: {
        leagueId_userId_kind_label: {
          leagueId: validated.leagueId,
          userId: validated.userId,
          kind: validated.kind,
          label: validated.label,
        },
      },
      create: {
        leagueId: validated.leagueId,
        userId: validated.userId,
        kind: validated.kind,
        label: validated.label,
        ...data,
      },
      update: data,
      select: { id: true },
    });

    revalidatePath(`/league/${validated.leagueId}/workforce`);
    return { success: true, data: { id: credential.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input.", details: error.issues };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return { success: false, error: "That person could not be found." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error recording volunteer credential:", error);
    return { success: false, error: "Failed to record the credential." };
  }
}

/** Record that a named officer sighted the original document. */
export async function verifyVolunteerCredential(
  credentialId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actingUserId = await requireUserId();
    const validated = cuid.parse(credentialId);

    const credential = await prisma.volunteerCredential.findUnique({
      where: { id: validated },
      select: { id: true, leagueId: true },
    });
    if (!credential) {
      return { success: false, error: "That credential could not be found." };
    }

    if (!(await canManageCredentials(actingUserId, credential.leagueId))) {
      return { success: false, error: "You do not have permission to verify credentials." };
    }

    await prisma.volunteerCredential.update({
      where: { id: credential.id },
      data: { verifiedById: actingUserId, verifiedAt: new Date() },
    });

    revalidatePath(`/league/${credential.leagueId}/workforce`);
    return { success: true, data: { id: credential.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid credential ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error verifying volunteer credential:", error);
    return { success: false, error: "Failed to verify the credential." };
  }
}

export async function deleteVolunteerCredential(
  credentialId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actingUserId = await requireUserId();
    const validated = cuid.parse(credentialId);

    const credential = await prisma.volunteerCredential.findUnique({
      where: { id: validated },
      select: { id: true, leagueId: true },
    });
    if (!credential) {
      return { success: false, error: "That credential could not be found." };
    }

    if (!(await canManageCredentials(actingUserId, credential.leagueId))) {
      return { success: false, error: "You do not have permission to remove credentials." };
    }

    await prisma.volunteerCredential.delete({ where: { id: credential.id } });

    revalidatePath(`/league/${credential.leagueId}/workforce`);
    return { success: true, data: { id: credential.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid credential ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error deleting volunteer credential:", error);
    return { success: false, error: "Failed to remove the credential." };
  }
}

export interface VolunteerCredentialView {
  id: string;
  kind: VolunteerCredentialKind;
  label: string;
  reference: string | null;
  issuedAt: Date | null;
  expiresAt: Date | null;
  expired: boolean;
  verified: boolean;
  holderName: string;
  holderId: string;
}

/**
 * Credentials in one association.
 *
 * An organizer sees everyone's; anyone else sees only their own. A licence
 * number is personal data, and there is no reason for one volunteer to read
 * another's.
 */
export async function listVolunteerCredentials(
  leagueId: string,
): Promise<ActionResult<{ credentials: VolunteerCredentialView[]; isOrganizer: boolean }>> {
  try {
    const userId = await requireUserId();
    const validated = cuid.parse(leagueId);

    const membership = await prisma.leagueUser.count({
      where: { userId, leagueId: validated },
    });
    if (membership === 0) {
      return { success: false, error: "You are not part of this association." };
    }

    const isOrganizer = await canManageCredentials(userId, validated);

    const rows = await prisma.volunteerCredential.findMany({
      where: {
        leagueId: validated,
        ...(isOrganizer ? {} : { userId }),
      },
      select: {
        id: true,
        kind: true,
        label: true,
        reference: true,
        issuedAt: true,
        expiresAt: true,
        verifiedAt: true,
        userId: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ kind: "asc" }, { label: "asc" }],
    });

    const now = new Date();

    return {
      success: true,
      data: {
        isOrganizer,
        credentials: rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          label: row.label,
          reference: row.reference,
          issuedAt: row.issuedAt,
          expiresAt: row.expiresAt,
          expired: row.expiresAt !== null && row.expiresAt <= now,
          verified: row.verifiedAt !== null,
          holderId: row.userId,
          holderName: row.user?.name ?? row.user?.email ?? "Unknown",
        })),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid association ID." };
    }
    rethrowIfNextRedirectError(error);
    console.error("Error loading volunteer credentials:", error);
    return { success: false, error: "Failed to load credentials." };
  }
}
