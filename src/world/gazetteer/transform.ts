import { referencePixelToWorld } from "../cartography/geography";
import type { GazetteerPlace } from "./types";

export const SEVENTEENTH_SHARD_MAP_SIZE = {
  width: 1024,
  height: 512,
} as const;

/**
 * Projective registration from the 17th Shard map's logical 1024 × 512 plane
 * into the 1889 × 1144 reference screenshot supplied for Stormfather.
 *
 * The matrix was fitted against shared cartographic labels, then authoritative
 * destination pixels already authored in geography.ts are used as explicit
 * overrides in the catalog for the principal destinations.
 */
export const SOURCE_TO_REFERENCE_HOMOGRAPHY = [
  2.002247595083611,
  -0.4316136482380094,
  -156.73017076584483,
  -0.04271270660900453,
  1.8115564026095228,
  17.352513627941875,
  -0.00008121554381488645,
  -0.00046490408281819325,
] as const;

export function sourceMapPixelToReferencePixel(
  source: readonly [number, number],
): readonly [number, number] {
  const [x, y] = source;
  const [h11, h12, h13, h21, h22, h23, h31, h32] =
    SOURCE_TO_REFERENCE_HOMOGRAPHY;
  const denominator = h31 * x + h32 * y + 1;
  return [
    (h11 * x + h12 * y + h13) / denominator,
    (h21 * x + h22 * y + h23) / denominator,
  ];
}

export function referencePixelToGazetteerWorld(
  reference: readonly [number, number],
): readonly [number, number] {
  return referencePixelToWorld(reference);
}

export function hasPlaceablePosition(
  place: GazetteerPlace,
): place is GazetteerPlace & {
  referencePixel: readonly [number, number];
  world: readonly [number, number];
  renderable: true;
} {
  return (
    place.renderable &&
    place.certainty !== "unknown" &&
    place.referencePixel !== null &&
    place.world !== null
  );
}
