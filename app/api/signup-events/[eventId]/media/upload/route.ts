import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId, isEventManager } from "@/lib/auth/session";
import { isConfirmedEventRegistrant } from "@/lib/utils/event-access";
import { handleUploadGrantRequest } from "@/lib/storage/upload-route";
import {
  MEDIA_CONTENT_TYPES,
  eventMediaPrefix,
  maxBytesForMediaContentType,
  mediaKindForContentType,
} from "@/lib/storage/policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Upload grant for event media. The browser sends bytes straight to storage
 * with a grant this route issues after authorizing the caller — confirmed
 * registrants and event managers only, on events whose gallery is enabled.
 * The row is written afterwards by `finalizeEventMediaUpload`.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<Response> {
  const { eventId } = await params;

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await prisma.signupEvent.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, galleryEnabled: true },
  });
  if (!event || event.status === "CANCELED") {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (!event.galleryEnabled) {
    return NextResponse.json({ error: "The gallery is disabled for this event" }, { status: 403 });
  }

  const [manager, registrant] = await Promise.all([
    isEventManager(userId, eventId),
    isConfirmedEventRegistrant(eventId, userId),
  ]);
  if (!manager && !registrant) {
    return NextResponse.json(
      { error: "Only event participants and organizers can share media" },
      { status: 403 }
    );
  }

  return handleUploadGrantRequest(request, {
    prefix: eventMediaPrefix(eventId),
    allowedContentTypes: MEDIA_CONTENT_TYPES,
    maxBytesFor: (contentType) =>
      mediaKindForContentType(contentType) ? maxBytesForMediaContentType(contentType) : null,
  });
}
