import { describe, expect, it } from "vitest";
import { destinationAnchors } from "../cartography/geography";
import {
  LOCATION_TERRAIN_CRADLES,
  locationTerrainInfluenceAt,
} from "./locationTerrain";
import { OCEAN_WATER_HEIGHT } from "./locationSurface";
import {
  naturalTerrainHeightAt,
  terrainHeightAt,
} from "./terrainHeight";

describe("authored location terrain cradles", () => {
  it("covers every authored destination exactly once", () => {
    expect(LOCATION_TERRAIN_CRADLES.map(({ id }) => id).sort()).toEqual(
      [
        "aimia",
        "azir",
        "kharbranth",
        "kholinar",
        "purelake",
        "shattered-plains",
        "shinovar",
        "thaylen-city",
        "urithiru",
      ],
    );
  });

  it("fully influences each modeled footprint and fades to zero outside it", () => {
    for (const cradle of LOCATION_TERRAIN_CRADLES) {
      expect(
        locationTerrainInfluenceAt(
          cradle,
          cradle.center[0],
          cradle.center[1],
        ),
      ).toBe(1);
      expect(
        locationTerrainInfluenceAt(
          cradle,
          cradle.center[0] + cradle.influenceRadiusX * 1.01,
          cradle.center[1],
        ),
      ).toBe(0);
    }
  });

  it("returns continuously to the natural heightfield at every influence edge", () => {
    for (const cradle of LOCATION_TERRAIN_CRADLES) {
      const insideX =
        cradle.center[0] + cradle.influenceRadiusX * 0.999;
      const outsideX =
        cradle.center[0] + cradle.influenceRadiusX * 1.001;
      const z = cradle.center[1];
      expect(
        Math.abs(
          terrainHeightAt(outsideX, z, cradle.id) -
            naturalTerrainHeightAt(outsideX, z),
        ),
      ).toBeLessThan(0.001);
      expect(
        Math.abs(
          terrainHeightAt(insideX, z, cradle.id) -
            terrainHeightAt(outsideX, z, cradle.id),
        ),
      ).toBeLessThan(0.12);
    }
  });

  it("forms bounded support under the flat civic, valley, ruin, and harbor roots", () => {
    const ids = [
      "azir",
      "shinovar",
      "aimia",
      "kholinar",
      "thaylen-city",
    ] as const;
    for (const id of ids) {
      const cradle = LOCATION_TERRAIN_CRADLES.find(
        (candidate) => candidate.id === id,
      )!;
      const samples = [
        [0, 0],
        [-0.72, -0.72],
        [0.72, -0.72],
        [-0.72, 0.72],
        [0.72, 0.72],
      ].map(([x, z]) =>
        terrainHeightAt(
          cradle.center[0] + x * cradle.coreRadiusX,
          cradle.center[1] + z * cradle.coreRadiusZ,
          id,
        ),
      );
      const variation = Math.max(...samples) - Math.min(...samples);
      expect(variation, `${id} core support variation`).toBeLessThan(
        id === "aimia"
          ? 0.32
          : id === "shinovar"
            ? 4.7
            : id === "thaylen-city"
              ? 0.85
              : 0.4,
      );
    }
  });

  it("keeps Urithiru's complete authored footprint inside a raised mountain shoulder", () => {
    const [centerX, centerZ] = destinationAnchors.urithiru;
    for (const [offsetX, offsetZ] of [
      [-4.2, 0],
      [4.2, 0],
      [0, -4.2],
      [0, 4.2],
    ] as const) {
      expect(
        terrainHeightAt(
          centerX + offsetX,
          centerZ + offsetZ,
          "urithiru",
        ),
      ).toBeGreaterThan(3.65);
    }
  });

  it("cuts the Purelake selected-detail bed beneath its water datum", () => {
    const [centerX, centerZ] = destinationAnchors.purelake;
    expect(
      terrainHeightAt(centerX, centerZ, "purelake"),
    ).toBeLessThan(0.07);
  });

  it("cuts animated ocean beneath authored Kharbranth and Thaylen piers", () => {
    const kharbranth = LOCATION_TERRAIN_CRADLES.find(
      (cradle) => cradle.id === "kharbranth",
    )!;
    const thaylen = LOCATION_TERRAIN_CRADLES.find(
      (cradle) => cradle.id === "thaylen-city",
    )!;

    expect(
      terrainHeightAt(
        kharbranth.center[0],
        kharbranth.center[1] + 6.8,
        "kharbranth",
      ),
    ).toBeLessThan(OCEAN_WATER_HEIGHT - 0.025);
    expect(
      terrainHeightAt(
        thaylen.center[0],
        thaylen.center[1] + 3.7,
        "thaylen-city",
      ),
    ).toBeLessThan(OCEAN_WATER_HEIGHT - 0.025);

    expect(
      terrainHeightAt(
        kharbranth.center[0],
        kharbranth.center[1] + 2.5,
        "kharbranth",
      ),
    ).toBeGreaterThan(OCEAN_WATER_HEIGHT + 0.35);
    expect(
      terrainHeightAt(
        thaylen.center[0],
        thaylen.center[1] + 1.2,
        "thaylen-city",
      ),
    ).toBeGreaterThan(OCEAN_WATER_HEIGHT + 0.35);
  });
});
