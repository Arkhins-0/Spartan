"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId, isEventManager, requireUserId } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/venue-organizations";
import {
  finalizeEventMediaSchema,
  eventMediaCommandSchema,
  type FinalizeEventMediaInput,
  type EventMediaCommandInput,
} from "@/lib/utils/validation";
import { canViewEventGallery, isConfirmedEventRegistrant } from "@/lib/utils/event-access";
import {
  deleteObjectBestEffort,
  getReadUrl,
  isStorageEnabled,
  resolveUploadedRef,
  toStorageProviderName,
} from "@/lib/storage";
import {
  eventMediaPrefix,
  maxBytesForMediaContentType,
  mediaKindForContentType,
} from "@/lib/storage/policy";
import { logSignupEventActivity } from "@/lib/utils/event-activity";

/**
 * Record an uploaded object as a gallery item. Called by the client after the
 * direct-to-storage upload resolves. Re-validates authorization, per-kind
 * size caps, and that the object lives under this event's storage prefix.
 */
export async function finalizeEventMediaUpload(
  input: FinalizeEventMediaInput
): Promise<ActionResult<{ mediaItemId: string }>> {
  try {
    const validated = finalizeEventMediaSchema.parse(input);
    const userId = await requireUserId();

    if (!isStorageEnabled()) {
      return { success: false, error: "Media uploads are not configured." };
    }

    const event = await prisma.signupEvent.findUnique({
      where: { id: validated.eventId },
      select: { id: true, status: true, galleryEnabled: true },
    });
    if (!event || event.status === "CANCELED") {
      return { success: false, error: "Event not found" };
    }
    if (!event.galleryEnabled) {
      return { success: false, error: "The gallery is disabled for this event." };
    }

    const [manager, registrant] = await Promise.all([
      isEventManager(userId, event.id),
      isConfirmedEventRegistrant(event.id, userId),
    ]);
    if (!manager && !registrant) {
      return { success: false, error: "Only event participants and organizers can share media." };
    }

    // The object must live under THIS event's prefix (and, on Blob, on the
    // Blob host) so a registrant cannot register an arbitrary external URL as
    // gallery media (stored content injection).
    const ref = resolveUploadedRef(validated.key, eventMediaPrefix(event.id));
    if (!ref) {
      return { success: false, error: "That upload doesn't belong to this event." };
    }

    const kind = mediaKindForContentType(validated.contentType);
    if (!kind) {
      return { success: false, error: "Unsupported photo/video format." };
    }
    if (validated.sizeBytes > maxBytesForMediaContentType(validated.contentType)) {
      return { success: false, error: "That file is too large." };
    }

    // Idempotent: re-finalizing the same object returns the existing item.
    const existing = await prisma.eventMediaItem.findFirst({
      where: { eventId: event.id, storageKey: ref.key },
      select: { id: true },
    });
    if (existing) {
      return { success: true, data: { mediaItemId: existing.id } };
    }

    const item = await prisma.eventMediaItem.create({
      data: {
        eventId: event.id,
        uploaderId: userId,
        kind,
        storageProvider: ref.provider,
        storageKey: ref.key,
        contentType: validated.contentType,
        sizeBytes: validated.sizeBytes,
        width: validated.width ?? null,
        height: validated.height ?? null,
        durationSeconds: validated.durationSeconds ?? null,
        caption: validated.caption || null,
      },
      select: { id: true },
    });

    revalidatePath(`/signups/${event.id}`);
    revalidatePath(`/signup-events/${event.id}`);
    return { success: true, data: { mediaItemId: item.id } };
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Failed to finalize media upload:", error);
    return { success: false, error: "Failed to save this upload." };
  }
}

export type EventGalleryItem = {
  id: string;
  kind: "PHOTO" | "VIDEO";
  /** Null when the provider holding this item is no longer configured. */
  url: string | null;
  contentType: string;
  caption: string | null;
  createdAt: Date;
  uploaderName: string;
  canRemove: boolean;
};

/**
 * Gallery listing, authorization-gated: managers always; otherwise per the
 * event's gallery visibility (participants-only by default). FLAGGED items
 * are hidden from everyone but managers pending review.
 */
