import { describe, expect, it } from "vitest";
import { gazetteerById } from "./catalog";
import {
  createSemanticSettlementLayout,
  isSemanticSettlementDetailEligible,
  SEMANTIC_ACTIVITY_CLEARANCE,
  semanticSettlementIds,
  semanticSettlementProfile,
  semanticSettlementProfiles,
  type SemanticSignaturePart,
} from "./semanticSettlements";

interface TestObstacle {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
  rotation: number;
}

function signatureObstacle(
  parts: readonly SemanticSignaturePart[],
): TestObstacle {
  let minimumX = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let minimumZ = Number.POSITIVE_INFINITY;
  let maximumZ = Number.NEGATIVE_INFINITY;
  for (const part of parts) {
    const angle = part.rotation?.[1] ?? 0;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const halfWidth = part.scale[0] / 2;
    const halfDepth = part.scale[2] / 2;
    const extentX =
      Math.abs(cosine) * halfWidth + Math.abs(sine) * halfDepth;
    const extentZ =
      Math.abs(sine) * halfWidth + Math.abs(cosine) * halfDepth;
    minimumX = Math.min(minimumX, part.position[0] - extentX);
    maximumX = Math.max(maximumX, part.position[0] + extentX);
    minimumZ = Math.min(minimumZ, part.position[2] - extentZ);
    maximumZ = Math.max(maximumZ, part.position[2] + extentZ);
  }
  return {
    x: (minimumX + maximumX) / 2,
    z: (minimumZ + maximumZ) / 2,
    halfWidth: (maximumX - minimumX) / 2,
    halfDepth: (maximumZ - minimumZ) / 2,
    rotation: 0,
  };
}

function segmentIntersectsExpandedObstacle(
  start: readonly [number, number, number],
  end: readonly [number, number, number],
  obstacle: TestObstacle,
) {
  const cosine = Math.cos(obstacle.rotation);
  const sine = Math.sin(obstacle.rotation);
  const startX =
    cosine * (start[0] - obstacle.x) + sine * (start[2] - obstacle.z);
  const startZ =
    -sine * (start[0] - obstacle.x) + cosine * (start[2] - obstacle.z);
  const endX =
    cosine * (end[0] - obstacle.x) + sine * (end[2] - obstacle.z);
  const endZ =
    -sine * (end[0] - obstacle.x) + cosine * (end[2] - obstacle.z);
  const deltaX = endX - startX;
  const deltaZ = endZ - startZ;
  const halfWidth = obstacle.halfWidth + SEMANTIC_ACTIVITY_CLEARANCE;
  const halfDepth = obstacle.halfDepth + SEMANTIC_ACTIVITY_CLEARANCE;
  let minimumTime = 0;
  let maximumTime = 1;

  for (const [origin, delta, extent] of [
    [startX, deltaX, halfWidth],
    [startZ, deltaZ, halfDepth],
  ] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (Math.abs(origin) > extent) return false;
      continue;
    }
    const first = (-extent - origin) / delta;
    const second = (extent - origin) / delta;
    minimumTime = Math.max(minimumTime, Math.min(first, second));
    maximumTime = Math.min(maximumTime, Math.max(first, second));
    if (minimumTime > maximumTime) return false;
  }
  return true;
}

