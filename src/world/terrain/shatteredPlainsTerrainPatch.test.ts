import { describe, expect, it } from "vitest";
import {
  createShatteredPlainsFloorGeometry,
  createShatteredPlainsWallGeometry,
} from "./shatteredPlainsTerrainPatch";
import {
  SHATTERED_PLAINS_PATCH,
  SHATTERED_PLAINS_PLATEAUS,
} from "./shatteredPlainsTopology";

describe("Shattered Plains carved terrain geometry", () => {
  it("builds a closed floor and transition shoulder up to the coarse terrain", () => {
    const datum = 1.2;
    const geometry = createShatteredPlainsFloorGeometry(
      [40, 13.76],
      datum,
      () => 1.5,
      32,
    );
    const positions = geometry.getAttribute("position");
    expect(positions.getY(0)).toBeCloseTo(
      datum + SHATTERED_PLAINS_PATCH.chasmFloorY,
    );
    const outerStart = 1 + 8 * 32;
    expect(positions.getY(outerStart)).toBeCloseTo(1.508);
    expect(geometry.getIndex()?.count).toBeGreaterThan(1_000);
    geometry.dispose();
  });

  it("extends every plateau lip continuously down into the chasm", () => {
    const geometry = createShatteredPlainsWallGeometry([0, 0], 1);
    const edgeCount = SHATTERED_PLAINS_PLATEAUS.reduce(
      (total, plateau) => total + plateau.polygon.length,
      0,
    );
    expect(geometry.getAttribute("position").count).toBe(
      edgeCount * 4 + 32 * 2,
    );
    expect(geometry.getIndex()?.count).toBe(
      edgeCount * 6 + 32 * 6,
    );
    geometry.dispose();
  });
});
