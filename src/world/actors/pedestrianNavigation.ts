import * as THREE from "three";
import {
  PEDESTRIAN_CLEARANCE_LOCAL_UNITS,
  PEDESTRIAN_RADIUS_LOCAL_UNITS,
} from "../scale";
import {
  moduleMetrics,
  type DistrictLayout,
} from "../cities/districtLayout";
import {
  KHARBRANTH_LANDMARK_SCALE,
  kharbranthRoadOffset,
} from "../cities/landmarkMetrics";
import type { CityProfile } from "../cities/profiles";

export interface NavigationPoint {
  x: number;
  z: number;
}

export interface NavigationPose extends NavigationPoint {
  heading: number;
}

export interface NavigationSurfaceConstraints {
  isWalkable?: (point: NavigationPoint) => boolean;
  heightAt?: (point: NavigationPoint) => number;
  maximumStepHeight?: number;
  /** Maximum vertical rise per horizontal unit. */
  maximumSlope?: number;
}

export interface NavigationObstacle {
  id: string;
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
  rotation: number;
}

export interface NavigationRoute {
  id: string;
  points: readonly NavigationPoint[];
  length: number;
}

export interface NavigationField {
  center: readonly [number, number];
  locationId: string;
  profile: CityProfile;
  obstacles: readonly NavigationObstacle[];
  routes: readonly NavigationRoute[];
  surface?: NavigationSurfaceConstraints;
}

const GRID_STEP = 0.16;
export const PEDESTRIAN_ENVIRONMENT_CLEARANCE =
  PEDESTRIAN_RADIUS_LOCAL_UNITS +
  PEDESTRIAN_CLEARANCE_LOCAL_UNITS;

function pointInObstacle(
  point: NavigationPoint,
  obstacle: NavigationObstacle,
  clearance: number,
) {
  const dx = point.x - obstacle.x;
  const dz = point.z - obstacle.z;
  const cos = Math.cos(obstacle.rotation);
  const sin = Math.sin(obstacle.rotation);
  const localX = cos * dx + sin * dz;
  const localZ = -sin * dx + cos * dz;
  return (
    Math.abs(localX) <= obstacle.halfWidth + clearance &&
    Math.abs(localZ) <= obstacle.halfDepth + clearance
  );
}

export function isPointClear(
  point: NavigationPoint,
  obstacles: readonly NavigationObstacle[],
  clearance = PEDESTRIAN_ENVIRONMENT_CLEARANCE,
) {
  return obstacles.every(
    (obstacle) => !pointInObstacle(point, obstacle, clearance),
  );
}

function isSurfacePointWalkable(
  point: NavigationPoint,
  surface: NavigationSurfaceConstraints | undefined,
) {
  if (!surface) return true;
  if (surface.isWalkable && !surface.isWalkable(point)) return false;
  return !surface.heightAt || Number.isFinite(surface.heightAt(point));
}

function memoizedSurfaceConstraints(
  surface: NavigationSurfaceConstraints | undefined,
) {
  if (!surface) return undefined;
  const walkability = new Map<string, boolean>();
  const heights = new Map<string, number>();
  const keyFor = (point: NavigationPoint) =>
    `${point.x.toFixed(5)}:${point.z.toFixed(5)}`;
  return {
    ...surface,
    ...(surface.isWalkable
      ? {
          isWalkable: (point: NavigationPoint) => {
            const key = keyFor(point);
            const cached = walkability.get(key);
            if (cached !== undefined) return cached;
            const result = surface.isWalkable!(point);
            walkability.set(key, result);
            return result;
          },
        }
      : {}),
    ...(surface.heightAt
      ? {
          heightAt: (point: NavigationPoint) => {
            const key = keyFor(point);
            const cached = heights.get(key);
            if (cached !== undefined) return cached;
            const result = surface.heightAt!(point);
            heights.set(key, result);
            return result;
          },
        }
      : {}),
  } satisfies NavigationSurfaceConstraints;
}

