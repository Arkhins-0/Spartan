"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { isTeamAdmin, requireUserId } from "@/lib/auth/session";
import {
  finalizeDocumentSchema,
  listDocumentsSchema,
  documentIdSchema,
  type FinalizeDocumentInput,
  type ListDocumentsInput,
  type DocumentIdInput,
} from "@/lib/utils/validation";
import {
  deleteObjectBestEffort,
  getReadUrl,
  isStorageEnabled,
  resolveUploadedRef,
  toStorageProviderName,
} from "@/lib/storage";
import {
  DOCUMENT_MAX_BYTES,
  documentPrefix,
  isDocumentContentTypeAllowed,
} from "@/lib/storage/policy";
import type { DocumentView } from "@/types/documents";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

/**
 * Official association paperwork — entry forms, scrutineering sheets, medical
 * certificates, results sheets.
 *
 * Distinct from event media galleries: nothing here is ever public. A document
 * is visible to association admins and to the team it concerns, and to nobody
 * else. Uploads follow the same client-uploads-then-finalize flow as
 * `finalizeEventMediaUpload`, with the storage reference prefix-anchored so a
 * caller cannot register an arbitrary object as association paperwork.
 *
 * Per ADR-0008 the storage provider stays optional and portable (S3 or Vercel
 * Blob behind lib/storage): with nothing configured, uploads fail visibly
 * rather than silently dropping a document someone believed they filed.
 */

const STORAGE_UNCONFIGURED =
  "Document storage is not configured. Set STORAGE_PROVIDER (s3 or vercel-blob) to enable uploads.";

async function isLeagueAdminUser(userId: string, leagueId: string): Promise<boolean> {
  const count = await prisma.leagueUser.count({
    where: { userId, leagueId, role: "LEAGUE_ADMIN", league: { isActive: true } },
  });
  return count > 0;
}

function revalidateDocumentPaths(leagueId: string) {
  revalidatePath(`/league/${leagueId}/documents`);
  revalidatePath(`/league/${leagueId}/threads`);
}

