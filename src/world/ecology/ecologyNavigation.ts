import {
  PEDESTRIAN_ENVIRONMENT_CLEARANCE,
  isInsideWalkableDistrict,
  isPointClear,
  type NavigationField,
  type NavigationObstacle,
  type NavigationPoint,
  type NavigationRoute,
} from "../actors/pedestrianNavigation";
import { detailedPopulationLaneOffset } from "../actors/populationRoutes";
import {
  creatureCollisionClearance,
  creatureRouteIndex,
  type CreatureSeed,
} from "./ecology";
import type { DetailLevel } from "../types";

const ecologyWalkableSupportPattern =
  /(terrainfoundation|plinthbatch)/i;
/**
 * Resident route centerlines are not their complete swept volume: detailed
 * actors alternate between lateral walking lanes, while articulated crowds
 * make smaller local-avoidance corrections. Preserve the pedestrian
 * environment margin beyond the authored detailed lane offset so an animal's
 * complete footprint cannot meet either population.
 */
export const ANIMAL_RESIDENT_ROUTE_CLEARANCE =
  PEDESTRIAN_ENVIRONMENT_CLEARANCE +
  Math.abs(detailedPopulationLaneOffset(0));
const ANIMAL_ROUTE_CANDIDATE_COUNT = 960;

export function isEcologyWalkableSupportObstacle(obstacleId: string) {
  return ecologyWalkableSupportPattern.test(obstacleId);
}

export function ecologyLandmarkCollisionRoot(
  modelRoot: string | undefined,
  detailLevel: DetailLevel,
) {
  return detailLevel === "city" || detailLevel === "street"
    ? (modelRoot ?? null)
    : null;
}

/**
 * District density changes only at the shared 720 px breakpoint. Quantizing
 * the input prevents a full GLB obstacle/navigation rebuild for every raw
 * resize pixel.
 */
export function ecologyLayoutViewportWidth(viewportWidth: number) {
  return viewportWidth < 720 ? 719 : 720;
}

export interface CreatureRouteCandidates {
  seed: CreatureSeed;
  routes: readonly NavigationRoute[];
}

function routeGeometrySignature(route: NavigationRoute) {
  const forward = route.points
    .map((point) => `${point.x.toFixed(4)},${point.z.toFixed(4)}`)
    .join(";");
  const reverse = [...route.points]
    .reverse()
    .map((point) => `${point.x.toFixed(4)},${point.z.toFixed(4)}`)
    .join(";");
  return forward < reverse ? forward : reverse;
}

function pointToSegmentDistance(
  point: NavigationPoint,
  start: NavigationPoint,
  end: NavigationPoint,
) {
  const segmentX = end.x - start.x;
  const segmentZ = end.z - start.z;
  const lengthSquared =
    segmentX * segmentX + segmentZ * segmentZ;
  const amount =
    lengthSquared <= 0.000001
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * segmentX +
              (point.z - start.z) * segmentZ) /
              lengthSquared,
          ),
        );
  return Math.hypot(
    point.x - (start.x + segmentX * amount),
    point.z - (start.z + segmentZ * amount),
  );
}

export function navigationRouteDistance(
  point: NavigationPoint,
  route: NavigationRoute,
) {
  if (route.points.length === 0) return Number.POSITIVE_INFINITY;
  if (route.points.length === 1) {
    return Math.hypot(
      point.x - route.points[0].x,
      point.z - route.points[0].z,
    );
  }
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < route.points.length; index += 1) {
    distance = Math.min(
      distance,
      pointToSegmentDistance(
        point,
        route.points[index - 1],
        route.points[index],
      ),
    );
  }
  return distance;
}

