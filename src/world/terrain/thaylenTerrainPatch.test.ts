import { describe, expect, it } from "vitest";
import {
  destinationAnchors,
  pointInPolygon,
} from "../cartography/geography";
import { THAYLEN_CITY_TERRAIN_PATCH } from "./thaylenTerrainPatch";

describe("Thaylen City close-detail terrain patch", () => {
  const [centerX, centerZ] = destinationAnchors["thaylen-city"];

  it("supports the merchant wards and inland seawall", () => {
    for (const [localX, localZ] of [
      [0, 0],
      [-3.8, -0.4],
      [3.8, -0.4],
      [0, -3.9],
      [-1.6, 1.45],
      [1.6, 1.45],
    ] as const) {
      expect(
        pointInPolygon(
          [centerX + localX, centerZ + localZ],
          THAYLEN_CITY_TERRAIN_PATCH,
        ),
        `${localX}, ${localZ}`,
      ).toBe(true);
    }
  });

  it("leaves the working harbor and ship water open", () => {
    for (const [localX, localZ] of [
      [0, 2.4],
      [0, 3.4],
      [-2.25, 3.6],
      [2.25, 4.6],
    ] as const) {
      expect(
        pointInPolygon(
          [centerX + localX, centerZ + localZ],
          THAYLEN_CITY_TERRAIN_PATCH,
        ),
        `${localX}, ${localZ}`,
      ).toBe(false);
    }
  });

  it("uses an asymmetric non-circular coastline", () => {
    const radii = THAYLEN_CITY_TERRAIN_PATCH.map(([x, z]) =>
      Math.hypot(x - centerX, z - centerZ),
    );
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(1.4);
    expect(THAYLEN_CITY_TERRAIN_PATCH).toHaveLength(22);
  });
});
