import { describe, expect, it } from "vitest";
import {
  ANIMAL_RESIDENT_ROUTE_CLEARANCE,
  assignUniqueCreatureRoutes,
  ecologyLandmarkCollisionRoot,
  ecologyLayoutViewportWidth,
  fallbackCreatureRoutes,
  isEcologyWalkableSupportObstacle,
  navigationRouteDistance,
  navigationSegmentClearsObstacles,
} from "./ecologyNavigation";
import {
  isPointClear,
  type NavigationField,
} from "../actors/pedestrianNavigation";
import { detailedPopulationLaneOffset } from "../actors/populationRoutes";
import { PEDESTRIAN_RADIUS_LOCAL_UNITS } from "../scale";
import {
  CHASMFIEND_FOOT_COUNT,
  CHASMFIEND_FOOTPRINT_RADIUS,
  CHASMFIEND_ROUTE,
  CHASMFIEND_SCALE_LIMITS,
  CREATURE_DIMENSION_CONTRACT,
  CREATURE_MODEL_BOUNDS,
  CREATURE_MODEL_FOOTPRINT_RADIUS,
  SHATTERED_PLAINS_AUTHORED_OBSTACLES,
  advanceCreatureMotionClock,
  chasmfiendLegLiftAt,
  createCreatureSeeds,
  createSprenSeeds,
  creatureCollisionClearance,
  creatureMotionAt,
  creatureRouteIndex,
  creatureRuntimeBounds,
  deterministicUnit,
  ecologyBudget,
  resolveEcologyLocationId,
  sprenBehaviorAt,
  writeChasmfiendFootContact,
  writeRoutedCreatureMotion,
  type CreatureMotion,
  type CreatureSeed,
} from "./ecology";

type AuthoredObstacle =
  (typeof SHATTERED_PLAINS_AUTHORED_OBSTACLES)[number];

function pointToSegmentDistance(
  x: number,
  z: number,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
) {
  const segmentX = endX - startX;
  const segmentZ = endZ - startZ;
  const lengthSquared =
    segmentX * segmentX + segmentZ * segmentZ;
  const amount = Math.max(
    0,
    Math.min(
      1,
      ((x - startX) * segmentX + (z - startZ) * segmentZ) /
        lengthSquared,
    ),
  );
  return Math.hypot(
    x - (startX + segmentX * amount),
    z - (startZ + segmentZ * amount),
  );
}

function clearsAuthoredObstacle(
  obstacle: AuthoredObstacle,
  x: number,
  z: number,
  clearance: number,
) {
  if (obstacle.kind === "ellipse") {
    return (
      ((x - obstacle.x) * (x - obstacle.x)) /
        Math.pow(obstacle.radiusX + clearance, 2) +
        ((z - obstacle.z) * (z - obstacle.z)) /
          Math.pow(obstacle.radiusZ + clearance, 2) >
      1
    );
  }
  return (
    pointToSegmentDistance(
      x,
      z,
      obstacle.startX,
      obstacle.startZ,
      obstacle.endX,
      obstacle.endZ,
    ) >
    obstacle.radius + clearance
  );
}

