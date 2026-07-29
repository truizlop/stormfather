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

interface CityPlanCalibration {
  origin: readonly [number, number];
  localUnitsPerPixel: readonly [number, number];
  landmarkScale: number;
}

const cityPlanCalibrations: Record<string, CityPlanCalibration> = {
  "kholinar-city-plan": {
    origin: [429, 575],
    localUnitsPerPixel: [1 / 80, 1 / 82],
    landmarkScale: (4.8 * 2) / 10.799,
  },
  "azimir-city-plan": {
    origin: [300, 420],
    localUnitsPerPixel: [1 / 50, 0.014],
    landmarkScale: (4.7 * 2) / 10.4,
  },
};

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

/**
 * Resolve a place to the point where its marker is actually drawn. Continental
 * sources use their world point directly; readable city-plan pixels are
 * registered into the selected authored city model.
 */
export function gazetteerMarkerWorld(
  place: GazetteerPlace,
): readonly [number, number] | null {
  if (place.world === null) return null;
  const placement = place.placementReference;
  const calibration = placement
    ? cityPlanCalibrations[placement.mapId]
    : undefined;
  if (!placement || !calibration) return place.world;
  return [
    place.world[0] +
      (placement.pixel[0] - calibration.origin[0]) *
        calibration.localUnitsPerPixel[0] *
        calibration.landmarkScale,
    place.world[1] +
      (placement.pixel[1] - calibration.origin[1]) *
        calibration.localUnitsPerPixel[1] *
        calibration.landmarkScale,
  ];
}

export interface GazetteerMarkerPlacement {
  place: GazetteerPlace;
  world: readonly [number, number];
  regionalClusterIndex: number | null;
  regionalClusterSize: number;
}

const REGIONAL_FAN_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const REGIONAL_FAN_BASE_RADIUS = 0.34;
const REGIONAL_FAN_RADIUS_STEP = 0.11;

function markerWorldKey(world: readonly [number, number]) {
  return `${world[0].toFixed(6)}:${world[1].toFixed(6)}`;
}

/**
 * Fan co-located regional records around their shared source anchor.
 *
 * This is presentation-only: the catalog coordinates remain unchanged and no
 * offset is applied to precise points or registered city-plan points. The
 * golden-angle fan avoids geometry/label piles without implying a canonical
 * compass bearing for any member of the cluster.
 */
export function layoutGazetteerMarkerWorlds(
  places: readonly GazetteerPlace[],
): readonly GazetteerMarkerPlacement[] {
  const resolved = places.flatMap((place) => {
    const world = gazetteerMarkerWorld(place);
    return world ? [{ place, world }] : [];
  });
  const regionalGroups = new Map<
    string,
    Array<(typeof resolved)[number]>
  >();

  for (const entry of resolved) {
    if (
      entry.place.certainty !== "regional" ||
      entry.place.placementReference !== undefined
    ) {
      continue;
    }
    const key = markerWorldKey(entry.world);
    const group = regionalGroups.get(key) ?? [];
    group.push(entry);
    regionalGroups.set(key, group);
  }

  const fanById = new Map<
    string,
    {
      world: readonly [number, number];
      index: number;
      size: number;
    }
  >();
  for (const group of regionalGroups.values()) {
    if (group.length < 2) continue;
    const stableGroup = [...group].sort((left, right) =>
      left.place.id.localeCompare(right.place.id),
    );
    stableGroup.forEach((entry, index) => {
      const angle = index * REGIONAL_FAN_GOLDEN_ANGLE;
      const radius =
        REGIONAL_FAN_BASE_RADIUS +
        REGIONAL_FAN_RADIUS_STEP * Math.sqrt(index);
      fanById.set(entry.place.id, {
        world: [
          entry.world[0] + Math.cos(angle) * radius,
          entry.world[1] + Math.sin(angle) * radius,
        ],
        index,
        size: stableGroup.length,
      });
    });
  }

  return resolved.map(({ place, world }) => {
    const fan = fanById.get(place.id);
    return {
      place,
      world: fan?.world ?? world,
      regionalClusterIndex: fan?.index ?? null,
      regionalClusterSize: fan?.size ?? 1,
    };
  });
}

export function gazetteerMarkerY(
  place: GazetteerPlace,
  markerWorld = gazetteerMarkerWorld(place),
) {
  if (place.world === null) {
    return 0;
  }
  if (waterKinds.has(place.kind)) {
    return 0.24;
  }
  const cityPlan = place.placementReference
    ? cityPlanCalibrations[place.placementReference.mapId]
    : undefined;
  if (cityPlan) {
    return terrainHeightAt(place.world[0], place.world[1]) + 2.8;
  }
  const [x, z] = markerWorld ?? place.world;
  return terrainHeightAt(x, z) + 0.025;
}

export function isWithinGazetteerFocus(
  place: GazetteerPlace,
  focusWorld: readonly [number, number] | undefined,
  maxDistance: number,
) {
  if (!focusWorld || place.world === null) {
    return true;
  }
  const markerWorld = gazetteerMarkerWorld(place) ?? place.world;
  return (
    Math.hypot(
      markerWorld[0] - focusWorld[0],
      markerWorld[1] - focusWorld[1],
    ) <= maxDistance
  );
}