export function isInsideWalkableDistrict(
  locationId: string,
  profile: Pick<CityProfile, "radius">,
  center: readonly [number, number],
  point: NavigationPoint,
) {
  const localX = point.x - center[0];
  const localZ = point.z - center[1];
  if (locationId === "shattered-plains") {
    const plateaus = [
      { x: -3.15, z: -1.8, rx: 2.14, rz: 1.38 },
      { x: 0.45, z: -0.15, rx: 1.82, rz: 1.28 },
      { x: 3.15, z: 1.35, rx: 1.28, rz: 0.94 },
    ] as const;
    return plateaus.some((plateau) => {
      const dx = (localX - plateau.x) / plateau.rx;
      const dz = (localZ - plateau.z) / plateau.rz;
      return dx * dx + dz * dz <= 1;
    });
  }
  const radiusX = profile.radius * 0.94;
  const radiusZ = profile.radius * 0.69;
  return (
    (localX * localX) / (radiusX * radiusX) +
      (localZ * localZ) / (radiusZ * radiusZ) <=
    1
  );
}

export function layoutNavigationObstacles(
  layout: DistrictLayout,
): NavigationObstacle[] {
  const buildingObstacles = layout.buildings.map(
    (building, index): NavigationObstacle => ({
      id: `building-${index}`,
      x: building.x,
      z: building.z,
      halfWidth: building.width / 2,
      halfDepth: building.depth / 2,
      rotation: building.rotation,
    }),
  );
  const moduleObstacles = layout.modules.flatMap(
    (module, index): NavigationObstacle[] => {
      const metric = moduleMetrics[module.name];
      if (!metric || metric.walkable) return [];
      return [
        {
          id: `module-${index}-${module.name}`,
          x: module.x,
          z: module.z,
          halfWidth: (metric.width * module.scale) / 2,
          halfDepth: (metric.depth * module.scale) / 2,
          rotation: module.rotation,
        },
      ];
    },
  );
  return [...buildingObstacles, ...moduleObstacles];
}

const landmarkColliderPattern =
  /(house|block|palace|ministry|grand_hall|archive|home|tree|rockbud|ruin|spike|stratum|central_spine|buttress|watchtower|windwall|monastery|wall|tower|pillar|column|core|crate|stall|warehouse|scaffold|tent|building|hut|defense|control_room)/i;
const landmarkDecorationPattern =
  /(window|roof|light|crown|finial|rail|drain|bell|seam|inlay|water|grass|field|road|walkway|sunwalk|platform|terrace|paving|floor|dock|quay|bridge|forecourt|island|mountain)/i;

/**
 * Converts the same GLB meshes rendered by Landmarks into conservative 2D
 * collision footprints. This keeps navigation registered to authored geometry
 * instead of a second, hand-drawn approximation.
 */
export function landmarkNavigationObstacles(
  scene: THREE.Group,
  rootName: string | undefined,
  center: readonly [number, number],
  scale: number,
  rotationY = 0,
) {
  if (!rootName) return [];
  const source = scene.getObjectByName(rootName);
  if (!source) return [];
  const clone = source.clone(true);
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);
  clone.updateMatrixWorld(true);
  const obstacles: NavigationObstacle[] = [];
  clone.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (
      !mesh.isMesh ||
      !landmarkColliderPattern.test(mesh.name) ||
      landmarkDecorationPattern.test(mesh.name)
    ) {
      return;
    }
    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const midpoint = box.getCenter(new THREE.Vector3());
    if (
      !Number.isFinite(size.x) ||
      !Number.isFinite(size.z) ||
      Math.max(size.x, size.z) < 0.055
    ) {
      return;
    }
    const cosine = Math.cos(rotationY);
    const sine = Math.sin(rotationY);
    const rotatedX = cosine * midpoint.x + sine * midpoint.z;
    const rotatedZ = -sine * midpoint.x + cosine * midpoint.z;
    obstacles.push({
      id: `landmark-${mesh.name}-${obstacles.length}`,
      x: center[0] + rotatedX * scale,
      z: center[1] + rotatedZ * scale,
      halfWidth: Math.max(
        0.018,
        ((Math.abs(cosine) * size.x + Math.abs(sine) * size.z) *
          scale) /
          2,
      ),
      halfDepth: Math.max(
        0.018,
        ((Math.abs(sine) * size.x + Math.abs(cosine) * size.z) *
          scale) /
          2,
      ),
      rotation: 0,
    });
  });
  return obstacles;
}

interface GridNode extends NavigationPoint {
  gx: number;
  gz: number;
  key: string;
}

