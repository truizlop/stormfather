import type { DetailLevel } from "../types";
import { terrainHeightAt } from "../terrain/terrainHeight";
import type { GazetteerKind, GazetteerPlace } from "./types";

const detailRank: Record<DetailLevel, number> = {
  continent: 0,
  region: 1,
  city: 2,
  street: 3,
};

const waterKinds = new Set<GazetteerKind>(["lake", "river", "sea", "ocean", "strait"]);

export function isGazetteerPlaceVisibleAtLod(
  place: GazetteerPlace,
  detailLevel: DetailLevel,
) {
  return (
    place.renderable &&
    place.world !== null &&
    detailRank[detailLevel] >= detailRank[place.minimumLod]
  );
}

export function gazetteerMarkerY(place: GazetteerPlace) {
  if (place.world === null) {
    return 0;
  }
  if (waterKinds.has(place.kind)) {
    return 0.24;
  }
  return terrainHeightAt(place.world[0], place.world[1]) + 0.18;
}

export function isWithinGazetteerFocus(
  place: GazetteerPlace,
  focusWorld: readonly [number, number] | undefined,
  maxDistance: number,
) {
  if (!focusWorld || place.world === null) {
    return true;
  }
  return (
    Math.hypot(
      place.world[0] - focusWorld[0],
      place.world[1] - focusWorld[1],
    ) <= maxDistance
  );
}
