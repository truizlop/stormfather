import { describe, expect, it } from "vitest";
import { terrainHeightAt, terrainSlopeAt } from "./terrainHeight";
import {
  landmarkSurfaceY,
  localSurfaceY,
  PURELAKE_WATER_HEIGHT,
} from "./localSurface";

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

describe("close-detail surface registration", () => {
  it("uses the canonical terrain beneath ordinary destinations", () => {
    expect(localSurfaceY("kholinar", 29.12, -3.84)).toBeCloseTo(
      terrainHeightAt(29.12, -3.84) + 0.025,
    );
    expect(landmarkSurfaceY("azir", -21.12, 5.12)).toBeCloseTo(
      terrainHeightAt(-21.12, 5.12),
    );
  });

  it("keeps Purelake detail on the shallow-water surface", () => {
    expect(localSurfaceY("purelake", -9.6, -3.84)).toBe(
      PURELAKE_WATER_HEIGHT,
    );
    expect(landmarkSurfaceY("purelake", -9.6, -3.84)).toBeLessThan(
      PURELAKE_WATER_HEIGHT,
    );
  });

  it("follows Kharbranth's stepped Ralinsa terraces", () => {
    const lower = localSurfaceY("kharbranth", 9.92, 15.7);
    const upper = localSurfaceY("kharbranth", 9.92, 20.6);
    expect(upper).toBeGreaterThan(lower + 1.2);
  });
});