function gridKey(gx: number, gz: number) {
  return `${gx}:${gz}`;
}

function edgeIsClear(
  start: NavigationPoint,
  end: NavigationPoint,
  obstacles: readonly NavigationObstacle[],
  surface: NavigationSurfaceConstraints | undefined,
) {
  if (!surface) {
    return [0.25, 0.5, 0.75].every((progress) =>
      isPointClear(
        {
          x: THREE.MathUtils.lerp(start.x, end.x, progress),
          z: THREE.MathUtils.lerp(start.z, end.z, progress),
        },
        obstacles,
      ),
    );
  }

  const samples = [0, 0.25, 0.5, 0.75, 1].map(
    (progress): NavigationPoint => ({
      x: THREE.MathUtils.lerp(start.x, end.x, progress),
      z: THREE.MathUtils.lerp(start.z, end.z, progress),
    }),
  );
  if (
    !samples.every(
      (point, index) =>
        (!surface.isWalkable || surface.isWalkable(point)) &&
        (index === 0 ||
          index === samples.length - 1 ||
          isPointClear(point, obstacles)),
    )
  ) {
    return false;
  }
  if (!surface.heightAt) return true;

  const heights = samples.map(surface.heightAt);
  if (!heights.every(Number.isFinite)) return false;
  const maximumStepHeight =
    surface.maximumStepHeight ?? Number.POSITIVE_INFINITY;
  const maximumSlope = surface.maximumSlope ?? Number.POSITIVE_INFINITY;
  return samples.slice(1).every((point, index) => {
    const previous = samples[index];
    const heightDelta = Math.abs(heights[index + 1] - heights[index]);
    const horizontalDistance = Math.hypot(
      point.x - previous.x,
      point.z - previous.z,
    );
    return (
      heightDelta <= maximumStepHeight &&
      (horizontalDistance === 0 ||
        heightDelta / horizontalDistance <= maximumSlope)
    );
  });
}

function createWalkableAdjacency(
  nodes: Map<string, GridNode>,
  obstacles: readonly NavigationObstacle[],
  surface: NavigationSurfaceConstraints | undefined,
) {
  const adjacency = new Map<string, string[]>();
  for (const key of nodes.keys()) adjacency.set(key, []);

  for (const node of nodes.values()) {
    // Every edge is bidirectional because both obstacle clearance and the
    // absolute slope/step contract are symmetric. Evaluate only east/north
    // once, then reuse this graph for connected-component discovery and all
    // ten route searches instead of resampling terrain eleven times.
    for (const neighborKey of [
      gridKey(node.gx + 1, node.gz),
      gridKey(node.gx, node.gz + 1),
    ]) {
      const neighbor = nodes.get(neighborKey);
      if (!neighbor || !edgeIsClear(node, neighbor, obstacles, surface)) {
        continue;
      }
      adjacency.get(node.key)!.push(neighborKey);
      adjacency.get(neighborKey)!.push(node.key);
    }
  }
  return adjacency;
}

function largestConnectedComponent(
  nodes: Map<string, GridNode>,
  adjacency: ReadonlyMap<string, readonly string[]>,
) {
  const unvisited = new Set(nodes.keys());
  let largest: GridNode[] = [];
  while (unvisited.size > 0) {
    const first = unvisited.values().next().value as string;
    const queue = [first];
    const component: GridNode[] = [];
    unvisited.delete(first);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const key = queue[cursor];
      const node = nodes.get(key);
      if (!node) continue;
      component.push(node);
      for (const neighborKey of adjacency.get(node.key) ?? []) {
        if (!unvisited.has(neighborKey)) continue;
        unvisited.delete(neighborKey);
        queue.push(neighborKey);
      }
    }
    if (component.length > largest.length) largest = component;
  }
  return largest;
}