function segmentIntersectsExpandedObstacle(
  start: NavigationPoint,
  end: NavigationPoint,
  obstacle: NavigationObstacle,
  clearance: number,
) {
  const cosine = Math.cos(obstacle.rotation);
  const sine = Math.sin(obstacle.rotation);
  const startDeltaX = start.x - obstacle.x;
  const startDeltaZ = start.z - obstacle.z;
  const endDeltaX = end.x - obstacle.x;
  const endDeltaZ = end.z - obstacle.z;
  const localStartX =
    cosine * startDeltaX + sine * startDeltaZ;
  const localStartZ =
    -sine * startDeltaX + cosine * startDeltaZ;
  const localEndX = cosine * endDeltaX + sine * endDeltaZ;
  const localEndZ = -sine * endDeltaX + cosine * endDeltaZ;
  let minimumAmount = 0;
  let maximumAmount = 1;
  const axes = [
    [
      localStartX,
      localEndX - localStartX,
      obstacle.halfWidth + clearance,
    ],
    [
      localStartZ,
      localEndZ - localStartZ,
      obstacle.halfDepth + clearance,
    ],
  ] as const;

  for (const [axisStart, axisDelta, halfExtent] of axes) {
    if (Math.abs(axisDelta) <= 0.000001) {
      if (Math.abs(axisStart) > halfExtent) return false;
      continue;
    }
    let entryAmount = (-halfExtent - axisStart) / axisDelta;
    let exitAmount = (halfExtent - axisStart) / axisDelta;
    if (entryAmount > exitAmount) {
      [entryAmount, exitAmount] = [exitAmount, entryAmount];
    }
    minimumAmount = Math.max(minimumAmount, entryAmount);
    maximumAmount = Math.min(maximumAmount, exitAmount);
    if (minimumAmount > maximumAmount) return false;
  }
  return true;
}

/** Exact 2D segment test against every rotated, clearance-expanded collider. */
export function navigationSegmentClearsObstacles(
  start: NavigationPoint,
  end: NavigationPoint,
  obstacles: readonly NavigationObstacle[],
  clearance: number,
) {
  return obstacles.every(
    (obstacle) =>
      !segmentIntersectsExpandedObstacle(
        start,
        end,
        obstacle,
        clearance,
      ),
  );
}

/**
 * Assigns at most one creature to a route id, probing deterministically from
 * each seed's preferred slot. Candidate arrays may differ by species because
 * their full-footprint clearances differ.
 */
export function assignUniqueCreatureRoutes(
  candidates: readonly CreatureRouteCandidates[],
) {
  const assignments = new Map<string, NavigationRoute>();
  const usedRouteIds = new Set<string>();
  const usedRouteGeometry = new Set<string>();
  const routeGeometryByRoute = new Map<NavigationRoute, string>();
  for (const { seed, routes } of candidates) {
    const preferredIndex = creatureRouteIndex(seed, routes.length);
    if (preferredIndex < 0) continue;
    for (let offset = 0; offset < routes.length; offset += 1) {
      const route = routes[(preferredIndex + offset) % routes.length];
      let geometrySignature = routeGeometryByRoute.get(route);
      if (!geometrySignature) {
        geometrySignature = routeGeometrySignature(route);
        routeGeometryByRoute.set(route, geometrySignature);
      }
      if (
        usedRouteIds.has(route.id) ||
        usedRouteGeometry.has(geometrySignature)
      ) {
        continue;
      }
      assignments.set(seed.id, route);
      usedRouteIds.add(route.id);
      usedRouteGeometry.add(geometrySignature);
      break;
    }
  }
  return assignments;
}

function navigationPointIsSafe(
  point: NavigationPoint,
  navigation: NavigationField,
  clearance: number,
  residentRoutes: readonly NavigationRoute[],
) {
  if (
    !isInsideWalkableDistrict(
      navigation.locationId,
      navigation.profile,
      navigation.center,
      point,
    ) ||
    !isPointClear(point, navigation.obstacles, clearance)
  ) {
    return false;
  }
  const residentLaneClearance =
    clearance + ANIMAL_RESIDENT_ROUTE_CLEARANCE;
  if (
    residentRoutes.some(
      (route) =>
        navigationRouteDistance(point, route) <=
        residentLaneClearance,
    )
  ) {
    return false;
  }
  const surface = navigation.surface;
  if (surface?.isWalkable && !surface.isWalkable(point)) return false;
  return !surface?.heightAt || Number.isFinite(surface.heightAt(point));
}

function navigationSegmentIsSafe(
  start: NavigationPoint,
  end: NavigationPoint,
  navigation: NavigationField,
  clearance: number,
  residentRoutes: readonly NavigationRoute[],
) {
  if (
    !navigationSegmentClearsObstacles(
      start,
      end,
      navigation.obstacles,
      clearance,
    )
  ) {
    return false;
  }
  const distance = Math.hypot(end.x - start.x, end.z - start.z);
  const sampleCount = Math.max(4, Math.ceil(distance / 0.04));
  const sample: NavigationPoint = { x: start.x, z: start.z };
  const surface = navigation.surface;
  let previousHeight = surface?.heightAt?.(sample) ?? 0;
  if (
    !navigationPointIsSafe(
      sample,
      navigation,
      clearance,
      residentRoutes,
    ) ||
    !Number.isFinite(previousHeight)
  ) {
    return false;
  }
  for (let index = 1; index <= sampleCount; index += 1) {
    const amount = index / sampleCount;
    sample.x = start.x + (end.x - start.x) * amount;
    sample.z = start.z + (end.z - start.z) * amount;
    if (
      !navigationPointIsSafe(
        sample,
        navigation,
        clearance,
        residentRoutes,
      )
    ) {
      return false;
    }
    if (surface?.heightAt) {
      const height = surface.heightAt(sample);
      const horizontalStep = distance / sampleCount;
      const heightDelta = Math.abs(height - previousHeight);
      if (
        !Number.isFinite(height) ||
        heightDelta >
          (surface.maximumStepHeight ?? Number.POSITIVE_INFINITY) ||
        (horizontalStep > 0 &&
          heightDelta / horizontalStep >
            (surface.maximumSlope ?? Number.POSITIVE_INFINITY))
      ) {
        return false;
      }
      previousHeight = height;
    }
  }
  return true;
}

