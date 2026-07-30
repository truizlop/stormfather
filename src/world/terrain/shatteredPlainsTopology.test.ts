import { describe, expect, it } from "vitest";
import {
  SHATTERED_PLAINS_BRIDGES,
  SHATTERED_PLAINS_BRIDGE_RUN_PATH,
  SHATTERED_PLAINS_NARAK,
  SHATTERED_PLAINS_PATCH,
  SHATTERED_PLAINS_PLATEAUS,
  SHATTERED_PLAINS_WESTERN_WARCAMP,
  isShatteredPlainsFootprintSupported,
  shatteredPlainsSurfaceAt,
} from "./shatteredPlainsTopology";

function distanceToPolygonLip(
  point: readonly [number, number],
  polygon: readonly (readonly [number, number])[],
) {
  return Math.min(
    ...polygon.map((start, index) => {
      const end = polygon[(index + 1) % polygon.length];
      const segmentX = end[0] - start[0];
      const segmentZ = end[1] - start[1];
      const lengthSquared =
        segmentX * segmentX + segmentZ * segmentZ;
      const progress = Math.max(
        0,
        Math.min(
          1,
          ((point[0] - start[0]) * segmentX +
            (point[1] - start[1]) * segmentZ) /
            lengthSquared,
        ),
      );
      return Math.hypot(
        point[0] - (start[0] + segmentX * progress),
        point[1] - (start[1] + segmentZ * progress),
      );
    }),
  );
}

describe("Shattered Plains shared topology", () => {
  it("preserves every authored irregular plateau and bridge deck", () => {
    expect(SHATTERED_PLAINS_PLATEAUS).toHaveLength(37);
    expect(SHATTERED_PLAINS_BRIDGES).toHaveLength(9);
    expect(
      SHATTERED_PLAINS_PLATEAUS.every(
        (plateau) => plateau.polygon.length >= 7,
      ),
    ).toBe(true);
  });

  it("keeps the meter-calibrated tableland broader than its chasm depth", () => {
    expect(SHATTERED_PLAINS_PATCH.verticalCompression).toBe(0.46);
    const meanCap =
      SHATTERED_PLAINS_PLATEAUS.reduce(
        (total, plateau) => total + plateau.capY,
        0,
      ) / SHATTERED_PLAINS_PLATEAUS.length;
    const maximumDepth = Math.max(
      ...SHATTERED_PLAINS_PLATEAUS.map(
        (plateau) =>
          plateau.capY - SHATTERED_PLAINS_PATCH.chasmFloorY,
      ),
    );
    expect(meanCap).toBeCloseTo(0, 6);
    expect(SHATTERED_PLAINS_PATCH.chasmFloorY).toBeLessThan(-0.58);
    expect(maximumDepth).toBeLessThan(0.75);
    expect(maximumDepth).toBeGreaterThan(0.5);
  });

  it("distinguishes plateau caps, bridge decks, and carved chasms", () => {
    const central = shatteredPlainsSurfaceAt(0, 0);
    expect(central).toMatchObject({
      kind: "plateau",
      id: "plateau-01",
    });

    const bridge = SHATTERED_PLAINS_BRIDGES[0];
    const midpointX = (bridge.start[0] + bridge.end[0]) / 2;
    const midpointZ = (bridge.start[1] + bridge.end[1]) / 2;
    const midpoint = shatteredPlainsSurfaceAt(midpointX, midpointZ);
    expect(midpoint).toMatchObject({
      kind: "bridge",
      id: bridge.id,
    });
    expect(midpoint?.y).toBeCloseTo(
      (bridge.startY + bridge.endY) / 2,
    );
    expect(shatteredPlainsSurfaceAt(4.2, 0)).toBeNull();
    expect(
      shatteredPlainsSurfaceAt(4.2, 0, "chasm-creature"),
    ).toMatchObject({
      kind: "chasm",
      id: "chasm-floor",
    });
  });

  it("registers every sloped bridge to two named plateau lips", () => {
    const plateauIds = new Set(
      SHATTERED_PLAINS_PLATEAUS.map((plateau) => plateau.id),
    );
    const plateausById = new Map(
      SHATTERED_PLAINS_PLATEAUS.map((plateau) => [
        plateau.id,
        plateau,
      ]),
    );
    for (const bridge of SHATTERED_PLAINS_BRIDGES) {
      expect(plateauIds.has(bridge.sourcePlateauId)).toBe(true);
      expect(plateauIds.has(bridge.destinationPlateauId)).toBe(true);
      const start = shatteredPlainsSurfaceAt(
        bridge.start[0],
        bridge.start[1],
      );
      expect(start).toMatchObject({
        kind: "bridge",
        id: bridge.id,
      });
      expect(start?.y).toBeCloseTo(bridge.startY);
      const end = shatteredPlainsSurfaceAt(
        bridge.end[0],
        bridge.end[1],
      );
      expect(end).toMatchObject({
        kind: "bridge",
        id: bridge.id,
      });
      expect(end?.y).toBeCloseTo(bridge.endY);
      expect(
        distanceToPolygonLip(
          bridge.start,
          plateausById.get(bridge.sourcePlateauId)!.polygon,
        ),
      ).toBeLessThanOrEqual(0.02);
      expect(
        distanceToPolygonLip(
          bridge.end,
          plateausById.get(bridge.destinationPlateauId)!.polygon,
        ),
      ).toBeLessThanOrEqual(0.02);
    }
  });

  it("keeps Narak on the central cymatic precinct", () => {
    expect(SHATTERED_PLAINS_NARAK.anchor).toEqual([0, 0]);
    expect(SHATTERED_PLAINS_NARAK.plateauIds).toContain("plateau-01");
    expect(
      SHATTERED_PLAINS_NARAK.canonicalMarkerOffset,
    ).not.toEqual(SHATTERED_PLAINS_NARAK.anchor);
  });

  it("rejects structures that straddle a plateau lip", () => {
    expect(
      isShatteredPlainsFootprintSupported(0, 0, 0.12, 0.1, 0),
    ).toBe(true);
    expect(
      isShatteredPlainsFootprintSupported(0.52, 0, 0.18, 0.18, 0),
    ).toBe(false);
  });

  it("grounds the western warcamp on its own buried foundation", () => {
    const [x, z] = SHATTERED_PLAINS_WESTERN_WARCAMP.anchor;
    expect(shatteredPlainsSurfaceAt(x, z)).toMatchObject({
      kind: "plateau",
      id: "western-warcamp",
      y: SHATTERED_PLAINS_WESTERN_WARCAMP.foundation.surfaceY,
    });
    expect(
      shatteredPlainsSurfaceAt(x, z, "chasm-creature"),
    ).toBeNull();
  });

  it("keeps the bridge-run activity entirely on its western plateau", () => {
    expect(
      SHATTERED_PLAINS_BRIDGE_RUN_PATH.every(
        ([x, z]) =>
          shatteredPlainsSurfaceAt(x, z, "pedestrian")?.id ===
          "plateau-31",
      ),
    ).toBe(true);
  });
});