export async function listEventMedia(input: {
  eventId: string;
  linkToken?: string;
}): Promise<{ items: EventGalleryItem[]; canModerate: boolean; canUpload: boolean } | null> {
  if (!isStorageEnabled()) return null;

  const gate = await prisma.signupEvent.findUnique({
    where: { id: input.eventId },
    select: {
      id: true,
      status: true,
      visibility: true,
      linkToken: true,
      galleryEnabled: true,
      galleryVisibility: true,
    },
  });
  if (!gate || !gate.galleryEnabled) return null;

  const userId = await getCurrentUserId();
  const canModerate = userId ? await isEventManager(userId, gate.id) : false;
  const allowed =
    canModerate || (await canViewEventGallery(gate, { userId, linkToken: input.linkToken }));
  if (!allowed) return null;

  const canUpload =
    canModerate || (userId ? await isConfirmedEventRegistrant(gate.id, userId) : false);

  const items = await prisma.eventMediaItem.findMany({
    where: {
      eventId: gate.id,
      status: canModerate ? { in: ["ACTIVE", "FLAGGED"] } : "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      kind: true,
      storageProvider: true,
      storageKey: true,
      contentType: true,
      caption: true,
      createdAt: true,
      status: true,
      uploaderId: true,
      uploader: { select: { name: true, email: true } },
    },
  });

  const urls = await Promise.all(
    items.map((item) =>
      getReadUrl({ provider: toStorageProviderName(item.storageProvider), key: item.storageKey })
    )
  );

  return {
    canModerate,
    canUpload,
    items: items.map((item, index) => ({
      id: item.id,
      kind: item.kind,
      url: urls[index],
      contentType: item.contentType,
      caption: item.status === "FLAGGED" ? `${item.caption ?? ""} (flagged)`.trim() : item.caption,
      createdAt: item.createdAt,
      uploaderName: item.uploader.name ?? item.uploader.email,
      canRemove: canModerate || item.uploaderId === userId,
    })),
  };
}

/** Remove an item — organizers remove anything (logged); uploaders their own. */
export async function removeEventMediaItem(
  input: EventMediaCommandInput
): Promise<ActionResult<{ mediaItemId: string }>> {
  try {
    const { mediaItemId } = eventMediaCommandSchema.parse(input);
    const userId = await requireUserId();

    const item = await prisma.eventMediaItem.findUnique({
      where: { id: mediaItemId },
      select: {
        id: true,
        eventId: true,
        uploaderId: true,
        storageProvider: true,
        storageKey: true,
        status: true,
      },
    });
    if (!item || item.status === "REMOVED") {
      return { success: false, error: "Media item not found" };
    }

    const manager = await isEventManager(userId, item.eventId);
    if (!manager && item.uploaderId !== userId) {
      return { success: false, error: "You can only remove your own uploads." };
    }

    await prisma.eventMediaItem.update({
      where: { id: item.id },
      data: { status: "REMOVED", removedAt: new Date(), removedById: userId },
    });
    await deleteObjectBestEffort({
      provider: toStorageProviderName(item.storageProvider),
      key: item.storageKey,
    });

    if (manager && item.uploaderId !== userId) {
      await logSignupEventActivity({
        eventId: item.eventId,
        actorId: userId,
        action: "media.removed",
        summary: "Removed a gallery item",
        details: { mediaItemId: item.id },
      });
    }

    revalidatePath(`/signups/${item.eventId}`);
    revalidatePath(`/signup-events/${item.eventId}`);
    return { success: true, data: { mediaItemId: item.id } };
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Failed to remove media item:", error);
    return { success: false, error: "Failed to remove this item." };
  }
}

/** Report an item — hides it (FLAGGED) pending organizer review. */
export async function reportEventMediaItem(
  input: EventMediaCommandInput
): Promise<ActionResult<{ mediaItemId: string }>> {
  try {
    const { mediaItemId } = eventMediaCommandSchema.parse(input);
    const userId = await requireUserId();

    const item = await prisma.eventMediaItem.findUnique({
      where: { id: mediaItemId },
      select: {
        id: true,
        eventId: true,
        status: true,
        event: {
          select: {
            id: true,
            status: true,
            visibility: true,
            linkToken: true,
            galleryEnabled: true,
            galleryVisibility: true,
          },
        },
      },
    });
    if (!item || item.status === "REMOVED") {
      return { success: false, error: "Media item not found" };
    }

    // Only someone who can actually see this gallery may flag its contents —
    // otherwise any signed-in user knowing a mediaItemId could mass-flag media
    // on private or invite-only events (same gate listEventMedia enforces).
    const canModerate = await isEventManager(userId, item.eventId);
    const allowed = canModerate || (await canViewEventGallery(item.event, { userId }));
    if (!allowed) {
      return { success: false, error: "Media item not found" };
    }

    await prisma.eventMediaItem.update({
      where: { id: item.id },
      data: { status: "FLAGGED", reportCount: { increment: 1 } },
    });

    revalidatePath(`/signups/${item.eventId}`);
    revalidatePath(`/signup-events/${item.eventId}`);
    return { success: true, data: { mediaItemId: item.id } };
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Failed to report media item:", error);
    return { success: false, error: "Failed to report this item." };
  }
}
