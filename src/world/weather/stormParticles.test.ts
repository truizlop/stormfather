import { describe, expect, it } from "vitest";
import {
  createStormParticleField,
  lightningIntensity,
} from "./stormParticles";

describe("particle-driven highstorm", () => {
  it("builds deterministic rain, spray and debris fields inside the wall", () => {
    for (const band of ["rain", "spray", "debris"] as const) {
      const first = createStormParticleField(32, band);
      const second = createStormParticleField(32, band);
      expect(Array.from(first.positions)).toEqual(Array.from(second.positions));
      expect(first.positions).toHaveLength(96);
      expect(first.seeds).toHaveLength(32);
      expect(first.sizes.every((size) => size > 0)).toBe(true);
      for (let index = 0; index < first.positions.length; index += 3) {
        expect(first.positions[index]).toBeGreaterThanOrEqual(-6.5);
        expect(first.positions[index]).toBeLessThanOrEqual(6.5);
        expect(first.positions[index + 2]).toBeGreaterThanOrEqual(-36);
        expect(first.positions[index + 2]).toBeLessThanOrEqual(36);
      }
    }
  });

  it("uses brief double-strike lightning instead of a constant flicker", () => {
    expect(lightningIntensity(0)).toBe(0);
    expect(lightningIntensity(2.18)).toBeCloseTo(1);
    expect(lightningIntensity(2.34)).toBeGreaterThan(0.8);
    expect(lightningIntensity(8.92)).toBeGreaterThan(0.5);
    expect(lightningIntensity(6)).toBe(0);
  });
});
