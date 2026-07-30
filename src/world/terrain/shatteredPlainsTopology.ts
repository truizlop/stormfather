import topologyJson from "./shatteredPlainsTopology.json";

export type ShatteredPlainsSurfaceRole =
  | "pedestrian"
  | "structure"
  | "chasm-creature";

export type ShatteredPlainsSurfaceKind =
  | "plateau"
  | "bridge"
  | "chasm";

export interface ShatteredPlainsSurfaceHit {
  kind: ShatteredPlainsSurfaceKind;
  id: string;
  /** Local height relative to the landmark's terrain datum. */
  y: number;
  normal: readonly [number, number, number];
}

export interface ShatteredPlainsPlateau {
  id: string;
  ring: number;
  capY: number;
  polygon: readonly (readonly [number, number])[];
}

export interface ShatteredPlainsBridge {
  id: string;
  sourcePlateauId: string;
  destinationPlateauId: string;
  start: readonly [number, number];
  end: readonly [number, number];
  startY: number;
  endY: number;
  width: number;
}

interface ShatteredPlainsTopology {
  version: number;
  units: "local-world-units";
  metersPerUnit: number;
  anchorLocationId: "shattered-plains";
  patch: {
    innerRadiusX: number;
    innerRadiusZ: number;
    outerRadiusX: number;
    outerRadiusZ: number;
    chasmFloorY: number;
  };
  plateaus: readonly ShatteredPlainsPlateau[];
  bridges: readonly ShatteredPlainsBridge[];
  districts: {
    narak: {
      plateauIds: readonly string[];
      anchor: readonly [number, number];
      canonicalMarkerOffset: readonly [number, number];
    };
    westernWarcamp: {
      plateauIds: readonly string[];
      anchor: readonly [number, number];
      foundation: {
        radius: number;
        walkableRadius: number;
        baseY: number;
        surfaceY: number;
      };
    };
  };
  activityPaths: {
    bridgeRun: {
      plateauId: string;
      points: readonly (readonly [number, number])[];
    };
  };
}

export const SHATTERED_PLAINS_TOPOLOGY =
  topologyJson as unknown as ShatteredPlainsTopology;

export const SHATTERED_PLAINS_PLATEAUS =
  SHATTERED_PLAINS_TOPOLOGY.plateaus;
export const SHATTERED_PLAINS_BRIDGES =
  SHATTERED_PLAINS_TOPOLOGY.bridges;
export const SHATTERED_PLAINS_PATCH =
  SHATTERED_PLAINS_TOPOLOGY.patch;
export const SHATTERED_PLAINS_NARAK =
  SHATTERED_PLAINS_TOPOLOGY.districts.narak;
export const SHATTERED_PLAINS_WESTERN_WARCAMP =
  SHATTERED_PLAINS_TOPOLOGY.districts.westernWarcamp;
export const SHATTERED_PLAINS_BRIDGE_RUN_PATH =
  SHATTERED_PLAINS_TOPOLOGY.activityPaths.bridgeRun.points;

const UP_NORMAL = [0, 1, 0] as const;
const BRIDGE_NAVIGATION_MARGIN = 0.045;
const plateauLookups = SHATTERED_PLAINS_PLATEAUS.map((plateau) => ({
  plateau,
  minX: Math.min(...plateau.polygon.map(([x]) => x)),
  maxX: Math.max(...plateau.polygon.map(([x]) => x)),
  minZ: Math.min(...plateau.polygon.map(([, z]) => z)),
  maxZ: Math.max(...plateau.polygon.map(([, z]) => z)),
}));

export const SHATTERED_PLAINS_NAVIGATION_RADIUS_X =
  Math.max(
    ...plateauLookups.flatMap(({ minX, maxX }) => [
      Math.abs(minX),
      Math.abs(maxX),
    ]),
    Math.abs(SHATTERED_PLAINS_WESTERN_WARCAMP.anchor[0]) +
      SHATTERED_PLAINS_WESTERN_WARCAMP.foundation.radius,
  ) + 0.08;
export const SHATTERED_PLAINS_NAVIGATION_RADIUS_Z =
  Math.max(
    ...plateauLookups.flatMap(({ minZ, maxZ }) => [
      Math.abs(minZ),
      Math.abs(maxZ),
    ]),
    Math.abs(SHATTERED_PLAINS_WESTERN_WARCAMP.anchor[1]) +
      SHATTERED_PLAINS_WESTERN_WARCAMP.foundation.radius,
  ) + 0.08;

function pointInPolygon(
  x: number,
  z: number,
  polygon: readonly (readonly [number, number])[],
) {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current++
  ) {
    const [currentX, currentZ] = polygon[current];
    const [previousX, previousZ] = polygon[previous];
    if (
      (currentZ > z) !== (previousZ > z) &&
      x <
        ((previousX - currentX) * (z - currentZ)) /
          (previousZ - currentZ) +
          currentX
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function segmentProjection(
  x: number,
  z: number,
  start: readonly [number, number],
  end: readonly [number, number],
) {
  const segmentX = end[0] - start[0];
  const segmentZ = end[1] - start[1];
  const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
  const progress =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((x - start[0]) * segmentX +
              (z - start[1]) * segmentZ) /
              lengthSquared,
          ),
        );
  return {
    distance: Math.hypot(
      x - (start[0] + segmentX * progress),
      z - (start[1] + segmentZ * progress),
    ),
    progress,
  };
}

