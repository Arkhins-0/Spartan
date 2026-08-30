import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireUserId,
  mockIsTeamAdmin,
  mockIsStorageEnabled,
  mockDeleteObject,
  mockPrisma,
} = vi.hoisted(() => ({
  mockRequireUserId: vi.fn(),
  mockIsTeamAdmin: vi.fn(),
  mockIsStorageEnabled: vi.fn(() => true),
  mockDeleteObject: vi.fn((_ref: unknown) => Promise.resolve()),
  mockPrisma: {
    leagueUser: { count: vi.fn() },
    league: { findFirst: vi.fn() },
    team: { findFirst: vi.fn() },
    teamMember: { findMany: vi.fn() },
    document: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireUserId: (...args: unknown[]) => mockRequireUserId(...args),
  isTeamAdmin: (...args: unknown[]) => mockIsTeamAdmin(...args),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// The seam is exercised through the Vercel Blob provider's real reference
// validation (host allowlist + prefix anchoring); only configuration and the
// side-effecting calls are stubbed.
vi.mock("@/lib/storage", async () => {
  const { vercelBlobProvider } = await vi.importActual<
    typeof import("@/lib/storage/vercel-blob")
  >("@/lib/storage/vercel-blob");
  return {
    isStorageEnabled: () => mockIsStorageEnabled(),
    resolveStorageProvider: () => "vercel-blob",
    resolveUploadedRef: (reference: string, prefix: string) => {
      const key = vercelBlobProvider.resolveUploadedKey(reference, prefix);
      return key ? { provider: "vercel-blob", key } : null;
    },
    getReadUrl: async (ref: { key: string }) => ref.key,
    deleteObjectBestEffort: (ref: unknown) => mockDeleteObject(ref),
    toStorageProviderName: (value: string) => (value === "s3" ? "s3" : "vercel-blob"),
  };
});

import {
  finalizeDocumentUpload,
  listDocuments,
  removeDocument,
} from "@/lib/actions/documents";

const USER_ID = "cluser0000000000000001";
const OTHER_USER = "cluser0000000000000002";
const LEAGUE_ID = "clleague0000000000000001";
const OTHER_LEAGUE = "clleague0000000000000002";
const TEAM_A = "clteama00000000000000001";
const DOC_ID = "cldoc00000000000000001";

const validUrl = `https://abc123.public.blob.vercel-storage.com/leagues/${LEAGUE_ID}/documents/entry-form-x1.pdf`;

const baseInput = {
  leagueId: LEAGUE_ID,
  kind: "ENTRY_FORM" as const,
  title: "Entry form",
  key: validUrl,
  contentType: "application/pdf",
  sizeBytes: 512_000,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUserId.mockResolvedValue(USER_ID);
  mockIsStorageEnabled.mockReturnValue(true);
  mockPrisma.leagueUser.count.mockResolvedValue(1);
  mockPrisma.league.findFirst.mockResolvedValue({ id: LEAGUE_ID });
  mockPrisma.document.findFirst.mockResolvedValue(null);
  mockPrisma.document.create.mockResolvedValue({ id: DOC_ID });
});

describe("finalizeDocumentUpload", () => {
  it("records a valid upload", async () => {
    const result = await finalizeDocumentUpload(baseInput);

    expect(result).toEqual({ success: true, data: { documentId: DOC_ID } });
  });

  it("fails visibly when storage is not configured", async () => {
    mockIsStorageEnabled.mockReturnValue(false);

    const result = await finalizeDocumentUpload(baseInput);

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining("not configured"),
    });
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });

  it("rejects a URL from outside Vercel Blob", async () => {
    const result = await finalizeDocumentUpload({
      ...baseInput,
      key: "https://evil.example.com/leagues/x/documents/fake.pdf",
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });

  it("rejects a blob URL filed under a different association", async () => {
    const result = await finalizeDocumentUpload({
      ...baseInput,
      key: `https://abc123.public.blob.vercel-storage.com/leagues/${OTHER_LEAGUE}/documents/x.pdf`,
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });

  it("rejects an unsupported content type", async () => {
    const result = await finalizeDocumentUpload({
      ...baseInput,
      contentType: "application/x-msdownload",
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });

  it("rejects a file over the size cap", async () => {
    const result = await finalizeDocumentUpload({
      ...baseInput,
      sizeBytes: 40 * 1024 * 1024,
    });

    expect(result.success).toBe(false);
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });

  it("is idempotent when the same object is finalized twice", async () => {
    mockPrisma.document.findFirst.mockResolvedValue({ id: DOC_ID });

    const result = await finalizeDocumentUpload(baseInput);

    expect(result).toEqual({ success: true, data: { documentId: DOC_ID } });
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });

  it("stops a non-admin from filing association-wide paperwork", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await finalizeDocumentUpload(baseInput);

    expect(result.success).toBe(false);
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });

  it("lets a team admin file for their own team", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);
    mockIsTeamAdmin.mockResolvedValue(true);
    mockPrisma.team.findFirst.mockResolvedValue({ id: TEAM_A });

    const result = await finalizeDocumentUpload({ ...baseInput, teamId: TEAM_A });

    expect(result.success).toBe(true);
  });

  it("stops a team admin filing for a team in another association", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);
    mockIsTeamAdmin.mockResolvedValue(true);
    mockPrisma.team.findFirst.mockResolvedValue(null);

    const result = await finalizeDocumentUpload({ ...baseInput, teamId: TEAM_A });

    expect(result.success).toBe(false);
    expect(mockPrisma.document.create).not.toHaveBeenCalled();
  });
});

describe("listDocuments", () => {
  it("scopes a team admin to their own teams and association-wide docs", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);
    mockPrisma.teamMember.findMany.mockResolvedValue([{ teamId: TEAM_A }]);
    mockPrisma.document.findMany.mockResolvedValue([]);

    const result = await listDocuments({ leagueId: LEAGUE_ID });

    expect(result.success).toBe(true);
    const where = mockPrisma.document.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ teamId: { in: [TEAM_A] } }, { teamId: null }]);
  });

  it("does not scope an association admin", async () => {
    mockPrisma.document.findMany.mockResolvedValue([]);

    const result = await listDocuments({ leagueId: LEAGUE_ID });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.canUploadForLeague).toBe(true);
    expect(mockPrisma.document.findMany.mock.calls[0][0].where.OR).toBeUndefined();
  });

  it("rejects someone with no standing in the association", async () => {
    mockPrisma.leagueUser.count.mockResolvedValue(0);
    mockPrisma.teamMember.findMany.mockResolvedValue([]);

    const result = await listDocuments({ leagueId: LEAGUE_ID });

    expect(result.success).toBe(false);
    expect(mockPrisma.document.findMany).not.toHaveBeenCalled();
  });
});

