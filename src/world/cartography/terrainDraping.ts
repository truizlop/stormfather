import { terrainHeightAt } from "../terrain/terrainHeight";
import type { GeographyPoint } from "./geography";

export type DrapedPoint = readonly [number, number, number];

/**
 * Adds intermediate samples without moving any authored control point. Screen-
 * space strokes otherwise bridge over Roshar's ridges between sparse map points.
 */
export function densifyPolyline(
  points: readonly GeographyPoint[],
  spacing = 0.32,
): GeographyPoint[] {
  if (points.length < 2) return [...points];

  const samples: GeographyPoint[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const divisions = Math.max(1, Math.ceil(distance / spacing));

    for (let step = 1; step <= divisions; step += 1) {
      const amount = step / divisions;
      samples.push([
        start[0] + (end[0] - start[0]) * amount,
        start[1] + (end[1] - start[1]) * amount,
      ]);
    }
  }
  return samples;
}

export function drapePolyline(
  points: readonly GeographyPoint[],
  elevation = 0.045,
  spacing = 0.32,
): DrapedPoint[] {
  return densifyPolyline(points, spacing).map(([x, z]) => [
    x,
    terrainHeightAt(x, z) + elevation,
    z,
  ]);
}
