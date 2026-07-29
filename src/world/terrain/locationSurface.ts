import { destinationAnchors } from "../cartography/geography";
import {
  KHARBRANTH_LANDMARK_SCALE,
  kharbranthRoadElevation,
} from "../cities/landmarkMetrics";
import {
  preStormDrainage,
  stormXAtTime,
} from "../weather/storm";
import { terrainHeightAt } from "./terrainHeight";

export const DETAILED_LOCATION_IDS = [
  "azir",
  "shattered-plains",
  "urithiru",
  "shinovar",
  "purelake",
  "aimia",
  "kharbranth",
  "kholinar",
  "thaylen-city",
] as const;

export type DetailedLocationId = (typeof DETAILED_LOCATION_IDS)[number];

export type WalkableSurfaceRole =
  | "pedestrian"
  | "structure"
  | "dock"
  | "watercraft";

export interface DetailedLocationSurface {
  id: DetailedLocationId;
  center: readonly [number, number];
  influenceRadius: number;
  supportY: (x: number, z: number) => number;
  walkableY: (
    x: number,
    z: number,
    role?: WalkableSurfaceRole,
  ) => number;
  waterY: (simulationTime?: number) => number | null;
  containsWalkablePoint: (
    x: number,
    z: number,
    role?: WalkableSurfaceRole,
  ) => boolean;
  maximumWalkSlope: number;
  maximumStepHeight: number;
}

interface SurfaceDefinition {
  id: DetailedLocationId;
  radiusX: number;
  radiusZ: number;
  influenceRadius: number;
  maximumWalkSlope: number;
  maximumStepHeight: number;
  supportOffset?: number;
  water?: "ocean" | "purelake";
}

export const OCEAN_WATER_HEIGHT = -0.16;
export const PURELAKE_BASE_WATER_HEIGHT = 0.08;
export const PURELAKE_PEDESTRIAN_HEIGHT = 0.11;
export const PURELAKE_LANDFORM_HEIGHT = 0.085;

const definitions: readonly SurfaceDefinition[] = [
  {
    id: "azir",
    radiusX: 4.7,
    radiusZ: 4.7,
    influenceRadius: 6.2,
    maximumWalkSlope: 0.42,
    maximumStepHeight: 0.12,
  },
  {
    id: "shattered-plains",
    radiusX: 5.65,
    radiusZ: 3.9,
    influenceRadius: 6.4,
    maximumWalkSlope: 0.36,
    maximumStepHeight: 0.1,
  },
  {
    id: "urithiru",
    radiusX: 4.2,
    radiusZ: 4.2,
    influenceRadius: 7.8,
    maximumWalkSlope: 0.48,
    maximumStepHeight: 0.14,
    supportOffset: -0.62,
  },
  {
    id: "shinovar",
    radiusX: 4.8,
    radiusZ: 3.75,
    influenceRadius: 6.7,
    maximumWalkSlope: 0.32,
    maximumStepHeight: 0.1,
  },
  {
    id: "purelake",
    radiusX: 4.8,
    radiusZ: 3.35,
    influenceRadius: 6.2,
    maximumWalkSlope: 0.18,
    maximumStepHeight: 0.08,
    water: "purelake",
  },
  {
    id: "aimia",
    radiusX: 4.6,
    radiusZ: 4.6,
    influenceRadius: 6.1,
    maximumWalkSlope: 0.4,
    maximumStepHeight: 0.11,
    water: "ocean",
  },
  {
    id: "kharbranth",
    radiusX: 6.4,
    radiusZ: 4.42,
    influenceRadius: 7.4,
    maximumWalkSlope: 0.44,
    maximumStepHeight: 0.13,
    water: "ocean",
  },
  {
    id: "kholinar",
    radiusX: 4.8,
    radiusZ: 4.25,
    influenceRadius: 6.2,
    maximumWalkSlope: 0.4,
    maximumStepHeight: 0.12,
  },
  {
    id: "thaylen-city",
    radiusX: 4.7,
    radiusZ: 4.05,
    influenceRadius: 6.3,
    maximumWalkSlope: 0.38,
    maximumStepHeight: 0.11,
    water: "ocean",
  },
] as const;

function insideEllipse(
  localX: number,
  localZ: number,
  radiusX: number,
  radiusZ: number,
) {
  return (
    (localX * localX) / (radiusX * radiusX) +
      (localZ * localZ) / (radiusZ * radiusZ) <=
    1
  );
}

function insideShatteredPlateau(localX: number, localZ: number) {
  const plateaus = [
    { x: -3.15, z: -1.8, radiusX: 2.14, radiusZ: 1.38 },
    { x: 0.45, z: -0.15, radiusX: 1.82, radiusZ: 1.28 },
    { x: 3.15, z: 1.35, radiusX: 1.28, radiusZ: 0.94 },
  ] as const;
  return plateaus.some((plateau) =>
    insideEllipse(
      localX - plateau.x,
      localZ - plateau.z,
      plateau.radiusX,
      plateau.radiusZ,
    ),
  );
}

