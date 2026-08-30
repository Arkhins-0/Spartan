import { env } from "@/lib/env";
import { s3Provider } from "@/lib/storage/s3";
import { vercelBlobProvider } from "@/lib/storage/vercel-blob";
import type {
  StorageProvider,
  StorageProviderName,
  StoredObjectRef,
  UploadGrant,
  UploadGrantRequest,
} from "@/lib/storage/types";

export type {
  StorageProvider,
  StorageProviderName,
  StoredObjectRef,
  UploadGrant,
  UploadGrantRequest,
} from "@/lib/storage/types";

/**
 * Provider resolution, mirroring the email seam: an explicit STORAGE_PROVIDER
 * wins; otherwise infer from configured credentials (an S3 bucket, then a
 * Blob token). `null` means uploads are disabled and must fail visibly.
 */
export function resolveStorageProvider(): StorageProviderName | null {
  if (env.STORAGE_PROVIDER === "none") return null;
  if (env.STORAGE_PROVIDER) return env.STORAGE_PROVIDER;
  if (env.S3_BUCKET) return "s3";
  if (env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  return null;
}

export function isStorageEnabled(): boolean {
  return resolveStorageProvider() !== null;
}

const PROVIDERS: Record<StorageProviderName, StorageProvider> = {
  s3: s3Provider,
  "vercel-blob": vercelBlobProvider,
};

export function getStorageProvider(name?: StorageProviderName): StorageProvider {
  const resolved = name ?? resolveStorageProvider();
  if (!resolved) {
    throw new Error("Object storage is not configured");
  }
  return PROVIDERS[resolved];
}

/** Grant the browser permission to upload one object under `prefix`. */
export function createUploadGrant(request: UploadGrantRequest): Promise<UploadGrant> {
  return getStorageProvider().createUploadGrant(request);
}

/**
 * Validate what the browser reports after uploading against the ACTIVE
 * provider and the caller's prefix, returning the reference a row should
 * store. Null when it is not something we granted.
 */
export function resolveUploadedRef(reference: string, prefix: string): StoredObjectRef | null {
  const provider = resolveStorageProvider();
  if (!provider) return null;
  const key = PROVIDERS[provider].resolveUploadedKey(reference, prefix);
  return key ? { provider, key } : null;
}

/**
 * A URL the viewer may fetch the object from — signed and short-lived on S3,
 * the capability URL itself on Blob. Rows remember which provider holds them,
 * so switching providers never strands earlier uploads while both are
 * configured. Returns null when that provider can no longer serve it.
 */
export async function getReadUrl(ref: StoredObjectRef): Promise<string | null> {
  try {
    return await PROVIDERS[ref.provider].getReadUrl(ref.key);
  } catch (error) {
    console.error(`Failed to sign read URL via ${ref.provider}:`, error);
    return null;
  }
}

/** Best-effort deletion — a storage failure must not fail the DB removal. */
export async function deleteObjectBestEffort(ref: StoredObjectRef): Promise<void> {
  try {
    await PROVIDERS[ref.provider].deleteObject(ref.key);
  } catch (error) {
    console.error(`Failed to delete object via ${ref.provider} (leaving orphan):`, error);
  }
}

/** Narrow a stored provider column to the union, tolerating stale values. */
export function toStorageProviderName(value: string): StorageProviderName {
  return value === "s3" ? "s3" : "vercel-blob";
}
