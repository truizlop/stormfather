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
    obstacles.push({
      id: `landmark-${mesh.name}-${obstacles.length}`,
      x: center[0] + midpoint.x * scale,
      z: center[1] + midpoint.z * scale,
      halfWidth: Math.max(0.018, (size.x * scale) / 2),
      halfDepth: Math.max(0.018, (size.z * scale) / 2),
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

function neighboringKeys(node: GridNode) {
  return [
    gridKey(node.gx + 1, node.gz),
    gridKey(node.gx - 1, node.gz),
    gridKey(node.gx, node.gz + 1),
    gridKey(node.gx, node.gz - 1),
  ];
}

function edgeIsClear(
  start: GridNode,
  end: GridNode,
  obstacles: readonly NavigationObstacle[],
) {
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

function walkableNeighborKeys(
  node: GridNode,
  nodes: Map<string, GridNode>,
  obstacles: readonly NavigationObstacle[],
) {
  return neighboringKeys(node).filter((key) => {
    const neighbor = nodes.get(key);
    return neighbor && edgeIsClear(node, neighbor, obstacles);
  });
}

function largestConnectedComponent(
  nodes: Map<string, GridNode>,
  obstacles: readonly NavigationObstacle[],
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
      for (const neighborKey of walkableNeighborKeys(
        node,
        nodes,
        obstacles,
      )) {
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
  obstacles: readonly NavigationObstacle[],
) {
  const queue = [start.key];
  const visited = new Set([start.key]);
  const previous = new Map<string, string>();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const key = queue[cursor];
    if (key === end.key) break;
    const node = nodes.get(key);
    if (!node) continue;
    for (const neighborKey of walkableNeighborKeys(
      node,
      nodes,
      obstacles,
    )) {
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
      !points.every((point) =>
        isPointClear(point, obstacles, PEDESTRIAN_ENVIRONMENT_CLEARANCE),
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
): NavigationField {
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
        !isPointClear(point, obstacles)
      ) {
        continue;
      }
      const key = gridKey(gx, gz);
      nodes.set(key, { ...point, gx, gz, key });
    }
  }

  const component = largestConnectedComponent(nodes, obstacles);
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
      obstacles,
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
      ? kharbranthRalinsaRoutes(center, profile, obstacles)
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
  };
}

export function sampleNavigationRoute(
  route: NavigationRoute,
  progress: number,
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
      return {
        x: THREE.MathUtils.lerp(start.x, end.x, segmentProgress),
        z: THREE.MathUtils.lerp(start.z, end.z, segmentProgress),
        heading: Math.atan2(end.x - start.x, end.z - start.z),
      };
    }
    traveled += segmentLength;
  }
  const final = route.points[route.points.length - 1];
  return { x: final.x, z: final.z, heading: 0 };
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
    ) && isPointClear(point, field.obstacles)
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
  const minimumDistance = PEDESTRIAN_RADIUS_LOCAL_UNITS * 2.1;
  const resolved = positions.map((position) => ({ ...position }));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let left = 0; left < resolved.length; left += 1) {
      for (let right = left + 1; right < resolved.length; right += 1) {
        let dx = resolved[right].x - resolved[left].x;
        let dz = resolved[right].z - resolved[left].z;
        let distance = Math.hypot(dx, dz);
        if (distance >= minimumDistance) continue;
        if (distance < 0.00001) {
          const angle = (left * 2.399963 + right * 0.73) % (Math.PI * 2);
          dx = Math.cos(angle);
          dz = Math.sin(angle);
          distance = 1;
        }
        const correction = (minimumDistance - distance) / 2;
        const offsetX = (dx / distance) * correction;
        const offsetZ = (dz / distance) * correction;
        const leftCandidate = {
          x: resolved[left].x - offsetX,
          z: resolved[left].z - offsetZ,
        };
        const rightCandidate = {
          x: resolved[right].x + offsetX,
          z: resolved[right].z + offsetZ,
        };
        if (isNavigationPositionValid(field, leftCandidate)) {
          resolved[left] = leftCandidate;
        }
        if (isNavigationPositionValid(field, rightCandidate)) {
          resolved[right] = rightCandidate;
        }
      }
    }
  }
  return resolved;
}
