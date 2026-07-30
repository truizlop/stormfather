import { metersToLocal } from "../scale";
import type { DetailLevel } from "../types";
import type { NavigationRoute } from "../actors/pedestrianNavigation";
import {
  shinovarPastoralBudget,
  writePastoralCreatureMotion,
  type CreatureMotion,
  type CreatureSeed,
} from "./ecology";

export const SHINOVAR_SHEPHERD_SCALE = {
  heightMeters: 1.72,
  heightLocal: metersToLocal(1.72),
  staffHeightMeters: 1.82,
  staffHeightLocal: metersToLocal(1.82),
} as const;

export interface ShinovarShepherdAssignment {
  id: string;
  occupation: "herder";
  ordinal: number;
  leaderSeed: CreatureSeed;
  route: NavigationRoute;
}

/**
 * Connects each rendered herder to a real flock route and a deterministic lead
 * sheep. Assignments are bounded separately from the animal budget, so the
 * pastoral scene stays readable at city and street detail.
 */
export function createShinovarShepherdAssignments(
  sheepSeeds: readonly CreatureSeed[],
  routeByCreatureId: ReadonlyMap<string, NavigationRoute>,
  detailLevel: DetailLevel,
  compactViewport: boolean,
) {
  const budget = shinovarPastoralBudget(
    detailLevel,
    compactViewport,
  ).shepherds;
  const herds = new Map<
    string,
    { route: NavigationRoute; sheep: CreatureSeed[] }
  >();
  for (const seed of sheepSeeds) {
    if (seed.species !== "sheep") continue;
    const route = routeByCreatureId.get(seed.id);
    if (!route) continue;
    const herd = herds.get(route.id) ?? { route, sheep: [] };
    herd.sheep.push(seed);
    herds.set(route.id, herd);
  }

  return [...herds.values()]
    .slice(0, budget)
    .map(
      (herd, ordinal): ShinovarShepherdAssignment => ({
        id: `shinovar-herder-${ordinal + 1}`,
        occupation: "herder",
        ordinal,
        leaderSeed: herd.sheep[0],
        route: herd.route,
      }),
    );
}

/**
 * Keeps a herder just behind and beside the lead sheep, inside the sheep
 * route's already-validated swept clearance. During a Highstorm the herder
 * remains on the upwind/east side, visibly driving the flock into shelter.
 */
export function writeShinovarShepherdMotion(
  target: CreatureMotion,
  assignment: ShinovarShepherdAssignment,
  motionClockSeconds: number,
  stormStrength: number,
) {
  writePastoralCreatureMotion(
    target,
    assignment.leaderSeed,
    assignment.route,
    motionClockSeconds,
    stormStrength,
  );
  const directionX = Math.sin(target.heading);
  const directionZ = Math.cos(target.heading);
  const lateralX = directionZ;
  const lateralZ = -directionX;
  const trailingDistance = metersToLocal(0.46);
  const lateralDistance =
    metersToLocal(0.18) * (assignment.ordinal % 2 === 0 ? 1 : -1);
  target.x +=
    -directionX * trailingDistance + lateralX * lateralDistance;
  target.z +=
    -directionZ * trailingDistance + lateralZ * lateralDistance;
  target.crouch = Math.max(
    0.82,
    1 - Math.max(0, Math.min(1, stormStrength)) * 0.16,
  );
  return target;
}