describe("removeDocument", () => {
  const activeDocument = {
    id: DOC_ID,
    leagueId: LEAGUE_ID,
    uploaderId: OTHER_USER,
    storageProvider: "vercel-blob",
    storageKey: validUrl,
    status: "ACTIVE" as const,
  };

  it("soft-deletes and removes the object best-effort", async () => {
    mockPrisma.document.findUnique.mockResolvedValue(activeDocument);

    const result = await removeDocument({ documentId: DOC_ID });

    expect(result.success).toBe(true);
    expect(mockPrisma.document.update.mock.calls[0][0].data.status).toBe("REMOVED");
    expect(mockDeleteObject).toHaveBeenCalledWith({ provider: "vercel-blob", key: validUrl });
  });

  it("stops someone who neither administers the association nor uploaded it", async () => {
    mockPrisma.document.findUnique.mockResolvedValue(activeDocument);
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await removeDocument({ documentId: DOC_ID });

    expect(result.success).toBe(false);
    expect(mockPrisma.document.update).not.toHaveBeenCalled();
  });

  it("lets the uploader withdraw their own filing", async () => {
    mockPrisma.document.findUnique.mockResolvedValue({
      ...activeDocument,
      uploaderId: USER_ID,
    });
    mockPrisma.leagueUser.count.mockResolvedValue(0);

    const result = await removeDocument({ documentId: DOC_ID });

    expect(result.success).toBe(true);
  });

  it("treats an already-removed document as missing", async () => {
    mockPrisma.document.findUnique.mockResolvedValue({
      ...activeDocument,
      status: "REMOVED",
    });

    const result = await removeDocument({ documentId: DOC_ID });

    expect(result.success).toBe(false);
    expect(mockPrisma.document.update).not.toHaveBeenCalled();
  });
});