function shortestGridPath(
  nodes: Map<string, GridNode>,
  allowed: Set<string>,
  start: GridNode,
  end: GridNode,
  adjacency: ReadonlyMap<string, readonly string[]>,
) {
  const queue = [start.key];
  const visited = new Set([start.key]);
  const previous = new Map<string, string>();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const key = queue[cursor];
    if (key === end.key) break;
    const node = nodes.get(key);
    if (!node) continue;
    for (const neighborKey of adjacency.get(node.key) ?? []) {
      if (!allowed.has(neighborKey) || visited.has(neighborKey)) continue;
      visited.add(neighborKey);
      previous.set(neighborKey, key);
      queue.push(neighborKey);
    }
  }
  if (!visited.has(end.key)) return [];
  const path: GridNode[] = [];
  let cursor = end.key;
  while (cursor !== start.key) {
    const node = nodes.get(cursor);
    if (!node) return [];
    path.push(node);
    const parent = previous.get(cursor);
    if (!parent) return [];
    cursor = parent;
  }
  path.push(start);
  return path.reverse();
}

function routeLength(points: readonly NavigationPoint[]) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].z - points[index - 1].z,
    );
  }
  return length;
}

function kharbranthRalinsaRoutes(
  center: readonly [number, number],
  profile: Pick<CityProfile, "radius">,
  obstacles: readonly NavigationObstacle[],
  surface: NavigationSurfaceConstraints | undefined,
) {
  return Array.from({ length: 6 }, (_, tier): NavigationRoute | null => {
    const roadOffset = kharbranthRoadOffset(tier);
    const roadZ = center[1] + roadOffset;
    const districtRadiusX = profile.radius * 0.94;
    const districtRadiusZ = profile.radius * 0.69;
    const ellipseHalfWidth =
      districtRadiusX *
        Math.sqrt(
          Math.max(
            0,
            1 - (roadOffset * roadOffset) / (districtRadiusZ * districtRadiusZ),
          ),
        ) -
      0.08;
    const halfWidth = Math.min(
      (4.65 - tier * 0.34) * KHARBRANTH_LANDMARK_SCALE - 0.38,
      ellipseHalfWidth,
    );
    const direction = tier % 2 === 0 ? 1 : -1;
    const startX = center[0] - halfWidth;
    const endX = center[0] + halfWidth;
    const points = Array.from({ length: 13 }, (_, pointIndex) => {
      const progress = pointIndex / 12;
      const x = THREE.MathUtils.lerp(startX, endX, progress);
      return {
        x: direction > 0 ? x : startX + endX - x,
        z: roadZ,
      };
    });
    if (
      !points.every(
        (point) =>
          isSurfacePointWalkable(point, surface) &&
          isPointClear(
            point,
            obstacles,
            PEDESTRIAN_ENVIRONMENT_CLEARANCE,
          ),
      ) ||
      !points
        .slice(1)
        .every((point, index) =>
          edgeIsClear(points[index], point, obstacles, surface),
        )
    ) {
      return null;
    }
    return {
      id: `kharbranth-ralinsa-tier-${tier + 1}`,
      points,
      length: routeLength(points),
    };
  }).filter((route): route is NavigationRoute => Boolean(route));
}

