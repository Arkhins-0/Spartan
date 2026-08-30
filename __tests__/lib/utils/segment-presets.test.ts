import { describe, expect, it } from "vitest";
import { SurfaceType } from "@prisma/client";
import {
  getSegmentationPreset,
  getWholeSurfaceDefaultLabel,
} from "@/lib/utils/segment-presets";
import type { SegmentGeometry } from "@/types/segments";

const ALL_SURFACE_TYPES = Object.values(SurfaceType);
const PRESETLESS_SURFACE_TYPES = ALL_SURFACE_TYPES.filter(
  (surfaceType) => surfaceType !== "CIRCUIT" && surfaceType !== "PADDOCK"
);

/** Canonical key for an unordered role pair. */
function pairKey(a: string, b: string): string {
  return [a, b].sort().join("+");
}

function toPairKeySet(pairs: [string, string][]): Set<string> {
  return new Set(pairs.map(([a, b]) => pairKey(a, b)));
}

function rectContains(outer: SegmentGeometry, inner: SegmentGeometry): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

describe("segment-presets", () => {
  describe("CIRCUIT preset", () => {
    const preset = getSegmentationPreset("CIRCUIT");
    if (!preset) throw new Error("CIRCUIT preset must exist");
    const byRole = new Map(preset.segments.map((segment) => [segment.role, segment]));

    it("has exactly six segments with unique roles", () => {
      expect(preset.segments).toHaveLength(6);
      expect(byRole.size).toBe(6);
      expect([...byRole.keys()].sort()).toEqual([
        "CROSS_1",
        "CROSS_2",
        "CROSS_3",
        "CROSS_4",
        "HALF_A",
        "HALF_B",
      ]);
    });

    it("uses HALF kind for loops and CROSS kind for sectors", () => {
      expect(byRole.get("HALF_A")?.kind).toBe("HALF");
      expect(byRole.get("HALF_B")?.kind).toBe("HALF");
      for (const role of ["CROSS_1", "CROSS_2", "CROSS_3", "CROSS_4"]) {
        expect(byRole.get(role)?.kind).toBe("CROSS");
      }
    });

    it("assigns the documented default names", () => {
      expect(byRole.get("HALF_A")?.defaultName).toBe("National loop");
      expect(byRole.get("HALF_B")?.defaultName).toBe("Club loop");
      expect(byRole.get("CROSS_1")?.defaultName).toBe("Sector 1");
      expect(byRole.get("CROSS_4")?.defaultName).toBe("Sector 4");
    });

    it.each(["HALF_A", "HALF_B", "CROSS_1", "CROSS_2", "CROSS_3", "CROSS_4"])(
      "%s geometry stays within normalized [0,1] bounds",
      (role) => {
        const geometry = byRole.get(role)?.geometry;
        if (!geometry) throw new Error(`missing geometry for ${role}`);
        expect(geometry.x).toBeGreaterThanOrEqual(0);
        expect(geometry.y).toBeGreaterThanOrEqual(0);
        expect(geometry.w).toBeGreaterThan(0);
        expect(geometry.h).toBeGreaterThan(0);
        expect(geometry.x + geometry.w).toBeLessThanOrEqual(1);
        expect(geometry.y + geometry.h).toBeLessThanOrEqual(1);
        expect(geometry.rotation).toBeGreaterThanOrEqual(0);
        expect(geometry.rotation).toBeLessThan(360);
      }
    );

    it("places sectors 1-2 inside HALF_A and 3-4 inside HALF_B", () => {
      const halfA = byRole.get("HALF_A")!.geometry;
      const halfB = byRole.get("HALF_B")!.geometry;
      expect(rectContains(halfA, byRole.get("CROSS_1")!.geometry)).toBe(true);
      expect(rectContains(halfA, byRole.get("CROSS_2")!.geometry)).toBe(true);
      expect(rectContains(halfB, byRole.get("CROSS_3")!.geometry)).toBe(true);
      expect(rectContains(halfB, byRole.get("CROSS_4")!.geometry)).toBe(true);
      // Geometry agrees with the declarations: zones 1-2 are NOT inside the
      // club loop, sectors 3-4 are NOT inside the national loop.
      expect(rectContains(halfB, byRole.get("CROSS_1")!.geometry)).toBe(false);
      expect(rectContains(halfB, byRole.get("CROSS_2")!.geometry)).toBe(false);
      expect(rectContains(halfA, byRole.get("CROSS_3")!.geometry)).toBe(false);
      expect(rectContains(halfA, byRole.get("CROSS_4")!.geometry)).toBe(false);
    });

    it("lists each unordered coexistence pair exactly once", () => {
      const keys = toPairKeySet(preset.coexistingRolePairs);
      expect(keys.size).toBe(preset.coexistingRolePairs.length);
    });

    it("declares exactly the FR-006 coexistence matrix", () => {
      const expected = new Set([
        pairKey("HALF_A", "HALF_B"),
        pairKey("CROSS_1", "CROSS_2"),
        pairKey("CROSS_1", "CROSS_3"),
        pairKey("CROSS_1", "CROSS_4"),
        pairKey("CROSS_2", "CROSS_3"),
        pairKey("CROSS_2", "CROSS_4"),
        pairKey("CROSS_3", "CROSS_4"),
        pairKey("CROSS_1", "HALF_B"),
        pairKey("CROSS_2", "HALF_B"),
        pairKey("CROSS_3", "HALF_A"),
        pairKey("CROSS_4", "HALF_A"),
      ]);
      expect(toPairKeySet(preset.coexistingRolePairs)).toEqual(expected);
    });

    it("coexists loops with each other and sectors across loops", () => {
      const keys = toPairKeySet(preset.coexistingRolePairs);
      expect(keys.has(pairKey("HALF_A", "HALF_B"))).toBe(true);
      expect(keys.has(pairKey("CROSS_1", "CROSS_3"))).toBe(true);
      expect(keys.has(pairKey("CROSS_1", "HALF_B"))).toBe(true);
    });

    it("does NOT coexist a sector with its containing loop", () => {
      const keys = toPairKeySet(preset.coexistingRolePairs);
      expect(keys.has(pairKey("CROSS_1", "HALF_A"))).toBe(false);
      expect(keys.has(pairKey("CROSS_2", "HALF_A"))).toBe(false);
      expect(keys.has(pairKey("CROSS_3", "HALF_B"))).toBe(false);
      expect(keys.has(pairKey("CROSS_4", "HALF_B"))).toBe(false);
    });
  });

  describe("PADDOCK preset", () => {
    const preset = getSegmentationPreset("PADDOCK");
    if (!preset) throw new Error("PADDOCK preset must exist");

    it("has exactly four quarter segments named Paddock A-D", () => {
      expect(preset.segments).toHaveLength(4);
      const roles = preset.segments.map((segment) => segment.role).sort();
      expect(roles).toEqual(["CROSS_1", "CROSS_2", "CROSS_3", "CROSS_4"]);
      for (const segment of preset.segments) {
        expect(segment.kind).toBe("CROSS");
        expect(segment.geometry.w).toBe(0.5);
        expect(segment.geometry.h).toBe(0.5);
      }
      const names = preset.segments.map((segment) => segment.defaultName).sort();
      expect(names).toEqual(["Paddock A", "Paddock B", "Paddock C", "Paddock D"]);
    });

    it("declares every quarter pair as coexisting", () => {
      expect(preset.coexistingRolePairs).toHaveLength(6);
      expect(toPairKeySet(preset.coexistingRolePairs)).toEqual(
        new Set([
          pairKey("CROSS_1", "CROSS_2"),
          pairKey("CROSS_1", "CROSS_3"),
          pairKey("CROSS_1", "CROSS_4"),
          pairKey("CROSS_2", "CROSS_3"),
          pairKey("CROSS_2", "CROSS_4"),
          pairKey("CROSS_3", "CROSS_4"),
        ])
      );
    });
  });

  describe("surface types without presets", () => {
    it.each(PRESETLESS_SURFACE_TYPES)("%s returns null (whole surface only)", (surfaceType) => {
      expect(getSegmentationPreset(surfaceType)).toBeNull();
    });
  });

  describe("getWholeSurfaceDefaultLabel", () => {
    it("labels the motorsport surface types by their own noun", () => {
      expect(getWholeSurfaceDefaultLabel("CIRCUIT")).toBe("Full circuit");
      expect(getWholeSurfaceDefaultLabel("TRACK")).toBe("Full track");
      expect(getWholeSurfaceDefaultLabel("PADDOCK")).toBe("Whole paddock");
    });

    it("labels OTHER as Whole surface", () => {
      expect(getWholeSurfaceDefaultLabel("OTHER")).toBe("Whole surface");
    });

    it.each(
      PRESETLESS_SURFACE_TYPES.filter(
        (surfaceType) => !["CIRCUIT", "TRACK", "PADDOCK"].includes(surfaceType)
      )
    )("%s falls back to Whole surface", (surfaceType) => {
      expect(getWholeSurfaceDefaultLabel(surfaceType)).toBe("Whole surface");
    });
  });
});
