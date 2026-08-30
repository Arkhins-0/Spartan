import { describe, expect, it } from "vitest";
import {
  AGE_CLASSIFICATION_OPTIONS,
  AGE_CLASSIFICATION_RANK,
  AGE_CLASSIFICATION_LABELS,
  isStatsEligible,
} from "@/lib/utils/age-level";

describe("age-level", () => {
  it("orders classifications from youngest to oldest", () => {
    expect(AGE_CLASSIFICATION_OPTIONS[0]).toBe("U6");
    expect(AGE_CLASSIFICATION_OPTIONS[1]).toBe("U8");
    expect(AGE_CLASSIFICATION_OPTIONS[2]).toBe("U10");
    const ranks = AGE_CLASSIFICATION_OPTIONS.map((level) => AGE_CLASSIFICATION_RANK[level]);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });

  it("has a label for every classification", () => {
    for (const level of AGE_CLASSIFICATION_OPTIONS) {
      expect(AGE_CLASSIFICATION_LABELS[level]).toBeTruthy();
    }
  });

  describe("isStatsEligible (default threshold U10)", () => {
    it("blocks U8 and below", () => {
      expect(isStatsEligible("U6")).toBe(false);
      expect(isStatsEligible("U8")).toBe(false);
    });

    it("allows U10 and above", () => {
      expect(isStatsEligible("U10")).toBe(true);
      expect(isStatsEligible("U12")).toBe(true);
      expect(isStatsEligible("ADULT")).toBe(true);
      expect(isStatsEligible("OPEN")).toBe(true);
    });

    it("honors a configured threshold", () => {
      expect(isStatsEligible("U10", "U12")).toBe(false);
      expect(isStatsEligible("U8", "U8")).toBe(true);
      expect(isStatsEligible("U6", "U8")).toBe(false);
    });
  });
});