export function createNavigationField(
  locationId: string,
  profile: CityProfile,
  center: readonly [number, number],
  layout: DistrictLayout,
  landmarkObstacles: readonly NavigationObstacle[] = [],
  surface?: NavigationSurfaceConstraints,
): NavigationField {
  // Route construction revisits the same grid vertices and quarter-edge
  // samples thousands of times. Keep this cache local to one build so the
  // expensive terrain sampler is deduplicated without growing during frames.
  const routeSurface = memoizedSurfaceConstraints(surface);
  const obstacles = [
    ...layoutNavigationObstacles(layout),
    ...landmarkObstacles,
  ];
  const radiusX =
    locationId === "shattered-plains" ? 5.65 : profile.radius * 0.98;
  const radiusZ =
    locationId === "shattered-plains" ? 3.9 : profile.radius * 0.74;
  const nodes = new Map<string, GridNode>();
  const columns = Math.ceil((radiusX * 2) / GRID_STEP);
  const rows = Math.ceil((radiusZ * 2) / GRID_STEP);
  for (let gx = 0; gx <= columns; gx += 1) {
    for (let gz = 0; gz <= rows; gz += 1) {
      const point = {
        x: center[0] - radiusX + gx * GRID_STEP,
        z: center[1] - radiusZ + gz * GRID_STEP,
      };
      if (
        !isInsideWalkableDistrict(locationId, profile, center, point) ||
        !isPointClear(point, obstacles) ||
        !isSurfacePointWalkable(point, routeSurface)
      ) {
        continue;
      }
      const key = gridKey(gx, gz);
      nodes.set(key, { ...point, gx, gz, key });
    }
  }

  const adjacency = createWalkableAdjacency(
    nodes,
    obstacles,
    routeSurface,
  );
  const component = largestConnectedComponent(nodes, adjacency);
  const allowed = new Set(component.map((node) => node.key));
  const routes: NavigationRoute[] = [];
  for (let routeIndex = 0; routeIndex < 10; routeIndex += 1) {
    if (component.length < 2) break;
    const angle = (routeIndex * Math.PI) / 10 + 0.17;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ranked = [...component].sort(
      (a, b) =>
        (a.x - center[0]) * cos +
        (a.z - center[1]) * sin -
        ((b.x - center[0]) * cos + (b.z - center[1]) * sin),
    );
    const inset = Math.min(
      Math.floor(ranked.length * (0.015 + (routeIndex % 3) * 0.012)),
      Math.max(0, ranked.length - 2),
    );
    const start = ranked[inset];
    const end = ranked[ranked.length - 1 - inset];
    const rawPath = shortestGridPath(
      nodes,
      allowed,
      start,
      end,
      adjacency,
    );
    const points = rawPath.map(({ x, z }) => ({ x, z }));
    const length = routeLength(points);
    if (points.length < 2 || length < 0.72) continue;
    routes.push({
      id: `${locationId}-pedestrian-route-${routeIndex + 1}`,
      points,
      length,
    });
  }

  const authoredKharbranthRoutes =
    locationId === "kharbranth"
      ? kharbranthRalinsaRoutes(
          center,
          profile,
          obstacles,
          routeSurface,
        )
      : [];

  return {
    center,
    locationId,
    profile,
    obstacles,
    routes:
      authoredKharbranthRoutes.length > 0
        ? authoredKharbranthRoutes
        : routes,
    ...(surface ? { surface } : {}),
  };
}

export function sampleNavigationRoute(
  route: NavigationRoute,
  progress: number,
) {
  return sampleNavigationRouteInto(route, progress, {
    x: 0,
    z: 0,
    heading: 0,
  });
}

/** Samples into caller-owned storage for allocation-free animation frames. */
export function sampleNavigationRouteInto(
  route: NavigationRoute,
  progress: number,
  result: NavigationPose,
) {
  const target = THREE.MathUtils.clamp(progress, 0, 1) * route.length;
  let traveled = 0;
  for (let index = 1; index < route.points.length; index += 1) {
    const start = route.points[index - 1];
    const end = route.points[index];
    const segmentLength = Math.hypot(end.x - start.x, end.z - start.z);
    if (traveled + segmentLength >= target || index === route.points.length - 1) {
      const segmentProgress =
        segmentLength === 0
          ? 0
          : THREE.MathUtils.clamp(
              (target - traveled) / segmentLength,
              0,
              1,
            );
      result.x = THREE.MathUtils.lerp(start.x, end.x, segmentProgress);
      result.z = THREE.MathUtils.lerp(start.z, end.z, segmentProgress);
      result.heading = Math.atan2(end.x - start.x, end.z - start.z);
      return result;
    }
    traveled += segmentLength;
  }
  const final = route.points[route.points.length - 1];
  result.x = final.x;
  result.z = final.z;
  result.heading = 0;
  return result;
}

export function isNavigationPositionValid(
  field: NavigationField,
  point: NavigationPoint,
) {
  return (
    isInsideWalkableDistrict(
      field.locationId,
      field.profile,
      field.center,
      point,
    ) &&
    isPointClear(point, field.obstacles) &&
    isSurfacePointWalkable(point, field.surface)
  );
}

/**
 * A small deterministic local-avoidance pass prevents crowd members sharing the
 * same physical space at crossings. Candidate corrections are accepted only
 * when they remain inside the navigation field, so separation cannot push an
 * agent through a wall or over a chasm.
 */
export function resolveCrowdSeparation(
  positions: readonly NavigationPoint[],
  field: NavigationField,
  iterations = 2,
) {
  const resolved = positions.map((position) => ({ ...position }));
  return resolveCrowdSeparationInPlace(
    resolved,
    field,
    createCrowdSeparationWorkspace(resolved.length),
    iterations,
  );
}

