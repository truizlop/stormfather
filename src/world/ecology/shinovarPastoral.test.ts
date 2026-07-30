import { describe, expect, it } from "vitest";
import { createNavigationField } from "../actors/pedestrianNavigation";
import { createDistrictLayout } from "../cities/districtLayout";
import { cityProfile } from "../cities/profiles";
import { locationById } from "../locations";
import { detailedLocationSurface } from "../terrain/locationSurface";
import {
  CREATURE_DIMENSION_CONTRACT,
  createCreatureSeeds,
  creatureCollisionClearance,
  creatureRuntimeBounds,
  ecologyBudget,
  shinovarPastoralBudget,
  writePastoralCreatureMotion,
  type CreatureMotion,
} from "./ecology";
import {
  assignShinovarHerdRoutes,
  createShinovarPastureRoutes,
} from "./ecologyNavigation";
import {
  createShinovarShepherdAssignments,
  SHINOVAR_SHEPHERD_SCALE,
  writeShinovarShepherdMotion,
} from "./shinovarPastoral";

function shinovarNavigation() {
  const location = locationById.get("shinovar")!;
  const center = [
    location.coordinates.x,
    location.coordinates.z,
  ] as const;
  const profile = cityProfile(location.id, location.culture);
  const surface = detailedLocationSurface("shinovar")!;
  const layout = createDistrictLayout(
    profile,
    location.id,
    center,
    "street",
    1_280,
  );
  return {
    center,
    surface,
    navigation: createNavigationField(
      location.id,
      profile,
      center,
      layout,
      [],
      {
        isWalkable: ({ x, z }) =>
          surface.containsWalkablePoint(x, z, "pedestrian"),
        heightAt: ({ x, z }) =>
          surface.walkableY(x, z, "pedestrian"),
        maximumStepHeight: surface.maximumStepHeight,
        maximumSlope: surface.maximumWalkSlope,
      },
    ),
  };
}

