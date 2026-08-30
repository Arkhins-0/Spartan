import type { SegmentKind, SurfaceType } from "@prisma/client";
import type { SegmentGeometry } from "@/types/segments";

/**
 * Segmentation presets by surface type (FR-004).
 *
 * - CIRCUIT: two loops (HALF_A "National loop", HALF_B "Club loop") plus
 *   four sectors (CROSS_1..CROSS_4, one quarter each). The preset's
 *   "full circuit" is the implicit whole-surface segment (`segmentId: null`) —
 *   it is never materialized as a row, so no preset entry exists for it.
 * - PADDOCK: four quarter zones (CROSS_1..CROSS_4, "Paddock A".."Paddock D")
 *   that all coexist with one another.
 * - All other surface types (TRACK, ROOM, OTHER): no preset (whole surface
 *   only).
 *
 * Coexistence relationships follow FR-006: the two loops coexist with each
 * other; all four sectors coexist with one another and with the opposite
 * loop; every sector conflicts with its containing loop (the pair is
 * simply absent — undeclared pairs conflict); and the whole-surface segment
 * conflicts with everything implicitly, so it needs no pairs here.
 *
 * Geometry is authoring/display input only ("geometry proposes, declarations
 * decide") — the coexistence pairs below are the sole source of conflict
 * truth when the preset is applied.
 */
export type PresetSegmentDef = {
  /** Stable preset role: "HALF_A" | "HALF_B" | "CROSS_1".."CROSS_4". */
  role: string;
  /** Default display name; individually renameable after application. */
  defaultName: string;
  /** HALF or CROSS. */
  kind: SegmentKind;
  /** Normalized standard position on the surface schematic. */
  geometry: SegmentGeometry;
};

export type SegmentationPreset = {
  segments: PresetSegmentDef[];
  /**
   * Role pairs that coexist (bookable at overlapping times without
   * conflict). Each unordered pair is listed exactly once; any pair not
   * listed conflicts (FR-006).
   */
  coexistingRolePairs: [string, string][];
};

const CIRCUIT_PRESET: SegmentationPreset = {
  segments: [
    {
      role: "HALF_A",
      defaultName: "National loop",
      kind: "HALF",
      geometry: { x: 0, y: 0, w: 1, h: 0.5, rotation: 0 },
    },
    {
      role: "HALF_B",
      defaultName: "Club loop",
      kind: "HALF",
      geometry: { x: 0, y: 0.5, w: 1, h: 0.5, rotation: 0 },
    },
    {
      role: "CROSS_1",
      defaultName: "Sector 1",
      kind: "CROSS",
      geometry: { x: 0, y: 0, w: 0.5, h: 0.5, rotation: 0 },
    },
    {
      role: "CROSS_2",
      defaultName: "Sector 2",
      kind: "CROSS",
      geometry: { x: 0.5, y: 0, w: 0.5, h: 0.5, rotation: 0 },
    },
    {
      role: "CROSS_3",
      defaultName: "Sector 3",
      kind: "CROSS",
      geometry: { x: 0, y: 0.5, w: 0.5, h: 0.5, rotation: 0 },
    },
    {
      role: "CROSS_4",
      defaultName: "Sector 4",
      kind: "CROSS",
      geometry: { x: 0.5, y: 0.5, w: 0.5, h: 0.5, rotation: 0 },
    },
  ],
  coexistingRolePairs: [
    // The two loops coexist with each other.
    ["HALF_A", "HALF_B"],
    // All four sectors coexist with one another.
    ["CROSS_1", "CROSS_2"],
    ["CROSS_1", "CROSS_3"],
    ["CROSS_1", "CROSS_4"],
    ["CROSS_2", "CROSS_3"],
    ["CROSS_2", "CROSS_4"],
    ["CROSS_3", "CROSS_4"],
    // Each sector coexists with the opposite loop only; the pair with
    // its containing loop is intentionally absent (conflict).
    ["CROSS_1", "HALF_B"],
    ["CROSS_2", "HALF_B"],
    ["CROSS_3", "HALF_A"],
    ["CROSS_4", "HALF_A"],
  ],
};

const PADDOCK_PRESET: SegmentationPreset = {
  segments: [
    {
      role: "CROSS_1",
      defaultName: "Paddock A",
      kind: "CROSS",
      geometry: { x: 0, y: 0, w: 0.5, h: 0.5, rotation: 0 },
    },
    {
      role: "CROSS_2",
      defaultName: "Paddock B",
      kind: "CROSS",
      geometry: { x: 0.5, y: 0, w: 0.5, h: 0.5, rotation: 0 },
    },
    {
      role: "CROSS_3",
      defaultName: "Paddock C",
      kind: "CROSS",
      geometry: { x: 0, y: 0.5, w: 0.5, h: 0.5, rotation: 0 },
    },
    {
      role: "CROSS_4",
      defaultName: "Paddock D",
      kind: "CROSS",
      geometry: { x: 0.5, y: 0.5, w: 0.5, h: 0.5, rotation: 0 },
    },
  ],
  coexistingRolePairs: [
    // All four paddock quarters coexist with one another.
    ["CROSS_1", "CROSS_2"],
    ["CROSS_1", "CROSS_3"],
    ["CROSS_1", "CROSS_4"],
    ["CROSS_2", "CROSS_3"],
    ["CROSS_2", "CROSS_4"],
    ["CROSS_3", "CROSS_4"],
  ],
};

/**
 * Returns the segmentation preset for a surface type (FR-004), or null when
 * the type has no preset (whole surface only).
 */
export function getSegmentationPreset(
  surfaceType: SurfaceType
): SegmentationPreset | null {
  switch (surfaceType) {
    case "CIRCUIT":
      return CIRCUIT_PRESET;
    case "PADDOCK":
      return PADDOCK_PRESET;
    default:
      return null;
  }
}

/**
 * Default display label for the implicit whole-surface segment
 * (overridable via `VenueSurface.wholeLabel`).
 */
export function getWholeSurfaceDefaultLabel(surfaceType: SurfaceType): string {
  switch (surfaceType) {
    case "CIRCUIT":
      return "Full circuit";
    case "TRACK":
      return "Full track";
    case "PADDOCK":
      return "Whole paddock";
    default:
      return "Whole surface";
  }
}
