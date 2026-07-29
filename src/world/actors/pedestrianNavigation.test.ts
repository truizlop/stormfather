import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDistrictLayout } from "../cities/districtLayout";
import { cityProfile } from "../cities/profiles";
import { locationById } from "../locations";
import {
  createNavigationField,
  isNavigationPositionValid,
  landmarkNavigationObstacles,
  resolveCrowdSeparation,
  sampleNavigationRoute,
  type NavigationObstacle,
} from "./pedestrianNavigation";

const cases = ["kharbranth", "shattered-plains", "purelake", "thaylen-city"];

describe("pedestrian navigation", () => {
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
});