/**
 * A few authored districts have isolated walkable pockets too small to
 * produce a full pedestrian cross-city route. Search those same collision and
 * terrain constraints for short, readable animal patrols instead of letting
 * fauna clip through ruins or disappear.
 */
export function fallbackCreatureRoutes(
  navigation: NavigationField,
  seed: CreatureSeed,
  residentRoutes: readonly NavigationRoute[] = [],
) {
  const clearance = creatureCollisionClearance(seed);
  const routes: NavigationRoute[] = [];
  const profileRadius = navigation.profile.radius;
  const radiusX =
    navigation.locationId === "shattered-plains"
      ? 5.2
      : profileRadius * 0.84;
  const radiusZ =
    navigation.locationId === "shattered-plains"
      ? 3.45
      : profileRadius * 0.6;
  const candidateCenter: NavigationPoint = {
    x: navigation.center[0],
    z: navigation.center[1],
  };
  const start: NavigationPoint = { x: 0, z: 0 };
  const end: NavigationPoint = { x: 0, z: 0 };
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const maximumLength = Math.min(1.08, profileRadius * 0.24);
  const lengths = [
    maximumLength,
    maximumLength * 0.72,
    maximumLength * 0.5,
    maximumLength * 0.32,
    Math.max(0.16, maximumLength * 0.2),
  ];

  for (
    let candidateIndex = 0;
    candidateIndex < ANIMAL_ROUTE_CANDIDATE_COUNT;
    candidateIndex += 1
  ) {
    const ring =
      Math.sqrt(
        candidateIndex / (ANIMAL_ROUTE_CANDIDATE_COUNT - 1),
      ) * 0.96;
    const angle = candidateIndex * goldenAngle;
    candidateCenter.x =
      navigation.center[0] + Math.cos(angle) * radiusX * ring;
    candidateCenter.z =
      navigation.center[1] + Math.sin(angle) * radiusZ * ring;
    if (
      !navigationPointIsSafe(
        candidateCenter,
        navigation,
        clearance,
        residentRoutes,
      )
    ) {
      continue;
    }
    const minimumPatrolSeparation = Math.max(0.34, clearance * 2.6);
    if (
      routes.some((route) => {
        const first = route.points[0];
        const last = route.points[route.points.length - 1];
        return (
          Math.hypot(
            candidateCenter.x - (first.x + last.x) / 2,
            candidateCenter.z - (first.z + last.z) / 2,
          ) < minimumPatrolSeparation
        );
      })
    ) {
      continue;
    }
    let foundRoute = false;
    for (
      let directionIndex = 0;
      directionIndex < 12;
      directionIndex += 1
    ) {
      const heading =
        angle * 0.17 + (directionIndex * Math.PI) / 12;
      const directionX = Math.sin(heading);
      const directionZ = Math.cos(heading);
      for (const length of lengths) {
        const halfLength = length / 2;
        start.x = candidateCenter.x - directionX * halfLength;
        start.z = candidateCenter.z - directionZ * halfLength;
        end.x = candidateCenter.x + directionX * halfLength;
        end.z = candidateCenter.z + directionZ * halfLength;
        if (
          !navigationSegmentIsSafe(
            start,
            end,
            navigation,
            clearance,
            residentRoutes,
          )
        ) {
          continue;
        }
        routes.push({
          id: `${navigation.locationId}-${seed.species}-pocket-${routes.length + 1}`,
          points: [
            { x: start.x, z: start.z },
            { x: end.x, z: end.z },
          ],
          length,
        });
        foundRoute = true;
        break;
      }
      if (foundRoute) break;
    }
    if (routes.length >= 6) return routes;
  }
  return routes;
}
