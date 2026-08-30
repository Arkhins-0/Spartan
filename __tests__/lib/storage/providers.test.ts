import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {} as Record<string, string | undefined>,
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
  isProduction: false,
  isDevelopment: false,
  isTest: true,
}));

vi.mock("@vercel/blob", () => ({ del: vi.fn() }));

import { resolveStorageProvider, resolveUploadedRef } from "@/lib/storage";
import { isValidS3Key, s3Provider } from "@/lib/storage/s3";
import { vercelBlobProvider } from "@/lib/storage/vercel-blob";
import { documentPrefix, extensionForContentType } from "@/lib/storage/policy";

const LEAGUE_ID = "clleague0000000000000001";
const PREFIX = documentPrefix(LEAGUE_ID);

function setEnv(values: Record<string, string | undefined>) {
  for (const key of Object.keys(mockEnv)) delete mockEnv[key];
  Object.assign(mockEnv, values);
}

describe("resolveStorageProvider", () => {
  beforeEach(() => setEnv({}));

  it("is disabled when nothing is configured", () => {
    expect(resolveStorageProvider()).toBeNull();
  });

  it("infers s3 from a bucket, and prefers it over a blob token", () => {
    setEnv({ S3_BUCKET: "spartan", BLOB_READ_WRITE_TOKEN: "tok" });
    expect(resolveStorageProvider()).toBe("s3");
  });

  it("infers vercel-blob from a token alone", () => {
    setEnv({ BLOB_READ_WRITE_TOKEN: "tok" });
    expect(resolveStorageProvider()).toBe("vercel-blob");
  });

  it("honours an explicit selection, including 'none'", () => {
    setEnv({ STORAGE_PROVIDER: "vercel-blob", S3_BUCKET: "spartan", BLOB_READ_WRITE_TOKEN: "tok" });
    expect(resolveStorageProvider()).toBe("vercel-blob");
    setEnv({ STORAGE_PROVIDER: "none", S3_BUCKET: "spartan" });
    expect(resolveStorageProvider()).toBeNull();
  });
});

describe("s3 provider references", () => {
  it("accepts a well-formed key under the prefix", () => {
    const key = `${PREFIX}0f3d8e9a-1b2c-4d5e-8f90-abcdef123456.pdf`;
    expect(s3Provider.resolveUploadedKey(key, PREFIX)).toBe(key);
  });

  it("rejects keys that escape the prefix or carry traversal", () => {
    expect(s3Provider.resolveUploadedKey(`leagues/other/documents/x.pdf`, PREFIX)).toBeNull();
    expect(s3Provider.resolveUploadedKey(`${PREFIX}../../secret.pdf`, PREFIX)).toBeNull();
    expect(s3Provider.resolveUploadedKey(`/${PREFIX}x.pdf`, PREFIX)).toBeNull();
    expect(s3Provider.resolveUploadedKey(`${PREFIX}x y.pdf`, PREFIX)).toBeNull();
    expect(s3Provider.resolveUploadedKey(`https://bucket.s3.amazonaws.com/${PREFIX}x.pdf`, PREFIX)).toBeNull();
  });

  it("validates the key alphabet", () => {
    expect(isValidS3Key("a/b/c.pdf")).toBe(true);
    expect(isValidS3Key("")).toBe(false);
    expect(isValidS3Key("a//b.pdf")).toBe(false);
    expect(isValidS3Key("a/../b.pdf")).toBe(false);
    expect(isValidS3Key("a/b?.pdf")).toBe(false);
  });

  it("refuses to mint a grant for a content type it cannot name an extension for", async () => {
    setEnv({ S3_BUCKET: "spartan", S3_REGION: "us-east-1" });
    await expect(
      s3Provider.createUploadGrant({ prefix: PREFIX, contentType: "application/x-msdownload", sizeBytes: 10 })
    ).rejects.toThrow(/Unsupported content type/);
  });

  it("mints a presigned PUT whose key is a UUID under the prefix", async () => {
    setEnv({
      S3_BUCKET: "spartan",
      S3_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "AKIATEST",
      AWS_SECRET_ACCESS_KEY: "secret",
    });
    process.env.AWS_ACCESS_KEY_ID = "AKIATEST";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";

    const grant = await s3Provider.createUploadGrant({
      prefix: PREFIX,
      contentType: "application/pdf",
      sizeBytes: 1234,
    });

    expect(grant.provider).toBe("s3");
    if (grant.provider !== "s3") return;
    expect(grant.key).toMatch(
      new RegExp(`^${PREFIX}[0-9a-f-]{36}\\.pdf$`)
    );
    expect(grant.headers).toEqual({ "Content-Type": "application/pdf" });
    const url = new URL(grant.uploadUrl);
    expect(url.pathname).toBe(`/${grant.key}`);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("60");
    // Both headers stay in the signature so S3 rejects a mismatched PUT.
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("content-length");
  });
});

describe("vercel-blob provider references", () => {
  it("accepts a blob URL under the prefix and stores the URL as the key", () => {
    const url = `https://abc.public.blob.vercel-storage.com/${PREFIX}entry-x1.pdf`;
    expect(vercelBlobProvider.resolveUploadedKey(url, PREFIX)).toBe(url);
  });

  it("rejects foreign hosts, http, and prefix escapes", () => {
    expect(
      vercelBlobProvider.resolveUploadedKey(`https://evil.example/${PREFIX}x.pdf`, PREFIX)
    ).toBeNull();
    expect(
      vercelBlobProvider.resolveUploadedKey(`http://abc.public.blob.vercel-storage.com/${PREFIX}x.pdf`, PREFIX)
    ).toBeNull();
    expect(
      vercelBlobProvider.resolveUploadedKey(
        `https://abc.public.blob.vercel-storage.com/elsewhere/${PREFIX}x.pdf`,
        PREFIX
      )
    ).toBeNull();
    expect(vercelBlobProvider.resolveUploadedKey("not a url", PREFIX)).toBeNull();
  });
});

describe("resolveUploadedRef", () => {
  it("validates against the ACTIVE provider only", () => {
    const blobUrl = `https://abc.public.blob.vercel-storage.com/${PREFIX}x.pdf`;
    const s3Key = `${PREFIX}x.pdf`;

    setEnv({ S3_BUCKET: "spartan" });
    expect(resolveUploadedRef(s3Key, PREFIX)).toEqual({ provider: "s3", key: s3Key });
    expect(resolveUploadedRef(blobUrl, PREFIX)).toBeNull();

    setEnv({ BLOB_READ_WRITE_TOKEN: "tok" });
    expect(resolveUploadedRef(blobUrl, PREFIX)).toEqual({ provider: "vercel-blob", key: blobUrl });
    expect(resolveUploadedRef(s3Key, PREFIX)).toBeNull();

    setEnv({});
    expect(resolveUploadedRef(s3Key, PREFIX)).toBeNull();
  });
});

describe("extensionForContentType", () => {
  it("maps every allowed type and nothing else", () => {
    expect(extensionForContentType("application/pdf")).toBe("pdf");
    expect(extensionForContentType("image/jpeg")).toBe("jpg");
    expect(extensionForContentType("video/quicktime")).toBe("mov");
    expect(extensionForContentType("text/html")).toBeNull();
  });
});
