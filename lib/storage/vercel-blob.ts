import { del } from "@vercel/blob";
import type { StorageProvider, UploadGrant, UploadGrantRequest } from "@/lib/storage/types";

/**
 * Vercel Blob — the platform's original object store, kept as a selectable
 * provider so deployments already holding uploads keep working (ADR-0008).
 *
 * Privacy model: blobs are web-accessible under server-randomized, unguessable
 * pathnames (capability URLs). Authorization is enforced on the LISTING; the
 * stored "key" is the full blob URL and the read URL is that same value. For
 * paperwork that must never leak by link, prefer the S3 provider.
 */

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

export const vercelBlobProvider: StorageProvider = {
  name: "vercel-blob",

  async createUploadGrant(request: UploadGrantRequest): Promise<UploadGrant> {
    // The Blob client adds its own random suffix (addRandomSuffix in the token
    // exchange), so the pathname here only needs to sit under the prefix.
    return { provider: "vercel-blob", pathname: `${request.prefix}upload` };
  },

  resolveUploadedKey(reference: string, prefix: string): string | null {
    // Host-allowlisted and prefix-anchored, so a caller cannot register an
    // arbitrary external URL as a filed upload (stored content injection).
    let parsed: URL;
    try {
      parsed = new URL(reference);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) {
      return null;
    }
    const pathname = parsed.pathname.replace(/^\//, "");
    if (!pathname.startsWith(prefix)) return null;
    return reference;
  },

  async getReadUrl(key: string): Promise<string> {
    return key;
  },

  async deleteObject(key: string): Promise<void> {
    await del(key);
  },
};
