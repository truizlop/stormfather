import { describe, expect, it } from "vitest";
import { Color } from "three";
import {
  createShatteredPlainsCapGeometry,
  createShatteredPlainsFloorGeometry,
  createShatteredPlainsWallGeometry,
} from "./shatteredPlainsTerrainPatch";
import {
  SHATTERED_PLAINS_PATCH,
  SHATTERED_PLAINS_PLATEAUS,
} from "./shatteredPlainsTopology";

describe("Shattered Plains carved terrain geometry", () => {
  it("builds a closed floor and transition shoulder up to the coarse terrain", () => {
    const datum = 1.2;
    const geometry = createShatteredPlainsFloorGeometry(
      [40, 13.76],
      datum,
      () => 1.5,
      32,
      () => new Color("#556677"),
    );
    const positions = geometry.getAttribute("position");
    expect(positions.getY(0)).toBeCloseTo(
      datum + SHATTERED_PLAINS_PATCH.chasmFloorY,
    );
    const outerStart = 1 + 8 * 32;
    expect(positions.getY(outerStart)).toBeCloseTo(1.5);
    const colors = geometry.getAttribute("color");
    expect(colors.getX(0)).toBeCloseTo(colors.getX(1), 6);
    expect(colors.getY(0)).toBeCloseTo(colors.getY(1), 6);
    expect(colors.getZ(0)).toBeCloseTo(colors.getZ(1), 6);
    expect(geometry.getIndex()?.count).toBeGreaterThan(1_000);
    geometry.dispose();
  });

  it("extends every plateau lip continuously down into the chasm", () => {
    const geometry = createShatteredPlainsWallGeometry([0, 0], 1);
    const edgeCount = SHATTERED_PLAINS_PLATEAUS.reduce(
      (total, plateau) => total + plateau.polygon.length,
      0,
    );
    expect(geometry.getAttribute("position").count).toBe(
      edgeCount * 6 + 32 * 3,
    );
    expect(geometry.getIndex()?.count).toBe(
      edgeCount * 12 + 32 * 12,
    );
    const positions = geometry.getAttribute("position");
    const topRadius = Math.hypot(
      positions.getX(0),
      positions.getZ(0),
    );
    const bottomRadius = Math.hypot(
      positions.getX(4),
      positions.getZ(4),
    );
    expect(bottomRadius).toBeGreaterThan(topRadius + 0.07);
    const colors = geometry.getAttribute("color");
    expect(colors).toBeDefined();
    expect(
      colors.getX(4) + colors.getY(4) + colors.getZ(4),
    ).toBeLessThan(
      colors.getX(0) + colors.getY(0) + colors.getZ(0),
    );
    geometry.dispose();
  });

  it("broadens visual caps while keeping safe polygons inset", () => {
    const geometry = createShatteredPlainsCapGeometry([0, 0], 1);
    const expectedVertices = SHATTERED_PLAINS_PLATEAUS.reduce(
      (total, plateau) => total + plateau.polygon.length + 1,
      0,
    );
    const expectedTriangles = SHATTERED_PLAINS_PLATEAUS.reduce(
      (total, plateau) => total + plateau.polygon.length,
      0,
    );
    expect(geometry.getAttribute("position").count).toBe(
      expectedVertices,
    );
    expect(geometry.getIndex()?.count).toBe(expectedTriangles * 3);
    const positions = geometry.getAttribute("position");
    expect(positions.getX(1)).toBeGreaterThan(
      SHATTERED_PLAINS_PLATEAUS[0].polygon[0][0] + 0.15,
    );
    geometry.dispose();
  });

  it("matches the real terrain through the outer overlap band", () => {
    const heightAt = (x: number, z: number) =>
      0.42 + x * 0.03 - z * 0.015;
    const segments = 32;
    const geometry = createShatteredPlainsFloorGeometry(
      [2, -3],
      1.1,
      heightAt,
      segments,
    );
    const positions = geometry.getAttribute("position");
    // Transition ring five is beyond the compact handoff and therefore exactly
    // follows the selected-detail terrain; the outer ring stays coincident.
    for (const index of [1 + 7 * segments, 1 + 8 * segments]) {
      expect(positions.getY(index)).toBeCloseTo(
        heightAt(positions.getX(index), positions.getZ(index)),
        6,
      );
    }
    geometry.dispose();
  });
});
