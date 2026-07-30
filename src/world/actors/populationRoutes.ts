import { PEDESTRIAN_RADIUS_LOCAL_UNITS } from "../scale";

export interface PopulationRouteAssignment {
  routeIndex: number;
  routeSlot: number;
  routeOccupancy: number;
  phase: number;
  activityProgress: number;
  shelterProgress: number;
}

function stableStringSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Assigns one combined living population across every available route.
 * Occupancy differs by at most one, and each route's phases/activity/shelter
 * positions are evenly spaced so agents do not begin or shelter in a pile.
 */
export function createBalancedPopulationRouteAssignments(
  populationCount: number,
  routeCount: number,
  locationId: string,
): PopulationRouteAssignment[] {
  const count = Math.max(0, Math.floor(populationCount));
  const routes = Math.max(0, Math.floor(routeCount));
  if (count === 0 || routes === 0) return [];

  const routeOffset = stableStringSeed(locationId) % routes;
  const routeIndices = new Int32Array(count);
  const occupancies = new Int32Array(routes);
  for (let index = 0; index < count; index += 1) {
    const routeIndex = (index + routeOffset) % routes;
    routeIndices[index] = routeIndex;
    occupancies[routeIndex] += 1;
  }

  const slots = new Int32Array(routes);
  return Array.from({ length: count }, (_, index) => {
    const routeIndex = routeIndices[index];
    const routeSlot = slots[routeIndex]++;
    const routeOccupancy = occupancies[routeIndex];
    const normalizedSlot = (routeSlot + 0.5) / routeOccupancy;
    return {
      routeIndex,
      routeSlot,
      routeOccupancy,
      // Keep initial motion in one direction with evenly distributed starts.
      // Ping-pong reversal later remains collision-safe through local avoidance.
      phase: 0.025 + normalizedSlot * 0.95,
      activityProgress: 0.08 + normalizedSlot * 0.84,
      shelterProgress: 0.018 + normalizedSlot * 0.16,
    };
  });
}

/** Places high-detail actors in alternating pedestrian lanes beside the route. */
export function detailedPopulationLaneOffset(routeSlot: number) {
  const side = Math.abs(Math.floor(routeSlot)) % 2 === 0 ? -1 : 1;
  return side * PEDESTRIAN_RADIUS_LOCAL_UNITS * 2.2;
}
