/**
 * Upload policy — what may be stored where, and how big. Pure constants and
 * helpers with no provider dependency, safe to import from client components.
 */

/** Images: 10 MB. */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/** Videos: 200 MB (duration capped client-side; size is authoritative). */
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
/** Association paperwork: 25 MB. */
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"] as const;
export const VIDEO_CONTENT_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const MEDIA_CONTENT_TYPES = [...IMAGE_CONTENT_TYPES, ...VIDEO_CONTENT_TYPES];

/**
 * Paperwork accepts PDFs the gallery deliberately does not: documents are
 * admin-visible operational records, not participant media.
 */
export const DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
] as const;

export function mediaKindForContentType(contentType: string): "PHOTO" | "VIDEO" | null {
  if ((IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType)) return "PHOTO";
  if ((VIDEO_CONTENT_TYPES as readonly string[]).includes(contentType)) return "VIDEO";
  return null;
}

export function maxBytesForMediaContentType(contentType: string): number {
  return mediaKindForContentType(contentType) === "VIDEO" ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
}

export function isDocumentContentTypeAllowed(contentType: string): boolean {
  return (DOCUMENT_CONTENT_TYPES as readonly string[]).includes(contentType);
}

/** The key prefix every gallery upload for an event must live under. */
export function eventMediaPrefix(eventId: string): string {
  return `signup-events/${eventId}/`;
}

/** The key prefix every document for an association must live under. */
export function documentPrefix(leagueId: string): string {
  return `leagues/${leagueId}/documents/`;
}

/**
 * File extension for a stored object, derived from the declared MIME type and
 * never from the user's filename — a filename is attacker-controlled and an
 * extension that disagrees with the bytes is how an upload gets served as
 * something it is not.
 */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

export function extensionForContentType(contentType: string): string | null {
  return EXTENSION_BY_CONTENT_TYPE[contentType] ?? null;
}
