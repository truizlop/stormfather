import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDistrictLayout } from "../cities/districtLayout";
import { cityProfile } from "../cities/profiles";
import { locationById } from "../locations";
import {
  DETAILED_LOCATION_IDS,
  detailedLocationSurface,
} from "../terrain/locationSurface";
import { shatteredPlainsSurfaceAt } from "../terrain/shatteredPlainsTopology";
import {
  createCrowdSeparationWorkspace,
  createNavigationField,
  isNavigationPositionValid,
  landmarkNavigationObstacles,
  resolveCrowdSeparation,
  resolveCrowdSeparationInPlace,
  sampleNavigationRoute,
  sampleNavigationRouteInto,
  type NavigationObstacle,
  type NavigationSurfaceConstraints,
} from "./pedestrianNavigation";

const cases = ["kharbranth", "shattered-plains", "purelake", "thaylen-city"];

function surfaceTestContext() {
  const location = locationById.get("thaylen-city")!;
  const center = [
    location.coordinates.x,
    location.coordinates.z,
  ] as const;
  const profile = cityProfile(location.id, location.culture);
  const layout = { buildings: [], modules: [] } as const;
  return {
    center,
    create(surface?: NavigationSurfaceConstraints) {
      return createNavigationField(
        location.id,
        profile,
        center,
        layout,
        [],
        surface,
      );
    },
  };
}