describe("Rosharan ecology placement", () => {
  it("is deterministic for a selected habitat and detail level", () => {
    expect(createCreatureSeeds("shattered-plains", "street")).toEqual(
      createCreatureSeeds("shattered-plains", "street"),
    );
    expect(createSprenSeeds("kholinar", "city")).toEqual(
      createSprenSeeds("kholinar", "city"),
    );
    expect(deterministicUnit("chasmfiend:one")).toBe(
      deterministicUnit("chasmfiend:one"),
    );
  });

  it("includes a chasmfiend at the Shattered Plains and coastal skyeels", () => {
    const cityChasmfiends = createCreatureSeeds(
      "shattered-plains",
      "city",
    ).filter((seed) => seed.species === "chasmfiend");
    const streetChasmfiends = createCreatureSeeds(
      "shattered-plains",
      "street",
    ).filter((seed) => seed.species === "chasmfiend");
    expect(cityChasmfiends).toHaveLength(1);
    expect(streetChasmfiends).toHaveLength(1);
    expect(
      createCreatureSeeds("kharbranth", "city").some(
        (seed) => seed.species === "skyeel",
      ),
    ).toBe(true);
    expect(
      createCreatureSeeds("kharbranth", "city").some(
        (seed) => seed.species === "chull",
      ),
    ).toBe(true);
    expect(
      createCreatureSeeds("kharbranth", "street").some(
        (seed) => seed.species === "chull",
      ),
    ).toBe(false);
  });

  it("bounds populations by detail and viewport budget", () => {
    expect(ecologyBudget("continent", false)).toEqual({
      creatures: 0,
      spren: 0,
    });
    expect(ecologyBudget("region", false)).toEqual({
      creatures: 0,
      spren: 0,
    });
    expect(ecologyBudget("street", true).creatures).toBeLessThan(
      ecologyBudget("street", false).creatures,
    );
    expect(createCreatureSeeds("shattered-plains", "region")).toEqual([]);
    expect(createSprenSeeds("kholinar", "region")).toEqual([]);
  });

  it("follows only the approached local city at local detail", () => {
    expect(
      resolveEcologyLocationId("street", "kharbranth", "roshar"),
    ).toBe("kharbranth");
    expect(resolveEcologyLocationId("city", "urithiru", "azir")).toBe(
      "urithiru",
    );
    expect(resolveEcologyLocationId("city", null, "azir")).toBeNull();
    expect(resolveEcologyLocationId("street", null, "kholinar")).toBeNull();
    expect(
      resolveEcologyLocationId("region", "kharbranth", "alethkar"),
    ).toBe("alethkar");
  });

  it("meets the canonical physical dimension contracts", () => {
    const chasmfiend = createCreatureSeeds(
      "shattered-plains",
      "street",
    ).find((seed) => seed.species === "chasmfiend")!;
    const chasmfiendBounds = creatureRuntimeBounds(
      "chasmfiend",
      chasmfiend.scale,
    );
    expect(chasmfiendBounds.lengthMeters).toBeGreaterThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.lengthMeters.minimum,
    );
    expect(chasmfiendBounds.lengthMeters).toBeLessThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.lengthMeters.maximum,
    );
    expect(chasmfiendBounds.widthMeters).toBeGreaterThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.widthMeters.minimum,
    );
    expect(chasmfiendBounds.widthMeters).toBeLessThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.widthMeters.maximum,
    );
    expect(chasmfiendBounds.standingHeightMeters).toBeGreaterThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.standingHeightMeters
        .minimum,
    );
    expect(chasmfiendBounds.standingHeightMeters).toBeLessThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.standingHeightMeters
        .maximum,
    );
    expect(chasmfiendBounds.lengthToWidth).toBeGreaterThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.minimumLengthToWidth,
    );
    const minimumAuthoredChasmfiend = creatureRuntimeBounds(
      "chasmfiend",
      CHASMFIEND_SCALE_LIMITS.minimum,
    );
    const maximumAuthoredChasmfiend = creatureRuntimeBounds(
      "chasmfiend",
      CHASMFIEND_SCALE_LIMITS.maximum,
    );
    expect(minimumAuthoredChasmfiend.lengthMeters).toBeGreaterThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.lengthMeters.minimum,
    );
    expect(maximumAuthoredChasmfiend.lengthMeters).toBeLessThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.lengthMeters.maximum,
    );
    expect(minimumAuthoredChasmfiend.widthMeters).toBeGreaterThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.widthMeters.minimum,
    );
    expect(maximumAuthoredChasmfiend.widthMeters).toBeLessThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.widthMeters.maximum,
    );
    expect(
      minimumAuthoredChasmfiend.standingHeightMeters,
    ).toBeGreaterThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.standingHeightMeters
        .minimum,
    );
    expect(
      maximumAuthoredChasmfiend.standingHeightMeters,
    ).toBeLessThanOrEqual(
      CREATURE_DIMENSION_CONTRACT.chasmfiend.standingHeightMeters
        .maximum,
    );
    expect(CREATURE_MODEL_BOUNDS.chasmfiend.length).toBeGreaterThan(
      4.425,
    );
    expect(CHASMFIEND_FOOTPRINT_RADIUS).toBeGreaterThan(
      CREATURE_MODEL_BOUNDS.chasmfiend.length / 2,
    );

    const habitats = [
      "alethkar",
      "kholinar",
      "azir",
      "shinovar",
      "jah-keved",
      "purelake",
      "aimia",
      "kharbranth",
      "thaylen-city",
      "urithiru",
    ];
    expect(
      createCreatureSeeds("shinovar", "street").some(
        (seed) => seed.species === "chull",
      ),
    ).toBe(true);
    expect(
      createCreatureSeeds("urithiru", "street").some(
        (seed) => seed.species === "chull",
      ),
    ).toBe(true);
    const skyeels = habitats.flatMap((habitat) =>
      createCreatureSeeds(habitat, "street").filter(
        (seed) => seed.species === "skyeel",
      ),
    );
    expect(skyeels.length).toBeGreaterThan(0);
    for (const skyeel of skyeels) {
      const bounds = creatureRuntimeBounds("skyeel", skyeel.scale);
      expect(bounds.lengthMeters).toBeGreaterThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.skyeel.typicalLengthMeters.minimum,
      );
      expect(bounds.lengthMeters).toBeLessThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.skyeel.typicalLengthMeters.maximum,
      );
      expect(bounds.lengthMeters).toBeLessThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.skyeel.maximumLengthMeters,
      );
    }

    const axehounds = habitats.flatMap((habitat) =>
      createCreatureSeeds(habitat, "street").filter(
        (seed) => seed.species === "axehound",
      ),
    );
    expect(axehounds.length).toBeGreaterThan(0);
    for (const axehound of axehounds) {
      const bounds = creatureRuntimeBounds(
        "axehound",
        axehound.scale,
      );
      expect(bounds.standingHeightMeters).toBeGreaterThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.axehound.standingHeightMeters
          .minimum,
      );
      expect(bounds.standingHeightMeters).toBeLessThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.axehound.standingHeightMeters
          .maximum,
      );
    }
  });

  it("keeps the hero and every leg clear of the full authored landmark", () => {
    const seed = createCreatureSeeds("shattered-plains", "street").find(
      (candidate) => candidate.species === "chasmfiend",
    )!;
    expect(seed.radius).toBe(
      Math.max(CHASMFIEND_ROUTE.radiusX, CHASMFIEND_ROUTE.radiusZ),
    );

    for (const storm of [0, 1]) {
      let minimumX = Number.POSITIVE_INFINITY;
      let maximumX = Number.NEGATIVE_INFINITY;
      let minimumZ = Number.POSITIVE_INFINITY;
      let maximumZ = Number.NEGATIVE_INFINITY;
      let previousHeading: number | null = null;
      for (let sample = 0; sample < 480; sample += 1) {
        const pose = creatureMotionAt(seed, sample * 1.25, storm);
        minimumX = Math.min(minimumX, pose.x);
        maximumX = Math.max(maximumX, pose.x);
        minimumZ = Math.min(minimumZ, pose.z);
        maximumZ = Math.max(maximumZ, pose.z);
        if (previousHeading !== null) {
          const headingDelta = Math.atan2(
            Math.sin(pose.heading - previousHeading),
            Math.cos(pose.heading - previousHeading),
          );
          expect(Math.abs(headingDelta)).toBeLessThan(0.13);
        }
        previousHeading = pose.heading;
        const actorYaw = pose.heading + Math.PI;
        const cosYaw = Math.cos(actorYaw);
        const sinYaw = Math.sin(actorYaw);
        const footprintClearance = creatureCollisionClearance(seed);
        expect(
          Math.hypot(pose.x, pose.z) + footprintClearance,
        ).toBeLessThanOrEqual(CHASMFIEND_ROUTE.maximumArenaRadius);
        for (const obstacle of SHATTERED_PLAINS_AUTHORED_OBSTACLES) {
          expect(
            clearsAuthoredObstacle(
              obstacle,
              pose.x,
              pose.z,
              footprintClearance,
            ),
          ).toBe(true);
        }
        for (
          let legIndex = 0;
          legIndex < CHASMFIEND_FOOT_COUNT;
          legIndex += 1
        ) {
          const localContact = { x: 0, z: 0 };
          writeChasmfiendFootContact(
            localContact,
            legIndex,
            pose.gaitPhase,
            storm,
          );
          const contactX =
            pose.x +
            seed.scale *
              (cosYaw * localContact.x + sinYaw * localContact.z);
          const contactZ =
            pose.z +
            seed.scale *
              (-sinYaw * localContact.x + cosYaw * localContact.z);
          expect(Math.hypot(contactX, contactZ)).toBeLessThanOrEqual(
            CHASMFIEND_ROUTE.maximumArenaRadius,
          );
        }
      }
      expect(maximumX - minimumX).toBeGreaterThan(2.35);
      expect(maximumZ - minimumZ).toBeGreaterThan(2.35);
    }
  });

  it("assigns deterministic collision-safe route slots", () => {
    const seed = createCreatureSeeds("kharbranth", "street").find(
      (candidate) => candidate.species === "axehound",
    )!;
    expect(creatureRouteIndex(seed, 7)).toBe(
      creatureRouteIndex(seed, 7),
    );
    expect(creatureRouteIndex(seed, 0)).toBe(-1);
    expect(creatureRouteIndex(seed, 7)).toBeGreaterThanOrEqual(0);
    expect(creatureRouteIndex(seed, 7)).toBeLessThan(7);
  });

  it("uses complete longitudinal footprints for ground collisions", () => {
    const seeds: CreatureSeed[] = [
      {
        id: "footprint-chull",
        species: "chull",
        phase: 0,
        radius: 1,
        angle: 0,
        speed: 0.3,
        scale: 0.3,
      },
      {
        id: "footprint-axehound",
        species: "axehound",
        phase: 0,
        radius: 1,
        angle: 0,
        speed: 0.3,
        scale: 0.114,
      },
      {
        id: "footprint-cremling",
        species: "cremling",
        phase: 0,
        radius: 1,
        angle: 0,
        speed: 0.3,
        scale: 0.045,
      },
    ];
    for (const seed of seeds) {
      expect(creatureCollisionClearance(seed)).toBeCloseTo(
        CREATURE_MODEL_FOOTPRINT_RADIUS[seed.species] * seed.scale,
      );
      expect(creatureCollisionClearance(seed)).toBeGreaterThanOrEqual(
        (CREATURE_MODEL_BOUNDS[seed.species].length * seed.scale) / 2,
      );
    }
  });

  it("assigns distinct route ids whenever distinct routes remain", () => {
    const seeds = Array.from({ length: 4 }, (_, index): CreatureSeed => ({
      id: `unique-${index}`,
      species: "cremling",
      phase: index,
      radius: 1,
      angle: 0,
      speed: 0.3,
      scale: 0.045,
    }));
    const routes = [
      {
        id: "route-0",
        points: [
          { x: 0, z: 0 },
          { x: 0, z: 1 },
        ],
        length: 1,
      },
      {
        id: "route-0-reversed-copy",
        points: [
          { x: 0, z: 1 },
          { x: 0, z: 0 },
        ],
        length: 1,
      },
      ...Array.from({ length: 2 }, (_, index) => ({
        id: `route-${index + 1}`,
        points: [
          { x: index + 1, z: 0 },
          { x: index + 1, z: 1 },
        ],
        length: 1,
      })),
    ];
    const assignments = assignUniqueCreatureRoutes(
      seeds.map((seed) => ({ seed, routes })),
    );
    expect(assignments.size).toBe(3);
    expect(new Set([...assignments.values()].map((route) => route.id)).size)
      .toBe(assignments.size);
    const assignedIds = new Set(
      [...assignments.values()].map((route) => route.id),
    );
    expect(
      assignedIds.has("route-0") &&
        assignedIds.has("route-0-reversed-copy"),
    ).toBe(false);
    expect(
      [...assignments.entries()].map(([seedId, route]) => [
        seedId,
        route.id,
      ]),
    ).toEqual(
      [
        ...assignUniqueCreatureRoutes(
          seeds.map((seed) => ({ seed, routes })),
        ),
      ].map(([seedId, route]) => [seedId, route.id]),
    );
  });

  it("retains Shattered Plains GLB collisions at street detail and quantizes layout width", () => {
    expect(
      ecologyLandmarkCollisionRoot(
        "Landmark_ShatteredPlains",
        "street",
      ),
    ).toBe("Landmark_ShatteredPlains");
    expect(
      ecologyLandmarkCollisionRoot(
        "Landmark_ShatteredPlains",
        "region",
      ),
    ).toBeNull();
    expect(ecologyLayoutViewportWidth(375)).toBe(719);
    expect(ecologyLayoutViewportWidth(719)).toBe(719);
    expect(ecologyLayoutViewportWidth(720)).toBe(720);
    expect(ecologyLayoutViewportWidth(1_920)).toBe(720);
  });

  it("finds collision-safe pocket patrols when a district has no long route", () => {
    const seed: CreatureSeed = {
      id: "audit-chull",
      species: "chull",
      phase: 0,
      radius: 2,
      angle: 0,
      speed: 0.32,
      scale: 0.3,
    };
    const navigation: NavigationField = {
      center: [0, 0],
      locationId: "aimia",
      profile: {
        id: "akinah",
        culture: "aimian",
        roof: "ruin",
        activity: "ruins",
        density: 0.45,
        radius: 4.6,
        height: [0.2, 0.7],
        footprint: [0.2, 0.4],
        palette: ["#777777"],
        roofPalette: ["#555555"],
        modules: [],
      },
      obstacles: [
        {
          id: "central-ruin",
          x: 0,
          z: 0,
          halfWidth: 1.25,
          halfDepth: 1.1,
          rotation: 0,
        },
      ],
      routes: [],
      surface: {
        isWalkable: ({ x, z }) =>
          (x * x) / (4.2 * 4.2) + (z * z) / (3.1 * 3.1) <= 1,
        heightAt: ({ x, z }) => x * 0.015 + z * 0.01,
        maximumStepHeight: 0.11,
        maximumSlope: 0.4,
      },
    };
    const routes = fallbackCreatureRoutes(navigation, seed);
    expect(routes).toHaveLength(6);
    expect(routes.every((route) => route.length >= 0.16)).toBe(true);
    for (const route of routes) {
      for (const point of route.points) {
        expect(
          isPointClear(
            point,
            navigation.obstacles,
            creatureCollisionClearance(seed),
          ),
        ).toBe(true);
        expect(navigation.surface!.isWalkable!(point)).toBe(true);
      }
    }
  });

  it("keeps full animal footprints out of resident route corridors", () => {
    const seed: CreatureSeed = {
      id: "resident-separated-axehound",
      species: "axehound",
      phase: 0.4,
      radius: 2,
      angle: 0,
      speed: 0.4,
      scale: 0.114,
    };
    const residentRoute = {
      id: "resident-main-street",
      points: [
        { x: 0, z: -3 },
        { x: 0, z: 3 },
      ],
      length: 6,
    };
    const navigation: NavigationField = {
      center: [0, 0],
      locationId: "kholinar",
      profile: {
        id: "kholinar",
        culture: "alethi",
        roof: "flat",
        activity: "fortress",
        density: 0.8,
        radius: 4.8,
        height: [0.2, 0.8],
        footprint: [0.2, 0.4],
        palette: ["#777777"],
        roofPalette: ["#555555"],
        modules: [],
      },
      obstacles: [],
      routes: [residentRoute],
      surface: {
        isWalkable: ({ x, z }) =>
          (x * x) / (4.4 * 4.4) + (z * z) / (3.4 * 3.4) <= 1,
        heightAt: () => 0,
        maximumStepHeight: 0.12,
        maximumSlope: 0.4,
      },
    };
    const animalRoutes = fallbackCreatureRoutes(
      navigation,
      seed,
      navigation.routes,
    );
    expect(animalRoutes.length).toBeGreaterThan(0);
    const minimumSeparation =
      creatureCollisionClearance(seed) +
      ANIMAL_RESIDENT_ROUTE_CLEARANCE;
    expect(ANIMAL_RESIDENT_ROUTE_CLEARANCE).toBeGreaterThanOrEqual(
      Math.abs(detailedPopulationLaneOffset(0)) +
        PEDESTRIAN_RADIUS_LOCAL_UNITS,
    );
    for (const animalRoute of animalRoutes) {
      const start = animalRoute.points[0];
      const end = animalRoute.points[animalRoute.points.length - 1];
      for (let sample = 0; sample <= 20; sample += 1) {
        const amount = sample / 20;
        const point = {
          x: start.x + (end.x - start.x) * amount,
          z: start.z + (end.z - start.z) * amount,
        };
        expect(
          navigationRouteDistance(point, residentRoute),
        ).toBeGreaterThan(minimumSeparation);
      }
    }
  });

  it("rejects thin rotated colliders between route samples", () => {
    const obstacle = {
      id: "thin-authored-wall",
      x: 0.013,
      z: 0,
      halfWidth: 0.004,
      halfDepth: 0.18,
      rotation: 0.37,
    };
    const crossingStart = { x: -1, z: 0 };
    const crossingEnd = { x: 1, z: 0 };
    const clearance = 0.03;

    expect(isPointClear(crossingStart, [obstacle], clearance)).toBe(
      true,
    );
    expect(isPointClear(crossingEnd, [obstacle], clearance)).toBe(
      true,
    );
    expect(
      navigationSegmentClearsObstacles(
        crossingStart,
        crossingEnd,
        [obstacle],
        clearance,
      ),
    ).toBe(false);
    expect(
      navigationSegmentClearsObstacles(
        { x: -1, z: 0.5 },
        { x: 1, z: 0.5 },
        [obstacle],
        clearance,
      ),
    ).toBe(true);
  });

  it("treats authored terrain supports as walkable without ignoring defenses", () => {
    expect(
      isEcologyWalkableSupportObstacle(
        "landmark-Akinah_DefensePlinthBatch-22",
      ),
    ).toBe(true);
    expect(
      isEcologyWalkableSupportObstacle(
        "landmark-Akinah_RuinQuarter_3_05_TerrainFoundation-56",
      ),
    ).toBe(true);
    expect(
      isEcologyWalkableSupportObstacle(
        "landmark-Akinah_Defense_Spike_15-14",
      ),
    ).toBe(false);
  });

  it("writes routed motion in place and turns at rest without popping", () => {
    const seed: CreatureSeed = {
      id: "audit-axehound",
      species: "axehound",
      phase: 0,
      radius: 2,
      angle: 0,
      speed: 0.5,
      scale: 0.15,
    };
    const route = {
      points: [
        { x: 0, z: 0 },
        { x: 2, z: 0 },
      ],
      length: 2,
    };
    const target: CreatureMotion = {
      x: 0,
      z: 0,
      heading: 0,
      crouch: 1,
      pace: 0,
      gaitPhase: 7,
    };
    const travelDuration = route.length / (seed.speed * 0.22);
    const turnStart = travelDuration;
    const before = { ...target };
    writeRoutedCreatureMotion(target, seed, route, turnStart + 0.2, 0);
    expect(target.x).toBeCloseTo(2);
    expect(target.z).toBeCloseTo(0);
    expect(target.pace).toBe(0);
    expect(target.gaitPhase).toBe(before.gaitPhase);
    const firstHeading = target.heading;
    expect(
      writeRoutedCreatureMotion(
        target,
        seed,
        route,
        turnStart + 0.22,
        0,
      ),
    ).toBe(target);
    const headingDelta = Math.atan2(
      Math.sin(target.heading - firstHeading),
      Math.cos(target.heading - firstHeading),
    );
    expect(Math.abs(headingDelta)).toBeLessThan(0.08);
  });
});