/** Record a completed upload as association paperwork. */
export async function finalizeDocumentUpload(
  input: FinalizeDocumentInput
): Promise<ActionResult<{ documentId: string }>> {
  try {
    const validated = finalizeDocumentSchema.parse(input);
    const userId = await requireUserId();

    // Fail loudly when the optional provider is absent (ADR-0008).
    if (!isStorageEnabled()) {
      return { success: false, error: STORAGE_UNCONFIGURED };
    }

    const league = await prisma.league.findFirst({
      where: { id: validated.leagueId, isActive: true },
      select: { id: true },
    });
    if (!league) {
      return { success: false, error: "Association not found" };
    }

    // An admin may file anything; a team admin may only file for their own team.
    const admin = await isLeagueAdminUser(userId, validated.leagueId);
    if (!admin) {
      if (!validated.teamId) {
        return {
          success: false,
          error: "Only association admins can file association-wide documents",
        };
      }
      if (!(await isTeamAdmin(userId, validated.teamId))) {
        return { success: false, error: "Unauthorized: Only team admins can file documents" };
      }
      const team = await prisma.team.findFirst({
        where: { id: validated.teamId, leagueId: validated.leagueId },
        select: { id: true },
      });
      if (!team) {
        return { success: false, error: "This team does not belong to that association" };
      }
    }

    // Prefix-anchored (and host-allowlisted on Blob), so a caller cannot pass
    // off an arbitrary object as a filed document (stored content injection).
    const ref = resolveUploadedRef(validated.key, documentPrefix(validated.leagueId));
    if (!ref) {
      return { success: false, error: "That upload doesn't belong to this association." };
    }

    if (!isDocumentContentTypeAllowed(validated.contentType)) {
      return { success: false, error: "Unsupported document format. Use PDF, JPEG, PNG, or HEIC." };
    }
    if (validated.sizeBytes > DOCUMENT_MAX_BYTES) {
      return { success: false, error: "That file is too large (25 MB maximum)." };
    }

    // Idempotent: re-finalizing the same object returns the existing document.
    const existing = await prisma.document.findFirst({
      where: { leagueId: validated.leagueId, storageKey: ref.key },
      select: { id: true },
    });
    if (existing) {
      return { success: true, data: { documentId: existing.id } };
    }

    const document = await prisma.document.create({
      data: {
        leagueId: validated.leagueId,
        teamId: validated.teamId || null,
        threadId: validated.threadId || null,
        kind: validated.kind,
        title: validated.title,
        storageProvider: ref.provider,
        storageKey: ref.key,
        contentType: validated.contentType,
        sizeBytes: validated.sizeBytes,
        uploaderId: userId,
      },
      select: { id: true },
    });

    revalidateDocumentPaths(validated.leagueId);

    return { success: true, data: { documentId: document.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error finalizing document upload:", error);
    return { success: false, error: "Failed to save this document. Please try again." };
  }
}

/**
 * List paperwork. Association admins see everything; a team admin sees only
 * their own team's documents plus association-wide ones.
 */
export async function listDocuments(
  input: ListDocumentsInput
): Promise<ActionResult<{ documents: DocumentView[]; canUploadForLeague: boolean }>> {
  try {
    const validated = listDocumentsSchema.parse(input);
    const userId = await requireUserId();

    const admin = await isLeagueAdminUser(userId, validated.leagueId);

    // Teams the viewer administers inside this association — the basis for
    // what a non-admin is allowed to see.
    const adminTeams = admin
      ? []
      : await prisma.teamMember.findMany({
          where: { userId, role: "ADMIN", team: { leagueId: validated.leagueId } },
          select: { teamId: true },
        });
    const adminTeamIds = adminTeams.map((row) => row.teamId);

    if (!admin && adminTeamIds.length === 0) {
      return { success: false, error: "Unauthorized: You cannot view these documents" };
    }

    const documents = await prisma.document.findMany({
      where: {
        leagueId: validated.leagueId,
        status: "ACTIVE",
        ...(validated.kind ? { kind: validated.kind } : {}),
        ...(validated.threadId ? { threadId: validated.threadId } : {}),
        ...(validated.teamId ? { teamId: validated.teamId } : {}),
        // Non-admins are confined to their own teams plus association-wide docs.
        ...(admin
          ? {}
          : { OR: [{ teamId: { in: adminTeamIds } }, { teamId: null }] }),
      },
      select: {
        id: true,
        kind: true,
        title: true,
        storageProvider: true,
        storageKey: true,
        contentType: true,
        sizeBytes: true,
        createdAt: true,
        team: { select: { id: true, name: true } },
        uploader: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Read URLs are minted per request: signed and short-lived on S3, so the
    // link in the page dies with the session rather than living in a chat log.
    const urls = await Promise.all(
      documents.map((document) =>
        getReadUrl({
          provider: toStorageProviderName(document.storageProvider),
          key: document.storageKey,
        })
      )
    );

    return {
      success: true,
      data: {
        canUploadForLeague: admin,
        documents: documents.map((document, index) => ({
          id: document.id,
          kind: document.kind,
          title: document.title,
          url: urls[index],
          contentType: document.contentType,
          sizeBytes: document.sizeBytes,
          createdAt: document.createdAt.toISOString(),
          team: document.team,
          uploaderName: document.uploader.name ?? document.uploader.email,
          // Admins moderate everything; uploaders may withdraw their own filing.
          canRemove: admin || document.uploader.id === userId,
        })),
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error listing documents:", error);
    return { success: false, error: "Failed to load documents. Please try again." };
  }
}

/**
 * Withdraw a document. Soft-deleted so the paperwork trail survives, with the
 * object removed best-effort — a storage failure must not block the record.
 */
export async function removeDocument(
  input: DocumentIdInput
): Promise<ActionResult<{ documentId: string }>> {
  try {
    const validated = documentIdSchema.parse(input);
    const userId = await requireUserId();

    const document = await prisma.document.findUnique({
      where: { id: validated.documentId },
      select: {
        id: true,
        leagueId: true,
        uploaderId: true,
        storageProvider: true,
        storageKey: true,
        status: true,
      },
    });

    if (!document || document.status === "REMOVED") {
      return { success: false, error: "Document not found" };
    }

    const admin = await isLeagueAdminUser(userId, document.leagueId);
    if (!admin && document.uploaderId !== userId) {
      return { success: false, error: "Unauthorized: You cannot remove this document" };
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { status: "REMOVED", removedAt: new Date(), removedById: userId },
    });

    await deleteObjectBestEffort({
      provider: toStorageProviderName(document.storageProvider),
      key: document.storageKey,
    });

    revalidateDocumentPaths(document.leagueId);

    return { success: true, data: { documentId: document.id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid input", details: error.issues };
    }
    console.error("Error removing document:", error);
    return { success: false, error: "Failed to remove the document. Please try again." };
  }
}