export interface CrowdSeparationWorkspace {
  cellHeads: Map<number, number>;
  next: Int32Array;
  leftCandidate: NavigationPoint;
  rightCandidate: NavigationPoint;
  candidateChecks: number;
}

export function createCrowdSeparationWorkspace(
  capacity: number,
): CrowdSeparationWorkspace {
  return {
    cellHeads: new Map<number, number>(),
    next: new Int32Array(Math.max(0, Math.floor(capacity))),
    leftCandidate: { x: 0, z: 0 },
    rightCandidate: { x: 0, z: 0 },
    candidateChecks: 0,
  };
}

function zigZagInteger(value: number) {
  return value >= 0 ? value * 2 : -value * 2 - 1;
}

function crowdCellKey(cellX: number, cellZ: number) {
  const x = zigZagInteger(cellX);
  const z = zigZagInteger(cellZ);
  const sum = x + z;
  return (sum * (sum + 1)) / 2 + z;
}

/**
 * Spatial-hash local avoidance that mutates caller-owned position storage.
 * Work arrays and candidate points are reusable, keeping large crowd frames
 * free of array/object allocation while avoiding an all-pairs O(n²) scan.
 */
export function resolveCrowdSeparationInPlace(
  resolved: NavigationPoint[],
  field: NavigationField,
  workspace: CrowdSeparationWorkspace,
  iterations = 2,
) {
  const minimumDistance = PEDESTRIAN_RADIUS_LOCAL_UNITS * 2.1;
  if (workspace.next.length < resolved.length) {
    workspace.next = new Int32Array(resolved.length);
  }
  workspace.candidateChecks = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    workspace.cellHeads.clear();
    workspace.next.fill(-1, 0, resolved.length);
    for (let index = 0; index < resolved.length; index += 1) {
      const position = resolved[index];
      const cellX = Math.floor(position.x / minimumDistance);
      const cellZ = Math.floor(position.z / minimumDistance);
      const key = crowdCellKey(cellX, cellZ);
      workspace.next[index] = workspace.cellHeads.get(key) ?? -1;
      workspace.cellHeads.set(key, index);
    }

    for (let left = 0; left < resolved.length; left += 1) {
      const leftCellX = Math.floor(resolved[left].x / minimumDistance);
      const leftCellZ = Math.floor(resolved[left].z / minimumDistance);
      for (let cellOffsetX = -1; cellOffsetX <= 1; cellOffsetX += 1) {
        for (let cellOffsetZ = -1; cellOffsetZ <= 1; cellOffsetZ += 1) {
          let right =
            workspace.cellHeads.get(
              crowdCellKey(
                leftCellX + cellOffsetX,
                leftCellZ + cellOffsetZ,
              ),
            ) ?? -1;
          while (right >= 0) {
            if (right <= left) {
              right = workspace.next[right];
              continue;
            }
            workspace.candidateChecks += 1;
            let dx = resolved[right].x - resolved[left].x;
            let dz = resolved[right].z - resolved[left].z;
            let distance = Math.hypot(dx, dz);
            if (distance >= minimumDistance) {
              right = workspace.next[right];
              continue;
            }
            let directionLength = distance;
            if (distance < 0.00001) {
              const angle =
                (left * 2.399963 + right * 0.73) % (Math.PI * 2);
              dx = Math.cos(angle);
              dz = Math.sin(angle);
              distance = 0;
              directionLength = 1;
            }
            const correction = (minimumDistance - distance) / 2;
            const offsetX = (dx / directionLength) * correction;
            const offsetZ = (dz / directionLength) * correction;
            workspace.leftCandidate.x = resolved[left].x - offsetX;
            workspace.leftCandidate.z = resolved[left].z - offsetZ;
            workspace.rightCandidate.x = resolved[right].x + offsetX;
            workspace.rightCandidate.z = resolved[right].z + offsetZ;
            if (
              isNavigationPositionValid(field, workspace.leftCandidate)
            ) {
              resolved[left].x = workspace.leftCandidate.x;
              resolved[left].z = workspace.leftCandidate.z;
            }
            if (
              isNavigationPositionValid(field, workspace.rightCandidate)
            ) {
              resolved[right].x = workspace.rightCandidate.x;
              resolved[right].z = workspace.rightCandidate.z;
            }
            right = workspace.next[right];
          }
        }
      }
    }
  }
  return resolved;
}
