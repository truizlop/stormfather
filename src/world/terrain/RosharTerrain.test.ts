import { describe, expect, it } from "vitest";
import {
  showCartographicLinework,
  terrainMeshSegments,
} from "./terrainMeshLod";

describe("Roshar terrain geometry LOD", () => {
  it("resolves close settlement terrain more finely than the atlas mesh", () => {
    const desktopOverview = terrainMeshSegments(false, false);
    const desktopLocal = terrainMeshSegments(false, true);
    const mobileOverview = terrainMeshSegments(true, false);
    const mobileLocal = terrainMeshSegments(true, true);

    expect(desktopLocal[0]).toBeGreaterThan(desktopOverview[0]);
    expect(desktopLocal[1]).toBeGreaterThan(desktopOverview[1]);
    expect(mobileLocal[0]).toBeGreaterThan(mobileOverview[0]);
    expect(mobileLocal[1]).toBeGreaterThan(mobileOverview[1]);
    expect(mobileLocal[0]).toBeLessThan(desktopLocal[0]);
  });

  it("keeps map-scale roads and destination pins out of local scenes", () => {
    expect(showCartographicLinework("continent")).toBe(true);
    expect(showCartographicLinework("region")).toBe(true);
    expect(showCartographicLinework("city")).toBe(false);
    expect(showCartographicLinework("street")).toBe(false);
  });
});
