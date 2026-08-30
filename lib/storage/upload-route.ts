import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { createUploadGrant, isStorageEnabled, resolveStorageProvider } from "@/lib/storage";

/**
 * Shared body of every upload-grant route. The route itself owns
 * authorization (who may upload to this prefix) and calls this once the
 * caller is cleared. Two request shapes arrive at the same URL:
 *
 * 1. A grant request `{ contentType, sizeBytes }` from
 *    `uploadToStorage()` — answered with an {@link UploadGrant}.
 * 2. Vercel Blob's own token-exchange body (`type: "blob.generate-client-token"`)
 *    which its client posts back to the grant URL when the provider is Blob.
 *
 * Type and size limits are enforced here so the browser cannot exceed them
 * regardless of provider; the finalize action re-validates them again.
 */

export interface UploadRoutePolicy {
  prefix: string;
  allowedContentTypes: readonly string[];
  /** Per-type cap; return null to reject the type. */
  maxBytesFor: (contentType: string) => number | null;
}

const grantRequestSchema = z.object({
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().min(1),
});

function isBlobTokenExchange(body: unknown): body is HandleUploadBody {
  return typeof body === "object" && body !== null && typeof (body as { type?: unknown }).type === "string";
}

export async function handleUploadGrantRequest(
  request: Request,
  policy: UploadRoutePolicy
): Promise<Response> {
  if (!isStorageEnabled()) {
    return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (isBlobTokenExchange(body)) {
    if (resolveStorageProvider() !== "vercel-blob") {
      return NextResponse.json({ error: "Blob uploads are not enabled" }, { status: 400 });
    }
    const maxBytes = Math.max(
      ...policy.allowedContentTypes.map((type) => policy.maxBytesFor(type) ?? 0)
    );
    try {
      const result = await handleUpload({
        request,
        body,
        onBeforeGenerateToken: async (pathname) => {
          if (!pathname.startsWith(policy.prefix)) {
            throw new Error("Invalid upload path");
          }
          return {
            allowedContentTypes: [...policy.allowedContentTypes],
            maximumSizeInBytes: maxBytes,
            addRandomSuffix: true,
          };
        },
        // Rows are created by the finalize server action after the upload
        // resolves client-side (this callback does not fire in local dev).
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const parsed = grantRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }
  const { contentType, sizeBytes } = parsed.data;

  if (!policy.allowedContentTypes.includes(contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  const maxBytes = policy.maxBytesFor(contentType);
  if (maxBytes === null || sizeBytes > maxBytes) {
    return NextResponse.json({ error: "That file is too large" }, { status: 413 });
  }

  try {
    const grant = await createUploadGrant({ prefix: policy.prefix, contentType, sizeBytes });
    return NextResponse.json(grant);
  } catch (error) {
    console.error("Failed to create upload grant:", error);
    return NextResponse.json({ error: "Could not start the upload" }, { status: 500 });
  }
}
