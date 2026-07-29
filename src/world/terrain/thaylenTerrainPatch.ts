import {
  destinationAnchors,
  type GeographyPoint,
} from "../cartography/geography";

const localLandPatch = [
  [-3.7, 1.65],
  [-4.35, 0.9],
  [-4.75, -0.35],
  [-4.55, -1.75],
  [-3.65, -3.05],
  [-2.35, -3.9],
  [-0.7, -4.35],
  [1, -4.25],
  [2.7, -3.7],
  [3.85, -2.8],
  [4.55, -1.55],
  [4.72, -0.15],
  [4.4, 0.95],
  [3.65, 1.7],
  [2.85, 1.95],
  [2.25, 1.65],
  [1.55, 1.82],
  [0.75, 1.62],
  [-0.1, 1.85],
  [-0.95, 1.65],
  [-1.75, 1.88],
  [-2.5, 1.55],
] as const;

/**
 * Close-detail land revealed beneath Thaylen City's authored merchant wards.
 *
 * This patch is deliberately absent from continent and region cartography. It
 * only repairs the reference coastline mask where that low-resolution mask
 * passes through the much more precise city footprint. Its asymmetric coves
 * keep the southern harbor mouth open rather than recreating a circular base.
 */
export const THAYLEN_CITY_TERRAIN_PATCH: readonly GeographyPoint[] =
  localLandPatch.map(([localX, localZ]) => [
    destinationAnchors["thaylen-city"][0] + localX,
    destinationAnchors["thaylen-city"][1] + localZ,
  ]);
