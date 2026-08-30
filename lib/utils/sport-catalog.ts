import type { AgeClassification, ScheduleFormat, Sport, SurfaceType } from "@prisma/client";
import { AGE_CLASSIFICATION_LABELS, AGE_CLASSIFICATION_OPTIONS } from "@/lib/utils/age-level";

/**
 * Sport capability catalog keyed by the Prisma `Sport` enum.
 *
 * Spartan is a motorsport-only platform (ADR-0012): MOTORSPORT is the sole
 * `Sport` value, and its entry carries circuit terminology and the
 * CIRCUIT/TRACK/PADDOCK surface types.
 *
 * Surface subdivision is a property of the physical surface, not the sport:
 * segmentation presets key off `SurfaceType` in `lib/utils/segment-presets.ts`
 * (feature 006, research R7) and games reference `SurfaceSegment` rows.
 *
 * The catalog is code, not data: type-safe, testable, and liftable to the
 * database later without changing call sites (research R3).
 */
export type SportCapabilities = {
  sport: Sport;
  sportLabel: string;
  surfaceLabel: string;
  /** Surface types this sport competes on; drives the default pick in surface forms. */
  surfaceTypes: SurfaceType[];
  ageClassifications: { value: AgeClassification; label: string }[];
  suggestedFormats: ScheduleFormat[];
};

export const SCHEDULE_FORMAT_LABELS: Record<ScheduleFormat, string> = {
  ROUND_ROBIN: "Round robin",
  SINGLE_ELIMINATION: "Single elimination",
  DOUBLE_ELIMINATION: "Double elimination",
  POOL_PLAY: "Pool play",
  LADDER: "Ladder",
  CUSTOM: "Custom",
};

/** Formats the platform can generate schedules for (others are label-only). */
export const GENERATIVE_FORMATS: ReadonlySet<ScheduleFormat> = new Set<ScheduleFormat>([
  "ROUND_ROBIN",
]);

const SPORT_LABELS: Record<Sport, string> = {
  MOTORSPORT: "Motorsport",
};

// Motorsport competes on a circuit, and a championship round is a single
// multi-entrant grid rather than a fixture between two teams — so no
// head-to-head format is suggested. Rounds and points live on RaceRound /
// RaceResult, not on the two-team SeasonGame schedule generator.
const MOTORSPORT_CAPABILITIES: SportCapabilities = {
  sport: "MOTORSPORT",
  sportLabel: SPORT_LABELS.MOTORSPORT,
  surfaceLabel: "Circuit",
  surfaceTypes: ["CIRCUIT", "TRACK", "PADDOCK"],
  ageClassifications: AGE_CLASSIFICATION_OPTIONS.map((value) => ({
    value,
    label: AGE_CLASSIFICATION_LABELS[value],
  })),
  suggestedFormats: ["CUSTOM"],
};

const SPORT_CATALOG: Record<Sport, SportCapabilities> = {
  MOTORSPORT: MOTORSPORT_CAPABILITIES,
};

/**
 * Resolve capabilities for a sport. Unknown context (null/undefined) resolves
 * to the motorsport entry so callers never need to branch.
 */
export function getSportCapabilities(sport: Sport | null | undefined): SportCapabilities {
  return SPORT_CATALOG[sport ?? "MOTORSPORT"];
}
