/**
 * Provider-agnostic object storage seam (ADR-0008).
 *
 * Application code never imports a storage SDK. It asks {@link StorageProvider}
 * for an upload grant, hands the browser that grant, and later stores the
 * resulting {@link StoredObjectRef}. Reads go through `getReadUrl`, which
 * lets a provider hand out short-lived signed URLs so private paperwork
 * (medical certificates, entry forms) is never reachable by guessing a link.
 */

export type StorageProviderName = "s3" | "vercel-blob";

/**
 * What the server hands the browser so it can PUT bytes straight to storage,
 * bypassing the serverless body limit.
 *
 * - `s3`: a presigned PUT. The signature pins the content type and length, so
 *   the browser must echo `headers` exactly.
 * - `vercel-blob`: the Blob client performs its own token exchange against
 *   `grantUrl`; the server only tells it which pathname it may write to.
 */
export type UploadGrant =
  | {
      provider: "s3";
      /** Object key the row will store once the upload is finalized. */
      key: string;
      uploadUrl: string;
      headers: Record<string, string>;
      /** Seconds the grant stays valid. */
      expiresIn: number;
    }
  | {
      provider: "vercel-blob";
      /** Pathname the Blob client must upload to. */
      pathname: string;
    };

export interface UploadGrantRequest {
  /** Prefix the key must live under — the authorization boundary. */
  prefix: string;
  contentType: string;
  sizeBytes: number;
}

/** Everything a row needs to find its bytes again. */
export interface StoredObjectRef {
  provider: StorageProviderName;
  /** Object key for S3; the full blob URL for Vercel Blob. */
  key: string;
}

export interface StorageProvider {
  readonly name: StorageProviderName;

  createUploadGrant(request: UploadGrantRequest): Promise<UploadGrant>;

  /**
   * Turn what the browser reports after uploading into a canonical key,
   * verifying it belongs under `prefix`. Returns null when the reference is
   * malformed, hosted elsewhere, or escapes the prefix.
   */
  resolveUploadedKey(reference: string, prefix: string): string | null;

  /** A URL the current viewer may fetch the object from. */
  getReadUrl(key: string, options?: { expiresIn?: number }): Promise<string>;

  deleteObject(key: string): Promise<void>;
}
