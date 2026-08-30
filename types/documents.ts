/**
 * Shared types for official association paperwork.
 *
 * These cross the server/client boundary, so dates are ISO strings.
 */

export type DocumentKind =
  | "ENTRY_FORM"
  | "TECH_INSPECTION"
  | "MEDICAL_CERTIFICATE"
  | "RESULTS_SHEET"
  | "OTHER";

export type DocumentView = {
  id: string;
  kind: DocumentKind;
  title: string;
  /**
   * Viewer-scoped read URL from lib/storage — a short-lived signed link on
   * S3, the capability URL on Vercel Blob. Null when the provider that holds
   * the file is no longer configured. Never surfaced on a public page.
   */
  url: string | null;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  /** Null for association-wide paperwork. */
  team: { id: string; name: string } | null;
  uploaderName: string;
  canRemove: boolean;
};
