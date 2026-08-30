import type { AgeClassification } from "@prisma/client";

/**
 * Ordered ranks for age/level classifications. Game scores and statistics are
 * only allowed at or above the platform's minimum level (no scores/stats at
 * U8 and below by default).
 *
 * This module is client-safe on purpose (no env access) — server callers pass
 * the configured threshold (env STATS_MIN_AGE_LEVEL) into isStatsEligible.
 */
export const AGE_CLASSIFICATION_RANK: Record<AgeClassification, number> = {
  U6: 1,
  U8: 2,
  U10: 3,
  U12: 4,
  U14: 5,
  U16: 6,
  U18: 7,
  JUNIOR: 8,
  ADULT: 9,
  OPEN: 10,
};

export const AGE_CLASSIFICATION_LABELS: Record<AgeClassification, string> = {
  U6: "U6",
  U8: "U8",
  U10: "U10",
  U12: "U12",
  U14: "U14",
  U16: "U16",
  U18: "U18",
  JUNIOR: "Junior",
  ADULT: "Adult",
  OPEN: "Open / All ages",
};

export const AGE_CLASSIFICATION_OPTIONS = (
  Object.keys(AGE_CLASSIFICATION_RANK) as AgeClassification[]
).sort((left, right) => AGE_CLASSIFICATION_RANK[left] - AGE_CLASSIFICATION_RANK[right]);

export const DEFAULT_STATS_MIN_AGE_LEVEL: AgeClassification = "U10";

/**
 * Whether game scores/outcomes/statistics may be recorded and displayed for an
 * event at the given classification. Server callers pass the configured
 * STATS_MIN_AGE_LEVEL; the default blocks U8 and below.
 */
export function isStatsEligible(
  classification: AgeClassification,
  minimumLevel: AgeClassification = DEFAULT_STATS_MIN_AGE_LEVEL
): boolean {
  return AGE_CLASSIFICATION_RANK[classification] >= AGE_CLASSIFICATION_RANK[minimumLevel];
}