describe("selected semantic settlement profiles", () => {
  it("defines a distinct visual and activity identity for all eight settlements", () => {
    expect(Object.keys(semanticSettlementProfiles)).toEqual([
      ...semanticSettlementIds,
    ]);
    const profiles = semanticSettlementIds.map(
      (id) => semanticSettlementProfiles[id],
    );

    expect(new Set(profiles.map((profile) => profile.layout)).size).toBe(8);
    expect(new Set(profiles.map((profile) => profile.signature)).size).toBe(8);
    expect(new Set(profiles.map((profile) => profile.activity)).size).toBe(8);
    for (const profile of profiles) {
      expect(profile.radius).toBeGreaterThan(2);
      expect(profile.buildingCount.street).toBeGreaterThan(
        profile.buildingCount.city,
      );
      expect(profile.palette.length).toBeGreaterThanOrEqual(3);
      expect(profile.roofPalette.length).toBeGreaterThanOrEqual(2);
      expect(semanticSettlementProfile(profile.id)).toBe(profile);
    }
    expect(semanticSettlementProfile("kholinar")).toBeUndefined();
  });

  it("only replaces selected profile markers at city and street detail", () => {
    for (const id of semanticSettlementIds) {
      const place = gazetteerById.get(id);
      expect(place, id).toBeDefined();
      expect(isSemanticSettlementDetailEligible(place, "continent")).toBe(
        false,
      );
      expect(isSemanticSettlementDetailEligible(place, "region")).toBe(false);
      expect(isSemanticSettlementDetailEligible(place, "city")).toBe(true);
      expect(isSemanticSettlementDetailEligible(place, "street")).toBe(true);
    }

    expect(
      isSemanticSettlementDetailEligible(
        gazetteerById.get("kholinar"),
        "street",
      ),
    ).toBe(false);
    expect(
      isSemanticSettlementDetailEligible(
        {
          ...gazetteerById.get("hearthstone")!,
          renderable: false,
        },
        "street",
      ),
    ).toBe(false);
  });

  it("creates deterministic, terrain-seated districts for every profile", () => {
    const center = [12, -7] as const;
    const heightAt = (x: number, z: number) =>
      1.4 + x * 0.035 - z * 0.028;

    for (const id of semanticSettlementIds) {
      const profile = semanticSettlementProfiles[id];
      const layout = createSemanticSettlementLayout(
        profile,
        center,
        "street",
        false,
        heightAt,
      );
      const repeated = createSemanticSettlementLayout(
        profile,
        center,
        "street",
        false,
        heightAt,
      );

      expect(layout).toEqual(repeated);
      expect(layout.buildings).toHaveLength(profile.buildingCount.street);
      expect(layout.paving.length).toBeGreaterThan(50);
      expect(layout.activity.length).toBeGreaterThan(10);
      expect(layout.signature.length).toBeGreaterThan(4);

      for (const building of layout.buildings) {
        expect(Math.hypot(building.x, building.z)).toBeGreaterThanOrEqual(
          0.979999,
        );
        const cosine = Math.cos(building.rotation);
        const sine = Math.sin(building.rotation);
        const halfWidth = building.width * 0.54;
        const halfDepth = building.depth * 0.54;
        const samples = [
          [0, 0],
          [-halfWidth, -halfDepth],
          [halfWidth, -halfDepth],
          [-halfWidth, halfDepth],
          [halfWidth, halfDepth],
        ] as const;
        const heights = samples.map(([x, z]) =>
          heightAt(
            center[0] + building.x + x * cosine + z * sine,
            center[1] + building.z - x * sine + z * cosine,
          ),
        );
        expect(building.y).toBeCloseTo(Math.max(...heights) - 0.006);
        expect(building.y - building.foundationDrop).toBeLessThan(
          Math.min(...heights),
        );
      }
    }
  });

  it("reduces selected-district budgets on compact viewports", () => {
    const profile = semanticSettlementProfiles.vedenar;
    const heightAt = () => 1;
    const full = createSemanticSettlementLayout(
      profile,
      [0, 0],
      "street",
      false,
      heightAt,
    );
    const compact = createSemanticSettlementLayout(
      profile,
      [0, 0],
      "street",
      true,
      heightAt,
    );

    expect(compact.buildings.length).toBeLessThan(full.buildings.length);
    expect(compact.paving.length).toBeLessThan(full.paving.length);
    expect(compact.activity.length).toBeLessThan(full.activity.length);
  });

  it("keeps varied, moving activity paths clear of buildings and signatures", () => {
    const heightAt = (x: number, z: number) =>
      0.8 + x * 0.012 - z * 0.009;

    for (const id of semanticSettlementIds) {
      const profile = semanticSettlementProfiles[id];
      for (const detailLevel of ["city", "street"] as const) {
        for (const compactViewport of [false, true]) {
          const layout = createSemanticSettlementLayout(
            profile,
            [5, -3],
            detailLevel,
            compactViewport,
            heightAt,
          );
          const obstacles: TestObstacle[] = [
            ...layout.buildings.map((building) => ({
              x: building.x,
              z: building.z,
              halfWidth: building.width * 0.54,
              halfDepth: building.depth * 0.54,
              rotation: building.rotation,
            })),
            signatureObstacle(layout.signature),
          ];

          expect(new Set(layout.activity.map((seed) => seed.color)).size).toBe(
            profile.activityPalette.length,
          );
          expect(new Set(layout.activity.map((seed) => seed.phase)).size).toBeGreaterThan(
            1,
          );
          expect(new Set(layout.activity.map((seed) => seed.speed)).size).toBeGreaterThan(
            1,
          );
          for (const route of layout.activity) {
            expect(
              Math.hypot(
                route.end[0] - route.start[0],
                route.end[2] - route.start[2],
              ),
            ).toBeGreaterThanOrEqual(0.28);
            expect(route.speed).toBeGreaterThan(0);
            for (const obstacle of obstacles) {
              expect(
                segmentIntersectsExpandedObstacle(
                  route.start,
                  route.end,
                  obstacle,
                ),
                `${id} ${detailLevel} activity route intersects an expanded obstacle`,
              ).toBe(false);
            }
          }
        }
      }
    }
  });
});
