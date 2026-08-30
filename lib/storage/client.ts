"use client";

import type { UploadGrant } from "@/lib/storage/types";

/**
 * Browser side of the storage seam. Components call this and never learn
 * which provider is behind it: it asks the feature's grant route for
 * permission, sends the bytes straight to storage, and returns the reference
 * the finalize server action expects.
 *
 * Progress is `null` while the grant is being negotiated and 0–100 while the
 * body is in flight, so a caller can draw an indeterminate bar for "starting"
 * and a determinate one for "43% sent".
 */

export interface UploadToStorageOptions {
  /** The feature's grant route, e.g. `/api/leagues/{id}/documents/upload`. */
  grantUrl: string;
  file: File;
  onProgress?: (percentage: number | null) => void;
}

export interface UploadToStorageResult {
  /** Pass this to the finalize action as `key`. */
  key: string;
}

async function requestGrant(grantUrl: string, file: File): Promise<UploadGrant> {
  const response = await fetch(grantUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, sizeBytes: file.size }),
  });
  const payload = (await response.json().catch(() => null)) as
    | UploadGrant
    | { error?: string }
    | null;
  if (!response.ok || !payload || !("provider" in payload)) {
    const message =
      payload && "error" in payload && payload.error ? payload.error : "Could not start the upload.";
    throw new Error(message);
  }
  return payload;
}

function putWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percentage: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(file);
  });
}

export async function uploadToStorage(
  options: UploadToStorageOptions
): Promise<UploadToStorageResult> {
  const { grantUrl, file, onProgress } = options;
  onProgress?.(null);

  const grant = await requestGrant(grantUrl, file);

  if (grant.provider === "s3") {
    onProgress?.(0);
    await putWithProgress(grant.uploadUrl, file, grant.headers, onProgress);
    return { key: grant.key };
  }

  // Vercel Blob performs its own token exchange against the same grant route.
  const { upload } = await import("@vercel/blob/client");
  const blob = await upload(grant.pathname, file, {
    access: "public",
    handleUploadUrl: grantUrl,
    contentType: file.type,
    onUploadProgress: (event) => onProgress?.(event.percentage),
  });
  return { key: blob.url };
}
