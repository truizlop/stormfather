import { describe, expect, it } from "vitest";
import { terrainHeightAt } from "../terrain/terrainHeight";
import { densifyPolyline, drapePolyline } from "./terrainDraping";

describe("terrain-draped cartography", () => {
  it("retains authored endpoints while inserting slope-following samples", () => {
    const source = [
      [-12, -4],
      [-8, 5],
      [2, 9],
    ] as const;
    const densified = densifyPolyline(source, 0.4);

    expect(densified.length).toBeGreaterThan(source.length * 5);
    expect(densified[0]).toEqual(source[0]);
    expect(densified.at(-1)).toEqual(source.at(-1));
  });

  it("places every rendered sample just above its local terrain", () => {
    const elevation = 0.047;
    const points = drapePolyline(
      [
        [-30, -8],
        [-15, 5],
        [4, 12],
      ],
      elevation,
      0.5,
    );

    for (const [x, y, z] of points) {
      expect(y).toBeCloseTo(terrainHeightAt(x, z) + elevation, 8);
    }
  });
});
