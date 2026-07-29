import { describe, expect, it } from "vitest";
import {
  harborWaveHeight,
  sampleOceanWaveHeight,
  shorelineFoamPulse,
} from "./waterMotion";

describe("procedural water motion", () => {
  it("is deterministic and combines waves without a repeating texture offset", () => {
    const sample = sampleOceanWaveHeight(12.4, -7.1, 18.2, 0.3);
    expect(sampleOceanWaveHeight(12.4, -7.1, 18.2, 0.3)).toBe(sample);
    expect(sampleOceanWaveHeight(12.4, -7.1, 19.2, 0.3)).not.toBe(sample);
    expect(Number.isFinite(sample)).toBe(true);
  });

  it("amplifies ocean swell near the storm wall", () => {
    const calm = Math.abs(sampleOceanWaveHeight(7, 11, 3.4, 0));
    const storm = Math.abs(sampleOceanWaveHeight(7, 11, 3.4, 1));
    expect(storm).toBeGreaterThan(calm * 2);
  });

  it("keeps harbor motion sheltered and foam pulses bounded", () => {
    expect(Math.abs(harborWaveHeight(1.2, -0.8, 4.5, 1))).toBeLessThan(0.08);
    expect(shorelineFoamPulse(0.72, 12)).toBeGreaterThanOrEqual(0);
    expect(shorelineFoamPulse(0.72, 12)).toBeLessThanOrEqual(1);
  });
});
