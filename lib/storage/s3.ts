import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { extensionForContentType } from "@/lib/storage/policy";
import type { StorageProvider, UploadGrant, UploadGrantRequest } from "@/lib/storage/types";

/**
 * S3-compatible object storage: AWS S3, or anything speaking its API
 * (Cloudflare R2, MinIO, Backblaze B2) via S3_ENDPOINT — which is what keeps
 * this provider portable for self-hosters (ADR-0008).
 *
 * Privacy model: the bucket blocks public access. Every read is a presigned
 * GET minted after the caller passed the same authorization check the listing
 * enforces, and it expires in minutes. Uploads are presigned PUTs whose
 * signature pins Content-Type and Content-Length, so the browser can neither
 * change what it declared nor stream a larger body than it was granted.
 */

/** Upload grants are short — the browser starts the PUT immediately. */
const UPLOAD_GRANT_SECONDS = 60;
/** Read links outlive a page view but not a shared screenshot. */
const READ_URL_SECONDS = 15 * 60;

/** Keys are opaque and generated server-side; only this alphabet ever appears. */
const KEY_PATTERN = /^[A-Za-z0-9/_.-]+$/;

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const region = env.S3_REGION ?? env.AWS_REGION;
  client = new S3Client({
    ...(region ? { region } : {}),
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    // Path-style is what MinIO and most self-hosted gateways expect.
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    // Credentials come from the default provider chain: AWS_ACCESS_KEY_ID /
    // AWS_SECRET_ACCESS_KEY, an instance role, or Vercel's OIDC integration.
  });
  return client;
}

function bucket(): string {
  if (!env.S3_BUCKET) {
    throw new Error("STORAGE_PROVIDER is 's3' but S3_BUCKET is not set");
  }
  return env.S3_BUCKET;
}

export function isValidS3Key(key: string): boolean {
  return (
    key.length > 0 &&
    key.length <= 1024 &&
    KEY_PATTERN.test(key) &&
    !key.startsWith("/") &&
    !key.split("/").includes("..") &&
    !key.split("/").includes("")
  );
}

export const s3Provider: StorageProvider = {
  name: "s3",

  async createUploadGrant(request: UploadGrantRequest): Promise<UploadGrant> {
    const extension = extensionForContentType(request.contentType);
    if (!extension) {
      throw new Error(`Unsupported content type: ${request.contentType}`);
    }
    // The filename the user chose never reaches the key: a UUID makes every
    // object unguessable and lets Cache-Control be immutable without lying.
    const key = `${request.prefix}${crypto.randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: request.contentType,
      ContentLength: request.sizeBytes,
    });
    const signable = new Set(["content-type", "content-length"]);
    const uploadUrl = await getSignedUrl(getClient(), command, {
      expiresIn: UPLOAD_GRANT_SECONDS,
      // Keep both headers in the signature (not hoisted into the query
      // string) so a PUT with a different type or size is rejected by S3.
      signableHeaders: signable,
      unhoistableHeaders: signable,
    });

    return {
      provider: "s3",
      key,
      uploadUrl,
      headers: { "Content-Type": request.contentType },
      expiresIn: UPLOAD_GRANT_SECONDS,
    };
  },

  resolveUploadedKey(reference: string, prefix: string): string | null {
    if (!isValidS3Key(reference)) return null;
    if (!reference.startsWith(prefix)) return null;
    return reference;
  },

  async getReadUrl(key: string, options?: { expiresIn?: number }): Promise<string> {
    if (!isValidS3Key(key)) {
      throw new Error("Invalid storage key");
    }
    return getSignedUrl(
      getClient(),
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
      { expiresIn: options?.expiresIn ?? READ_URL_SECONDS }
    );
  },

  async deleteObject(key: string): Promise<void> {
    if (!isValidS3Key(key)) return;
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  },
};