describe("Shinovar pastoral ecology", () => {
  it("allocates deterministic, Shinovar-only herds within ecology budgets", () => {
    expect(shinovarPastoralBudget("city", false)).toEqual({
      sheep: 5,
      shepherds: 1,
    });
    expect(shinovarPastoralBudget("street", false)).toEqual({
      sheep: 9,
      shepherds: 2,
    });
    expect(shinovarPastoralBudget("city", true)).toEqual({
      sheep: 3,
      shepherds: 1,
    });
    expect(shinovarPastoralBudget("street", true)).toEqual({
      sheep: 5,
      shepherds: 1,
    });

    for (const detailLevel of ["city", "street"] as const) {
      for (const compact of [false, true]) {
        const seeds = createCreatureSeeds(
          "shinovar",
          detailLevel,
          compact,
        );
        expect(seeds).toHaveLength(
          ecologyBudget(detailLevel, compact).creatures,
        );
        expect(
          seeds.filter((seed) => seed.species === "sheep"),
        ).toHaveLength(
          shinovarPastoralBudget(detailLevel, compact).sheep,
        );
        expect(seeds).toEqual(
          createCreatureSeeds("shinovar", detailLevel, compact),
        );
      }
    }
    for (const habitat of [
      "alethkar",
      "shattered-plains",
      "kholinar",
      "azir",
      "jah-keved",
      "purelake",
      "aimia",
      "kharbranth",
      "urithiru",
    ]) {
      expect(
        createCreatureSeeds(habitat, "street").some(
          (seed) => seed.species === "sheep",
        ),
      ).toBe(false);
    }
  });

  it("keeps every authored sheep within a realistic physical scale", () => {
    const sheep = createCreatureSeeds("shinovar", "street").filter(
      (seed) => seed.species === "sheep",
    );
    expect(sheep.length).toBeGreaterThan(0);
    for (const seed of sheep) {
      const bounds = creatureRuntimeBounds("sheep", seed.scale);
      expect(bounds.lengthMeters).toBeGreaterThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.sheep.lengthMeters.minimum,
      );
      expect(bounds.lengthMeters).toBeLessThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.sheep.lengthMeters.maximum,
      );
      expect(bounds.widthMeters).toBeGreaterThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.sheep.widthMeters.minimum,
      );
      expect(bounds.widthMeters).toBeLessThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.sheep.widthMeters.maximum,
      );
      expect(bounds.standingHeightMeters).toBeGreaterThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.sheep.standingHeightMeters.minimum,
      );
      expect(bounds.standingHeightMeters).toBeLessThanOrEqual(
        CREATURE_DIMENSION_CONTRACT.sheep.standingHeightMeters.maximum,
      );
      expect(creatureCollisionClearance(seed)).toBeGreaterThan(
        bounds.widthLocal / 2,
      );
    }
    expect(SHINOVAR_SHEPHERD_SCALE.heightMeters).toBe(1.72);
    expect(SHINOVAR_SHEPHERD_SCALE.heightLocal * 12).toBeCloseTo(1.72);
  });

  it("creates west-facing pasture routes on the detailed Shinovar surface", () => {
    const { navigation, surface } = shinovarNavigation();
    const sheep = createCreatureSeeds("shinovar", "street").filter(
      (seed) => seed.species === "sheep",
    );
    const widest = sheep.reduce((candidate, seed) =>
      creatureCollisionClearance(seed) >
      creatureCollisionClearance(candidate)
        ? seed
        : candidate,
    );
    const routes = createShinovarPastureRoutes(
      navigation,
      widest,
      navigation.routes,
    );
    expect(routes.length).toBeGreaterThanOrEqual(2);
    const pastureFocus = {
      x: navigation.center[0],
      z: navigation.center[1] + 2.2,
    };
    const routeFocusDistance = (route: (typeof routes)[number]) => {
      const midpoint = route.points.reduce(
        (sum, point) => ({
          x: sum.x + point.x / route.points.length,
          z: sum.z + point.z / route.points.length,
        }),
        { x: 0, z: 0 },
      );
      return Math.hypot(
        midpoint.x - pastureFocus.x,
        midpoint.z - pastureFocus.z,
      );
    };
    for (let index = 1; index < routes.length; index += 1) {
      expect(routeFocusDistance(routes[index])).toBeGreaterThanOrEqual(
        routeFocusDistance(routes[index - 1]) - 0.000001,
      );
    }
    for (const route of routes) {
      expect(route.id).toMatch(/^shinovar-sheep-pasture-/);
      const first = route.points[0];
      const shelter = route.points[route.points.length - 1];
      expect(shelter.x).toBeLessThanOrEqual(first.x);
      const samples = Math.max(4, Math.ceil(route.length / 0.04));
      let previousHeight = surface.walkableY(
        first.x,
        first.z,
        "pedestrian",
      );
      for (let index = 0; index <= samples; index += 1) {
        const amount = index / samples;
        const x = first.x + (shelter.x - first.x) * amount;
        const z = first.z + (shelter.z - first.z) * amount;
        expect(
          surface.containsWalkablePoint(x, z, "pedestrian"),
        ).toBe(true);
        const height = surface.walkableY(x, z, "pedestrian");
        expect(Number.isFinite(height)).toBe(true);
        if (index > 0) {
          const heightDelta = Math.abs(height - previousHeight);
          const horizontalStep = route.length / samples;
          expect(heightDelta).toBeLessThanOrEqual(
            surface.maximumStepHeight + 0.000001,
          );
          expect(heightDelta / horizontalStep).toBeLessThanOrEqual(
            surface.maximumWalkSlope + 0.000001,
          );
        }
        previousHeight = height;
      }
    }
  });

  it("links herders to herd routes and retreats the group in a Highstorm", () => {
    const { navigation } = shinovarNavigation();
    const sheep = createCreatureSeeds("shinovar", "street").filter(
      (seed) => seed.species === "sheep",
    );
    const widest = sheep.reduce((candidate, seed) =>
      creatureCollisionClearance(seed) >
      creatureCollisionClearance(candidate)
        ? seed
        : candidate,
    );
    const routes = createShinovarPastureRoutes(
      navigation,
      widest,
      navigation.routes,
    );
    const routeByCreatureId = assignShinovarHerdRoutes(
      sheep,
      routes,
      2,
    );
    expect(routeByCreatureId.size).toBe(sheep.length);

    const assignments = createShinovarShepherdAssignments(
      sheep,
      routeByCreatureId,
      "street",
      false,
    );
    expect(assignments).toHaveLength(2);
    expect(
      assignments.every(
        (assignment) =>
          assignment.occupation === "herder" &&
          routeByCreatureId.get(assignment.leaderSeed.id) ===
            assignment.route,
      ),
    ).toBe(true);

    const leader = assignments[0].leaderSeed;
    const route = assignments[0].route;
    const shelter = route.points[route.points.length - 1];
    const calm: CreatureMotion = {
      x: 0,
      z: 0,
      heading: 0,
      crouch: 1,
      pace: 0,
      gaitPhase: 0,
    };
    const retreating = { ...calm };
    const storm = { ...calm };
    writePastoralCreatureMotion(calm, leader, route, 9.25, 0);
    writePastoralCreatureMotion(
      retreating,
      leader,
      route,
      9.25,
      0.65,
    );
    writePastoralCreatureMotion(storm, leader, route, 9.25, 1);
    const calmDistance = Math.hypot(
      shelter.x - calm.x,
      shelter.z - calm.z,
    );
    const stormDistance = Math.hypot(
      shelter.x - storm.x,
      shelter.z - storm.z,
    );
    expect(stormDistance).toBeLessThan(calmDistance * 0.17);
    expect(retreating.pace).toBeGreaterThan(calm.pace);
    expect(storm.pace).toBe(0);
    expect(storm.crouch).toBeLessThan(calm.crouch);

    const shepherd = { ...calm };
    writeShinovarShepherdMotion(
      shepherd,
      assignments[0],
      9.25,
      1,
    );
    expect(
      Math.hypot(shepherd.x - storm.x, shepherd.z - storm.z),
    ).toBeLessThanOrEqual(0.045);
    expect(shepherd.crouch).toBeGreaterThan(storm.crouch);
  });
});
