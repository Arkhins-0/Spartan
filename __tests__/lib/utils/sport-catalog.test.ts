import { describe, expect, it } from "vitest";
import { ScheduleFormat, Sport } from "@prisma/client";
import {
  GENERATIVE_FORMATS,
  SCHEDULE_FORMAT_LABELS,
  getSportCapabilities,
} from "@/lib/utils/sport-catalog";

const ALL_SPORTS = Object.values(Sport);
const HOCKEY_VOCABULARY = /ice|rink|squirt|peewee|bantam|mite/i;

describe("sport-catalog", () => {
  it("MOTORSPORT is the only sport", () => {
    expect(ALL_SPORTS).toEqual(["MOTORSPORT"]);
  });

  describe("motorsport capabilities", () => {
    const motorsport = getSportCapabilities("MOTORSPORT");

    it("is fully populated with circuit terminology", () => {
      expect(motorsport.sport).toBe("MOTORSPORT");
      expect(motorsport.sportLabel).toBe("Motorsport");
      expect(motorsport.surfaceLabel).toBe("Circuit");
      expect(motorsport.surfaceTypes).toEqual(["CIRCUIT", "TRACK", "PADDOCK"]);
    });

    it("suggests only the custom format", () => {
      expect(motorsport.suggestedFormats).toEqual(["CUSTOM"]);
    });

    it("uses plain age labels with no hockey vocabulary", () => {
      const labels = motorsport.ageClassifications.map((option) => option.label);
      expect(labels).toContain("U10");
      expect(labels).toContain("U12");
      expect(labels).toContain("U14");
      for (const label of [motorsport.sportLabel, motorsport.surfaceLabel, ...labels]) {
        expect(label).not.toMatch(HOCKEY_VOCABULARY);
      }
    });

    it("has age classifications", () => {
      expect(motorsport.ageClassifications.length).toBeGreaterThan(0);
    });
  });

  describe("getSportCapabilities without a sport", () => {
    it("returns the motorsport entry for null", () => {
      const capabilities = getSportCapabilities(null);
      expect(capabilities.sport).toBe("MOTORSPORT");
      expect(capabilities.surfaceLabel).toBe("Circuit");
    });

    it("returns the motorsport entry for undefined", () => {
      expect(getSportCapabilities(undefined).sport).toBe("MOTORSPORT");
    });
  });

  describe("schedule formats", () => {
    it("GENERATIVE_FORMATS contains only ROUND_ROBIN", () => {
      expect([...GENERATIVE_FORMATS]).toEqual(["ROUND_ROBIN"]);
    });

    it("SCHEDULE_FORMAT_LABELS covers every format", () => {
      for (const format of Object.values(ScheduleFormat)) {
        expect(SCHEDULE_FORMAT_LABELS[format]).toBeTruthy();
      }
    });
  });
});
