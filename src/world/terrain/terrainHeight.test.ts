import { describe, expect, it } from "vitest";
import { terrainHeightAt, terrainSlopeAt } from "./terrainHeight";

describe("continuous Roshar terrain", () => {
  it("is deterministic and remains above the water plane", () => {
    expect(terrainHeightAt(12.4, -3.7)).toBe(
      terrainHeightAt(12.4, -3.7),
    );
    expect(terrainHeightAt(-40, 0)).toBeGreaterThan(0.4);
  });

  it("raises canonical mountain corridors above nearby lowlands", () => {
    const mistedMountains = terrainHeightAt(-36, -2);
    const shinovarLowland = terrainHeightAt(-43, -2);
    const horneaterPeaks = terrainHeightAt(16, -3);
    const vedenLowland = terrainHeightAt(6, -3);

    expect(mistedMountains).toBeGreaterThan(shinovarLowland + 1);
    expect(horneaterPeaks).toBeGreaterThan(vedenLowland + 1);
  });

  it("exposes terrain slope for material and object placement", () => {
    expect(terrainSlopeAt(-36, -2)).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(terrainSlopeAt(31, 11))).toBe(true);
  });
});
