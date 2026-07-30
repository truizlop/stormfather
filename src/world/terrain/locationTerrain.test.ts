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
        "vedenar",
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

  it("registers Shattered Plains crowns into the surrounding highland", () => {
    const plains = LOCATION_TERRAIN_CRADLES.find(
      (cradle) => cradle.id === "shattered-plains",
    )!;
    const natural = naturalTerrainHeightAt(
      plains.center[0],
      plains.center[1],
    );
    const datum = terrainHeightAt(
      plains.center[0],
      plains.center[1],
      "shattered-plains",
    );

    expect(datum).toBeGreaterThan(natural + 0.18);
    expect(datum).toBeLessThan(natural + 0.26);
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

  it("carves Vedenar's Tarat harbor below water while retaining its civic shelf", () => {
    const vedenar = LOCATION_TERRAIN_CRADLES.find(
      (cradle) => cradle.id === "vedenar",
    )!;
    const civic = terrainHeightAt(
      vedenar.center[0],
      vedenar.center[1],
      "vedenar",
    );
    const harbor = terrainHeightAt(
      vedenar.center[0] + 0.55,
      vedenar.center[1] + 5.35,
      "vedenar",
    );
    const river = terrainHeightAt(
      vedenar.center[0] - 3.65,
      vedenar.center[1],
      "vedenar",
    );

    expect(civic).toBeGreaterThan(OCEAN_WATER_HEIGHT + 0.55);
    expect(harbor).toBeLessThan(OCEAN_WATER_HEIGHT - 0.025);
    expect(river).toBeLessThan(civic - 0.25);

    const terraceSamples = [3.72, 2.02, 0.18, -1.72, -3.55].map(
      (localZ) =>
        terrainHeightAt(
          vedenar.center[0],
          vedenar.center[1] + localZ,
          "vedenar",
        ),
    );
    for (let index = 1; index < terraceSamples.length; index += 1) {
      expect(
        terraceSamples[index] - terraceSamples[index - 1],
      ).toBeGreaterThan(0.12);
      expect(
        terraceSamples[index] - terraceSamples[index - 1],
      ).toBeLessThan(0.2);
    }
    const northernFields = terrainHeightAt(
      vedenar.center[0],
      vedenar.center[1] - 4.55,
      "vedenar",
    );
    expect(northernFields).toBeGreaterThan(
      terraceSamples.at(-1)! + 0.035,
    );
  });

  it("blends overlapping coastal cradles without a global terrain seam", () => {
    const kharbranth = LOCATION_TERRAIN_CRADLES.find(
      (cradle) => cradle.id === "kharbranth",
    )!;
    const thaylen = LOCATION_TERRAIN_CRADLES.find(
      (cradle) => cradle.id === "thaylen-city",
    )!;
    const midpointX =
      (kharbranth.center[0] + thaylen.center[0]) / 2;
    const midpointZ =
      (kharbranth.center[1] + thaylen.center[1]) / 2;
    const sampleStep = 0.002;

    for (const [sampleX, sampleZ] of [
      [midpointX, midpointZ],
      // Browser-visible seam reported by the regression audit before the
      // ownership blend replaced the hard nearest-core election.
      [12.91, 23.92],
    ] as const) {
      const samples = Array.from({ length: 41 }, (_, index) =>
        terrainHeightAt(
          sampleX,
          sampleZ + (index - 20) * sampleStep,
        ),
      );
      const maximumAdjacentStep = Math.max(
        ...samples.slice(1).map((height, index) =>
          Math.abs(height - samples[index]),
        ),
      );
      expect(maximumAdjacentStep, `${sampleX}, ${sampleZ}`).toBeLessThan(
        0.02,
      );
    }
    expect(
      Math.abs(
        terrainHeightAt(
          kharbranth.center[0],
          kharbranth.center[1],
        ) -
          terrainHeightAt(
            kharbranth.center[0],
            kharbranth.center[1],
            "kharbranth",
          ),
      ),
    ).toBeLessThan(0.12);
    expect(
      Math.abs(
        terrainHeightAt(
          thaylen.center[0],
          thaylen.center[1],
        ) -
          terrainHeightAt(
            thaylen.center[0],
            thaylen.center[1],
            "thaylen-city",
          ),
      ),
    ).toBeLessThan(0.12);
  });
});