describe("pedestrian navigation", () => {
  it.each(DETAILED_LOCATION_IDS)(
    "finds a valid authored-floor route for %s",
    (locationId) => {
      const location = locationById.get(locationId)!;
      const center = [
        location.coordinates.x,
        location.coordinates.z,
      ] as const;
      const profile = cityProfile(location.id, location.culture);
      const surface = detailedLocationSurface(locationId)!;
      const field = createNavigationField(
        locationId,
        profile,
        center,
        { buildings: [], modules: [] },
        [],
        {
          isWalkable: ({ x, z }) =>
            surface.containsWalkablePoint(x, z, "pedestrian"),
          heightAt: ({ x, z }) =>
            surface.walkableY(x, z, "pedestrian"),
          maximumStepHeight: surface.maximumStepHeight,
          maximumSlope: surface.maximumWalkSlope,
        },
      );

      expect(
        field.routes.length,
        `${locationId} should expose a connected pedestrian floor`,
      ).toBeGreaterThan(0);
      for (const route of field.routes) {
        expect(
          route.points.every(({ x, z }) =>
            surface.containsWalkablePoint(x, z, "pedestrian"),
          ),
        ).toBe(true);
      }
    }
  );

  it("rotates authored landmark collision footprints with their render root", () => {
    const scene = new THREE.Group();
    const root = new THREE.Group();
    root.name = "Test_Root";
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2));
    tower.name = "Test_Tower";
    tower.position.set(2, 0, 1);
    root.add(tower);
    scene.add(root);

    const [obstacle] = landmarkNavigationObstacles(
      scene,
      root.name,
      [10, 20],
      1,
      Math.PI / 2,
    );

    expect(obstacle.x).toBeCloseTo(11);
    expect(obstacle.z).toBeCloseTo(18);
    expect(obstacle.halfWidth).toBeCloseTo(1);
    expect(obstacle.halfDepth).toBeCloseTo(2);
    tower.geometry.dispose();
  });

  it("uses the authored Shattered Plains bridge decks as pedestrian routes", () => {
    const location = locationById.get("shattered-plains")!;
    const center = [
      location.coordinates.x,
      location.coordinates.z,
    ] as const;
    const profile = cityProfile(location.id, location.culture);
    const field = createNavigationField(
      location.id,
      profile,
      center,
      { buildings: [], modules: [] },
    );
    const bridgeRoutes = field.routes.filter((route) =>
      route.id.startsWith("shattered-plains-bridge-"),
    );

    expect(bridgeRoutes).toHaveLength(9);
    for (const route of bridgeRoutes) {
      for (let sample = 0; sample <= 20; sample += 1) {
        const pose = sampleNavigationRoute(route, sample / 20);
        expect(
          shatteredPlainsSurfaceAt(
            pose.x - center[0],
            pose.z - center[1],
          )?.kind,
        ).toBe("bridge");
      }
    }
  });

  it.each(cases)(
    "keeps sampled %s residents inside walkable, collision-free space",
    (locationId) => {
      const location = locationById.get(locationId)!;
      const center = [
        location.coordinates.x,
        location.coordinates.z,
      ] as const;
      const profile = cityProfile(location.id, location.culture);
      const layout = createDistrictLayout(
        profile,
        location.id,
        center,
        "street",
        1280,
      );
      const field = createNavigationField(
        location.id,
        profile,
        center,
        layout,
      );

      expect(field.routes.length).toBeGreaterThanOrEqual(3);
      expect(field.obstacles.length).toBeGreaterThan(0);
      for (const route of field.routes) {
        for (let sample = 0; sample <= 80; sample += 1) {
          const pose = sampleNavigationRoute(route, sample / 80);
          expect(
            isNavigationPositionValid(field, pose),
            `${route.id} collided at ${sample}/80`,
          ).toBe(true);
        }
      }
    },
  );

  it("routes around an authored landmark footprint instead of crossing it", () => {
    const location = locationById.get("thaylen-city")!;
    const center = [
      location.coordinates.x,
      location.coordinates.z,
    ] as const;
    const profile = cityProfile(location.id, location.culture);
    const layout = createDistrictLayout(
      profile,
      location.id,
      center,
      "street",
      1280,
    );
    const landmark: NavigationObstacle = {
      id: "test-landmark-wall",
      x: center[0],
      z: center[1],
      halfWidth: 1.25,
      halfDepth: 0.5,
      rotation: 0.32,
    };
    const field = createNavigationField(
      location.id,
      profile,
      center,
      layout,
      [landmark],
    );

    expect(field.routes.some((route) => route.points.length > 3)).toBe(true);
    for (const route of field.routes) {
      for (let sample = 0; sample <= 100; sample += 1) {
        expect(
          isNavigationPositionValid(
            field,
            sampleNavigationRoute(route, sample / 100),
          ),
        ).toBe(true);
      }
    }
  });

  it("separates a crowd without pushing anyone into the environment", () => {
    const location = locationById.get("thaylen-city")!;
    const center = [
      location.coordinates.x,
      location.coordinates.z,
    ] as const;
    const profile = cityProfile(location.id, location.culture);
    const layout = createDistrictLayout(
      profile,
      location.id,
      center,
      "street",
      1280,
    );
    const field = createNavigationField(
      location.id,
      profile,
      center,
      layout,
    );
    const pose = sampleNavigationRoute(field.routes[0], 0.5);
    const separated = resolveCrowdSeparation(
      Array.from({ length: 6 }, () => ({ x: pose.x, z: pose.z })),
      field,
      4,
    );
    expect(
      separated.every((position) =>
        isNavigationPositionValid(field, position),
      ),
    ).toBe(true);
    expect(
      Math.max(
        ...separated.map((position) =>
          Math.hypot(position.x - pose.x, position.z - pose.z),
        ),
      ),
    ).toBeGreaterThan(0.01);
  });

  it("reuses caller-owned route and spatial-separation buffers for a large distributed crowd", () => {
    const field = surfaceTestContext().create();
    const poseBuffer = { x: 0, z: 0, heading: 0 };
    const sampled = sampleNavigationRouteInto(
      field.routes[0],
      0.42,
      poseBuffer,
    );
    expect(sampled).toBe(poseBuffer);

    const population = 118;
    const perRoute = Math.ceil(population / field.routes.length);
    const positions = Array.from({ length: population }, (_, index) => {
      const route = field.routes[index % field.routes.length];
      const slot = Math.floor(index / field.routes.length);
      return sampleNavigationRoute(
        route,
        (slot + 0.5) / perRoute,
      );
    });
    const firstPosition = positions[0];
    const workspace = createCrowdSeparationWorkspace(population);
    const result = resolveCrowdSeparationInPlace(
      positions,
      field,
      workspace,
    );

    expect(result).toBe(positions);
    expect(result[0]).toBe(firstPosition);
    expect(
      result.every((position) =>
        isNavigationPositionValid(field, position),
      ),
    ).toBe(true);
    expect(workspace.candidateChecks).toBeLessThan(population * 30);
  });

  it("routes around a water hole that falls between grid nodes", () => {
    const context = surfaceTestContext();
    const baseline = context.create();
    const baselineRoute = baseline.routes[0];
    const segmentIndex = Math.floor(baselineRoute.points.length / 2);
    const start = baselineRoute.points[segmentIndex - 1];
    const end = baselineRoute.points[segmentIndex];
    const waterHole = {
      x: (start.x + end.x) / 2,
      z: (start.z + end.z) / 2,
    };
    const isWalkable = (point: { x: number; z: number }) =>
      Math.hypot(point.x - waterHole.x, point.z - waterHole.z) >= 0.03;

    expect(isWalkable(start)).toBe(true);
    expect(isWalkable(end)).toBe(true);

    const field = context.create({ isWalkable });

    expect(field.routes.length).toBeGreaterThan(0);
    expect(isNavigationPositionValid(field, waterHole)).toBe(false);
    for (const route of field.routes) {
      for (let index = 1; index < route.points.length; index += 1) {
        const edgeStart = route.points[index - 1];
        const edgeEnd = route.points[index];
        for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
          expect(
            isWalkable({
              x: THREE.MathUtils.lerp(edgeStart.x, edgeEnd.x, progress),
              z: THREE.MathUtils.lerp(edgeStart.z, edgeEnd.z, progress),
            }),
          ).toBe(true);
        }
      }
    }
  });

  it("disconnects grid edges that exceed the maximum step height", () => {
    const context = surfaceTestContext();
    const baseline = context.create();
    const crossingEdge = baseline.routes
      .flatMap((route) =>
        route.points.slice(1).map((end, index) => ({
          start: route.points[index],
          end,
        })),
      )
      .find(({ start, end }) => Math.abs(end.x - start.x) > 0.1)!;
    const stepX = (crossingEdge.start.x + crossingEdge.end.x) / 2;
    const heightAt = (point: { x: number }) =>
      point.x < stepX ? 0 : 0.9;

    expect(
      Math.abs(heightAt(crossingEdge.end) - heightAt(crossingEdge.start)),
    ).toBeGreaterThan(0.2);

    const field = context.create({
      heightAt,
      maximumStepHeight: 0.2,
      maximumSlope: Number.POSITIVE_INFINITY,
    });

    expect(field.routes.length).toBeGreaterThan(0);
    for (const route of field.routes) {
      for (let index = 1; index < route.points.length; index += 1) {
        expect(
          Math.abs(
            heightAt(route.points[index]) -
              heightAt(route.points[index - 1]),
          ),
        ).toBeLessThanOrEqual(0.2);
      }
    }
  });

  it("disconnects grid edges that exceed the maximum walkable slope", () => {
    const context = surfaceTestContext();
    const heightAt = (point: { x: number }) =>
      (point.x - context.center[0]) * 3;
    const maximumSlope = 0.5;
    const field = context.create({
      heightAt,
      maximumStepHeight: Number.POSITIVE_INFINITY,
      maximumSlope,
    });

    expect(field.routes.length).toBeGreaterThan(0);
    for (const route of field.routes) {
      for (let index = 1; index < route.points.length; index += 1) {
        const start = route.points[index - 1];
        const end = route.points[index];
        const slope =
          Math.abs(heightAt(end) - heightAt(start)) /
          Math.hypot(end.x - start.x, end.z - start.z);
        expect(slope).toBeLessThanOrEqual(maximumSlope);
      }
    }
  });

  it("preserves legacy routes when surface callbacks are omitted or permissive", () => {
    const context = surfaceTestContext();
    const legacy = context.create();
    const permissive = context.create({
      isWalkable: () => true,
      heightAt: () => 42,
      maximumStepHeight: 0,
      maximumSlope: 0,
    });

    expect(permissive.routes).toEqual(legacy.routes);
    expect(permissive.obstacles).toEqual(legacy.obstacles);
  });
});
