import { describe, expect, it } from "vitest";
import {
  aimiaOutline,
  destinationAnchors,
  inlandWaterPolygons,
  islandPolygons,
  mainlandOutline,
  mountainRidges,
  pointInPolygon,
  polygonBounds,
  referencePixelToWorld,
  riverPaths,
} from "./geography";

describe("canonical Roshar geography", () => {
  it("retains the high-density outer geography derived from the reference", () => {
    expect(mainlandOutline.length).toBeGreaterThanOrEqual(500);
    expect(aimiaOutline.length).toBeGreaterThanOrEqual(60);
    expect(islandPolygons.length).toBeGreaterThanOrEqual(45);
    expect(inlandWaterPolygons.length).toBeGreaterThanOrEqual(5);
    expect(
      islandPolygons.filter((island) => island.group === "reshi-isles")
        .length,
    ).toBeGreaterThanOrEqual(20);
  });

  it("preserves the reference landmass proportions and detached Aimia", () => {
    const mainland = polygonBounds(mainlandOutline);
    const aimia = polygonBounds(aimiaOutline);

    expect(mainland.maxX - mainland.minX).toBeGreaterThan(100);
    expect(mainland.maxZ - mainland.minZ).toBeGreaterThan(55);
    expect((mainland.maxX - mainland.minX) / (mainland.maxZ - mainland.minZ))
      .toBeGreaterThan(1.65);
    expect(aimia.maxX).toBeLessThan(mainland.minX);
  });

  it("keeps major destinations in their canonical spatial relationships", () => {
    expect(destinationAnchors.aimia[0]).toBeLessThan(
      destinationAnchors.shinovar[0],
    );
    expect(destinationAnchors.purelake[0]).toBeLessThan(
      destinationAnchors.urithiru[0],
    );
    expect(destinationAnchors.purelake[1]).toBeLessThan(
      destinationAnchors.urithiru[1],
    );
    expect(destinationAnchors["shattered-plains"][0]).toBeGreaterThan(
      destinationAnchors.alethkar[0],
    );
    expect(destinationAnchors.kharbranth[1]).toBeGreaterThan(
      destinationAnchors["jah-keved"][1],
    );
    expect(pointInPolygon(destinationAnchors.aimia, aimiaOutline)).toBe(true);
  });

  it("uses a stable reference-pixel transform for every authored map layer", () => {
    expect(referencePixelToWorld([950, 600])).toEqual([0, 0]);
    expect(referencePixelToWorld([1050, 700])).toEqual([6.4, 6.4]);
    expect(mountainRidges.length).toBeGreaterThanOrEqual(8);
    expect(riverPaths.length).toBeGreaterThanOrEqual(10);
    expect(mountainRidges.every((ridge) => ridge.points.length >= 4)).toBe(
      true,
    );
    expect(riverPaths.every((river) => river.points.length >= 4)).toBe(true);
  });
});