function insidePurelakeFooting(localX: number, localZ: number) {
  if (Math.abs(localZ) < 0.2 && Math.abs(localX) < 3.9) return true;
  const footingCenters = [
    [-3.15, -1.1],
    [-2.1, 1.25],
    [-0.55, -1.55],
    [0.8, 1.35],
    [2.35, -1.05],
    [3.25, 0.75],
  ] as const;
  return footingCenters.some(([x, z]) =>
    insideEllipse(localX - x, localZ - z, 0.58, 0.44),
  );
}

function containsPoint(
  definition: SurfaceDefinition,
  center: readonly [number, number],
  x: number,
  z: number,
  role: WalkableSurfaceRole,
) {
  const localX = x - center[0];
  const localZ = z - center[1];
  if (definition.id === "shattered-plains") {
    return role === "watercraft"
      ? false
      : insideShatteredPlateau(localX, localZ);
  }
  if (definition.id === "purelake") {
    if (
      !insideEllipse(
        localX,
        localZ,
        definition.radiusX,
        definition.radiusZ,
      )
    ) {
      return false;
    }
    return role === "watercraft" || role === "structure"
      ? true
      : insidePurelakeFooting(localX, localZ);
  }
  return insideEllipse(
    localX,
    localZ,
    definition.radiusX,
    definition.radiusZ,
  );
}

function purelakeWaterHeight(simulationTime = 0) {
  const centerX = destinationAnchors.purelake[0];
  const drainage = preStormDrainage(
    stormXAtTime(simulationTime),
    centerX,
  );
  return PURELAKE_BASE_WATER_HEIGHT - drainage * 0.045;
}

function createSurface(
  definition: SurfaceDefinition,
): DetailedLocationSurface {
  const center = destinationAnchors[definition.id];
  return {
    id: definition.id,
    center,
    influenceRadius: definition.influenceRadius,
    supportY: (x, z) => {
      if (definition.id === "purelake") {
        return PURELAKE_LANDFORM_HEIGHT;
      }
      return terrainHeightAt(x, z) + (definition.supportOffset ?? 0);
    },
    walkableY: (x, z) => {
      if (definition.id === "purelake") {
        return PURELAKE_PEDESTRIAN_HEIGHT;
      }
      if (definition.id === "kharbranth") {
        const localThreeZ =
          (z - center[1]) / KHARBRANTH_LANDMARK_SCALE;
        const tier = Math.max(
          0,
          Math.min(5, Math.round((2.82 - localThreeZ) / 1.02)),
        );
        return (
          terrainHeightAt(center[0], center[1]) +
          kharbranthRoadElevation(tier)
        );
      }
      return terrainHeightAt(x, z) + 0.025;
    },
    waterY: (simulationTime = 0) => {
      if (definition.water === "purelake") {
        return purelakeWaterHeight(simulationTime);
      }
      return definition.water === "ocean" ? OCEAN_WATER_HEIGHT : null;
    },
    containsWalkablePoint: (x, z, role = "pedestrian") =>
      containsPoint(definition, center, x, z, role),
    maximumWalkSlope: definition.maximumWalkSlope,
    maximumStepHeight: definition.maximumStepHeight,
  };
}

const surfaceById = new Map<string, DetailedLocationSurface>(
  definitions.map((definition) => {
    const surface = createSurface(definition);
    return [surface.id, surface];
  }),
);

export function detailedLocationSurface(locationId: string) {
  return surfaceById.get(locationId) ?? null;
}

export function settlementSupportY(
  locationId: string,
  x: number,
  z: number,
) {
  return (
    detailedLocationSurface(locationId)?.supportY(x, z) ??
    terrainHeightAt(x, z)
  );
}

export function settlementWalkableY(
  locationId: string,
  x: number,
  z: number,
  role: WalkableSurfaceRole = "pedestrian",
) {
  return (
    detailedLocationSurface(locationId)?.walkableY(x, z, role) ??
    terrainHeightAt(x, z) + 0.025
  );
}

export function settlementWaterY(
  locationId: string,
  simulationTime = 0,
) {
  return (
    detailedLocationSurface(locationId)?.waterY(simulationTime) ?? null
  );
}

export function isSettlementPointWalkable(
  locationId: string,
  x: number,
  z: number,
  role: WalkableSurfaceRole = "pedestrian",
) {
  return (
    detailedLocationSurface(locationId)?.containsWalkablePoint(
      x,
      z,
      role,
    ) ?? true
  );
}