describe("storm-aware ecology", () => {
  it("keeps route heading and gait phase continuous as storm speed changes", () => {
    const seed: CreatureSeed = {
      id: "continuous-axehound",
      species: "axehound",
      phase: 0.73,
      radius: 2,
      angle: 0.4,
      speed: 0.48,
      scale: 0.114,
    };
    const route = {
      points: [
        { x: 0, z: 0 },
        { x: 2.4, z: 0.4 },
      ],
      length: Math.hypot(2.4, 0.4),
    };
    const before: CreatureMotion = {
      x: 0,
      z: 0,
      heading: 0,
      crouch: 1,
      pace: 0,
      gaitPhase: 0,
    };
    const after = { ...before };
    writeRoutedCreatureMotion(before, seed, route, 10_000, 0.4999);
    writeRoutedCreatureMotion(after, seed, route, 10_000, 0.5001);
    expect(after.x).toBeCloseTo(before.x, 12);
    expect(after.z).toBeCloseTo(before.z, 12);
    expect(after.heading).toBeCloseTo(before.heading, 12);
    expect(after.gaitPhase).toBeCloseTo(before.gaitPhase, 12);

    const calmClock = advanceCreatureMotionClock(
      10_000,
      1 / 60,
      seed.species,
      0,
      0,
    );
    const enteringStormClock = advanceCreatureMotionClock(
      10_000,
      1 / 60,
      seed.species,
      0,
      1,
    );
    expect(enteringStormClock).toBeGreaterThan(calmClock);
    expect(enteringStormClock - calmClock).toBeLessThan(0.03);

    const openBefore = creatureMotionAt(seed, 10_000, 0.4999);
    const openAfter = creatureMotionAt(seed, 10_000, 0.5001);
    const headingDelta = Math.atan2(
      Math.sin(openAfter.heading - openBefore.heading),
      Math.cos(openAfter.heading - openBefore.heading),
    );
    expect(Math.abs(headingDelta)).toBeLessThan(0.002);
    expect(openAfter.gaitPhase).toBeCloseTo(
      openBefore.gaitPhase,
      12,
    );
  });

  it("drives axehounds quickly toward shelter during a storm", () => {
    const seed = createCreatureSeeds("kholinar", "street").find(
      (candidate) => candidate.species === "axehound",
    );
    expect(seed).toBeDefined();
    const calm = creatureMotionAt(seed!, 20, 0);
    const storm = creatureMotionAt(seed!, 20, 1);
    expect(Math.hypot(storm.x, storm.z)).toBeLessThan(
      Math.hypot(calm.x, calm.z),
    );
    expect(storm.pace).toBeGreaterThan(calm.pace * 3);
    expect(storm.crouch).toBeLessThan(calm.crouch);
  });

  it("keeps creatures facing their actual direction of travel", () => {
    const seed = createCreatureSeeds("shattered-plains", "city").find(
      (candidate) => candidate.species === "chasmfiend",
    )!;
    const pose = creatureMotionAt(seed, 32, 0.2);
    const next = creatureMotionAt(seed, 32.001, 0.2);
    const sampledHeading = Math.atan2(next.x - pose.x, next.z - pose.z);
    const headingError = Math.atan2(
      Math.sin(pose.heading - sampledHeading),
      Math.cos(pose.heading - sampledHeading),
    );
    expect(Math.abs(headingError)).toBeLessThan(0.002);
  });

  it("makes chasmfiends brace instead of accelerating or deflating", () => {
    const seed = createCreatureSeeds("shattered-plains", "city").find(
      (candidate) => candidate.species === "chasmfiend",
    )!;
    const calm = creatureMotionAt(seed, 20, 0);
    const storm = creatureMotionAt(seed, 20, 1);
    expect(storm.pace).toBeLessThan(calm.pace);
    expect(storm.crouch).toBe(0.88);
  });

  it("exposes fourteen distinct animated foot contacts for grounding", () => {
    const contacts = Array.from(
      { length: CHASMFIEND_FOOT_COUNT },
      (_, legIndex) => {
        const contact = { x: 0, z: 0 };
        writeChasmfiendFootContact(contact, legIndex, 1.7, 0.4);
        return contact;
      },
    );
    expect(contacts).toHaveLength(14);
    expect(
      new Set(
        contacts.map(
          (contact) =>
            `${contact.x.toFixed(5)}:${contact.z.toFixed(5)}`,
        ),
      ).size,
    ).toBe(14);
    const calmLifts = Array.from(
      { length: CHASMFIEND_FOOT_COUNT },
      (_, legIndex) => chasmfiendLegLiftAt(legIndex, 1.7, 0),
    );
    const stormLifts = Array.from(
      { length: CHASMFIEND_FOOT_COUNT },
      (_, legIndex) => chasmfiendLegLiftAt(legIndex, 1.7, 1),
    );
    expect(calmLifts.some((lift) => lift === 0)).toBe(true);
    expect(calmLifts.some((lift) => lift > 0.05)).toBe(true);
    expect(Math.max(...stormLifts)).toBeLessThan(Math.max(...calmLifts));
  });

  it("amplifies wind and rain spren while life spren retract", () => {
    expect(sprenBehaviorAt("windspren", 1).speed).toBeGreaterThan(
      sprenBehaviorAt("windspren", 0).speed * 4,
    );
    expect(sprenBehaviorAt("rainspren", 1).visibility).toBeGreaterThan(
      sprenBehaviorAt("rainspren", 0).visibility,
    );
    expect(sprenBehaviorAt("lifespren", 1).visibility).toBeLessThan(
      sprenBehaviorAt("lifespren", 0).visibility * 0.2,
    );
  });
});
