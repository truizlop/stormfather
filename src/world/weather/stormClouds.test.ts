import { describe, expect, it } from "vitest";
import {
  createStormCloudLobes,
  stormWallOpacity,
} from "./stormClouds";

describe("opaque highstorm cloud volume", () => {
  it("builds deterministic overlapping cloud bands across the map", () => {
    for (const band of ["core", "shelf", "ground"] as const) {
      const first = createStormCloudLobes(72, band);
      const second = createStormCloudLobes(72, band);
      expect(first).toEqual(second);
      expect(first).toHaveLength(72);
      expect(Math.min(...first.map((lobe) => lobe.z))).toBeLessThan(-34);
      expect(Math.max(...first.map((lobe) => lobe.z))).toBeGreaterThan(34);
      expect(
        first.every(
          (lobe) =>
            lobe.scaleX > 0 &&
            lobe.scaleY > 0 &&
            lobe.scaleZ > 0,
        ),
      ).toBe(true);
    }
  });

  it("keeps the rain core effectively opaque", () => {
    expect(stormWallOpacity(-0.8)).toBeCloseTo(0.98);
    expect(stormWallOpacity(-7.2)).toBeCloseTo(0.58);
    expect(stormWallOpacity(5.6)).toBeCloseTo(0.58);
  });
});