function containingPlateau(localX: number, localZ: number) {
  return plateauLookups.find(
    ({ plateau, minX, maxX, minZ, maxZ }) =>
      localX >= minX &&
      localX <= maxX &&
      localZ >= minZ &&
      localZ <= maxZ &&
      pointInPolygon(localX, localZ, plateau.polygon),
  )?.plateau;
}

function containingBridge(localX: number, localZ: number) {
  let closest:
    | {
        bridge: ShatteredPlainsBridge;
        progress: number;
        distance: number;
      }
    | null = null;
  for (const bridge of SHATTERED_PLAINS_BRIDGES) {
    const projection = segmentProjection(
      localX,
      localZ,
      bridge.start,
      bridge.end,
    );
    if (
      projection.distance <=
      bridge.width / 2 + BRIDGE_NAVIGATION_MARGIN
    ) {
      if (!closest || projection.distance < closest.distance) {
        closest = {
          bridge,
          progress: projection.progress,
          distance: projection.distance,
        };
      }
    }
  }
  return closest;
}

export function isInsideShatteredPlainsPatch(
  localX: number,
  localZ: number,
  boundary: "inner" | "outer" = "inner",
) {
  const radiusX =
    boundary === "inner"
      ? SHATTERED_PLAINS_PATCH.innerRadiusX
      : SHATTERED_PLAINS_PATCH.outerRadiusX;
  const radiusZ =
    boundary === "inner"
      ? SHATTERED_PLAINS_PATCH.innerRadiusZ
      : SHATTERED_PLAINS_PATCH.outerRadiusZ;
  return (
    (localX * localX) / (radiusX * radiusX) +
      (localZ * localZ) / (radiusZ * radiusZ) <=
    1
  );
}

/**
 * Samples the same irregular plateau caps and authored bridge decks that are
 * present in Landmark_Shattered_Plains. Coordinates are local to the
 * Shattered Plains anchor and heights are relative to its terrain datum.
 */
export function shatteredPlainsSurfaceAt(
  localX: number,
  localZ: number,
  role: ShatteredPlainsSurfaceRole = "pedestrian",
): ShatteredPlainsSurfaceHit | null {
  const plateau = containingPlateau(localX, localZ);
  const warcamp = SHATTERED_PLAINS_WESTERN_WARCAMP;
  const insideWarcamp =
    Math.hypot(
      localX - warcamp.anchor[0],
      localZ - warcamp.anchor[1],
    ) <= warcamp.foundation.walkableRadius;

  if (role === "chasm-creature") {
    if (
      plateau ||
      insideWarcamp ||
      !isInsideShatteredPlainsPatch(localX, localZ)
    ) {
      return null;
    }
    return {
      kind: "chasm",
      id: "chasm-floor",
      y: SHATTERED_PLAINS_PATCH.chasmFloorY,
      normal: UP_NORMAL,
    };
  }

  if (role === "pedestrian") {
    const bridge = containingBridge(localX, localZ);
    if (bridge) {
      return {
        kind: "bridge",
        id: bridge.bridge.id,
        y:
          bridge.bridge.startY +
          (bridge.bridge.endY - bridge.bridge.startY) *
            bridge.progress,
        normal: UP_NORMAL,
      };
    }
  }

  if (insideWarcamp) {
    return {
      kind: "plateau",
      id: "western-warcamp",
      y: warcamp.foundation.surfaceY,
      normal: UP_NORMAL,
    };
  }

  return plateau
    ? {
        kind: "plateau",
        id: plateau.id,
        y: plateau.capY,
        normal: UP_NORMAL,
      }
    : null;
}

export function isShatteredPlainsFootprintSupported(
  localX: number,
  localZ: number,
  halfWidth: number,
  halfDepth: number,
  rotation: number,
) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const samples = [
    [0, 0],
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, halfDepth],
  ] as const;
  let plateauId: string | null = null;
  return samples.every(([sampleX, sampleZ]) => {
    const x = localX + cosine * sampleX + sine * sampleZ;
    const z = localZ - sine * sampleX + cosine * sampleZ;
    const hit = shatteredPlainsSurfaceAt(x, z, "structure");
    if (!hit || hit.kind !== "plateau") return false;
    plateauId ??= hit.id;
    return hit.id === plateauId;
  });
}

export function shatteredPlainsBridgeRoutes(
  center: readonly [number, number],
) {
  return SHATTERED_PLAINS_BRIDGES.map((bridge) => ({
    id: `shattered-plains-${bridge.id}`,
    points: [
      {
        x: center[0] + bridge.start[0],
        z: center[1] + bridge.start[1],
      },
      {
        x: center[0] + bridge.end[0],
        z: center[1] + bridge.end[1],
      },
    ] as const,
  }));
}
