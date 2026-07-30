import type { DetailLevel } from "../types";
import { metersToLocal } from "../scale";
import { localCityPresenceId } from "../cities/progressiveLod";

export type CreatureSpecies =
  | "chasmfiend"
  | "chull"
  | "axehound"
  | "skyeel"
  | "cremling"
  | "sheep";

export type SprenType =
  | "windspren"
  | "lifespren"
  | "gloryspren"
  | "fearspren"
  | "rainspren";

export interface CreatureSeed {
  id: string;
  species: CreatureSpecies;
  phase: number;
  radius: number;
  angle: number;
  speed: number;
  scale: number;
}

export interface CreatureRuntimeBounds {
  lengthLocal: number;
  widthLocal: number;
  standingHeightLocal: number;
  lengthMeters: number;
  widthMeters: number;
  standingHeightMeters: number;
  lengthToWidth: number;
}

export interface EcologyNavigationPoint {
  x: number;
  z: number;
}

export interface EcologyNavigationRoute {
  points: readonly EcologyNavigationPoint[];
  length: number;
}

interface CreatureModelBounds {
  length: number;
  width: number;
  standingHeight: number;
}

/**
 * Measured axis-aligned bounds of the authored procedural geometry before
 * applying a CreatureSeed scale. The chasmfiend faces model-space -Z.
 */
export const CREATURE_MODEL_BOUNDS = {
  chasmfiend: {
    // Includes the animated tail spines, mandibles, jaws, and leg sweep.
    length: 4.426,
    width: 1.1,
    standingHeight: 1.7,
  },
  chull: {
    length: 1.45,
    width: 1.408,
    standingHeight: 0.946,
  },
  skyeel: {
    length: 2.0272,
    width: 0.78,
    standingHeight: 0.24,
  },
  axehound: {
    length: 1.802,
    width: 0.856,
    standingHeight: 0.651,
  },
  cremling: {
    length: 0.702,
    width: 0.766,
    standingHeight: 0.283,
  },
  sheep: {
    // Wool, muzzle, ears, tail, and planted hooves in CreatureModels.tsx.
    length: 1.74,
    width: 0.86,
    standingHeight: 1.04,
  },
} as const satisfies Record<CreatureSpecies, CreatureModelBounds>;

/**
 * Maximum model-space XZ distance from each actor origin. Unlike width-only
 * clearances these radii include the chull horns, axehound tail, cremling
 * head, and every chasmfiend appendage at the extremes of its gait.
 */
export const CREATURE_MODEL_FOOTPRINT_RADIUS = {
  chasmfiend: 2.237,
  chull: 0.981,
  axehound: 0.914,
  cremling: 0.433,
  skyeel: 0,
  sheep: 1.05,
} as const satisfies Record<CreatureSpecies, number>;

/**
 * Canonical physical-size limits. The local limits are derived from the same
 * meter contract used by the atlas instead of relying on visual guesswork.
 */
export const CREATURE_DIMENSION_CONTRACT = {
  chasmfiend: {
    lengthMeters: { minimum: 24, maximum: 32 },
    lengthLocal: {
      minimum: metersToLocal(24),
      maximum: metersToLocal(32),
    },
    widthMeters: { minimum: 7, maximum: 10 },
    widthLocal: {
      minimum: metersToLocal(7),
      maximum: metersToLocal(10),
    },
    standingHeightMeters: { minimum: 11, maximum: 12.5 },
    standingHeightLocal: {
      minimum: metersToLocal(11),
      maximum: metersToLocal(12.5),
    },
    minimumLengthToWidth: 2.5,
  },
  skyeel: {
    typicalLengthMeters: { minimum: 1.2, maximum: 1.55 },
    typicalLengthLocal: {
      minimum: metersToLocal(1.2),
      maximum: metersToLocal(1.55),
    },
    maximumLengthMeters: 2.13,
    maximumLengthLocal: metersToLocal(2.13),
  },
  axehound: {
    standingHeightMeters: { minimum: 0.45, maximum: 0.95 },
    standingHeightLocal: {
      minimum: metersToLocal(0.45),
      maximum: metersToLocal(0.95),
    },
  },
  sheep: {
    lengthMeters: { minimum: 1.2, maximum: 1.6 },
    lengthLocal: {
      minimum: metersToLocal(1.2),
      maximum: metersToLocal(1.6),
    },
    widthMeters: { minimum: 0.6, maximum: 0.82 },
    widthLocal: {
      minimum: metersToLocal(0.6),
      maximum: metersToLocal(0.82),
    },
    standingHeightMeters: { minimum: 0.78, maximum: 1 },
    standingHeightLocal: {
      minimum: metersToLocal(0.78),
      maximum: metersToLocal(1),
    },
  },
} as const;

/**
 * Pure model-to-atlas measurement used by tests, audits, and UI diagnostics.
 */
export function creatureRuntimeBounds(
  species: CreatureSpecies,
  scale: number,
): CreatureRuntimeBounds {
  const bounds = CREATURE_MODEL_BOUNDS[species];
  const metersPerLocalUnit = 1 / metersToLocal(1);
  const lengthLocal = bounds.length * scale;
  const widthLocal = bounds.width * scale;
  const standingHeightLocal = bounds.standingHeight * scale;
  return {
    lengthLocal,
    widthLocal,
    standingHeightLocal,
    lengthMeters: lengthLocal * metersPerLocalUnit,
    widthMeters: widthLocal * metersPerLocalUnit,
    standingHeightMeters: standingHeightLocal * metersPerLocalUnit,
    lengthToWidth: lengthLocal / widthLocal,
  };
}

export interface SprenSeed {
  id: string;
  type: SprenType;
  phase: number;
  radius: number;
  angle: number;
  altitude: number;
}

interface HabitatProfile {
  creatures: readonly CreatureSpecies[];
  spren: readonly SprenType[];
}

const defaultHabitat: HabitatProfile = {
  creatures: ["cremling", "axehound", "skyeel"],
  spren: ["windspren", "lifespren", "fearspren", "rainspren"],
};

const habitatProfiles: Record<string, HabitatProfile> = {
  roshar: {
    creatures: ["skyeel"],
    spren: ["windspren", "rainspren"],
  },
  alethkar: {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "gloryspren", "fearspren", "rainspren"],
  },
  "shattered-plains": {
    creatures: ["chasmfiend", "chull", "cremling", "skyeel"],
    spren: ["windspren", "gloryspren", "fearspren", "rainspren"],
  },
  kholinar: {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "gloryspren", "lifespren", "fearspren", "rainspren"],
  },
  azir: {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "lifespren", "gloryspren", "rainspren"],
  },
  shinovar: {
    creatures: ["sheep", "chull", "axehound", "cremling", "skyeel"],
    spren: ["lifespren", "windspren", "gloryspren"],
  },
  "jah-keved": {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "lifespren", "fearspren", "rainspren"],
  },
  purelake: {
    creatures: ["skyeel"],
    spren: ["lifespren", "windspren", "gloryspren", "rainspren"],
  },
  aimia: {
    creatures: ["cremling", "skyeel"],
    spren: ["windspren", "fearspren", "rainspren"],
  },
  kharbranth: {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "lifespren", "gloryspren", "fearspren", "rainspren"],
  },
  "thaylen-city": {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "lifespren", "gloryspren", "rainspren"],
  },
  urithiru: {
    creatures: ["chull", "cremling", "skyeel"],
    spren: ["windspren", "gloryspren", "lifespren"],
  },
};

const detailBudgets: Record<
  DetailLevel,
  { creatures: number; spren: number }
> = {
  continent: { creatures: 0, spren: 0 },
  region: { creatures: 0, spren: 0 },
  city: { creatures: 9, spren: 12 },
  street: { creatures: 16, spren: 20 },
};

export const SHINOVAR_PASTORAL_BUDGETS = {
  continent: { sheep: 0, shepherds: 0 },
  region: { sheep: 0, shepherds: 0 },
  city: { sheep: 5, shepherds: 1 },
  street: { sheep: 9, shepherds: 2 },
} as const satisfies Record<
  DetailLevel,
  { sheep: number; shepherds: number }
>;

/**
 * Shinovar is the one habitat where familiar grazing animals are part of the
 * cultural silhouette. Keep the herd legible without exceeding the existing
 * ecology budget on small screens.
 */
export function shinovarPastoralBudget(
  detailLevel: DetailLevel,
  compactViewport: boolean,
) {
  const base = SHINOVAR_PASTORAL_BUDGETS[detailLevel];
  if (base.sheep === 0) return base;
  if (!compactViewport) return base;
  return {
    sheep: Math.floor(base.sheep * 0.62),
    shepherds: Math.max(1, Math.floor(base.shepherds * 0.62)),
  };
}

/**
 * A continuous, terrain-facing patrol south of Stormseat. The previous
 * sub-meter shuttle made a thirty-meter creature tread in place and snap
 * through a 180° turn. This loop is long enough to read as locomotion while
 * keeping the complete body and all fourteen feet beyond the authored ruins,
 * warcamps, and bridge-run deck.
 */
export const CHASMFIEND_ROUTE = {
  centerX: 2,
  centerZ: -4.1,
  radiusX: 1.2,
  radiusZ: 1.2,
  angularRateMultiplier: 0.14,
  maximumArenaRadius: 7.2,
} as const;

export const CHASMFIEND_SCALE_LIMITS = {
  base: 0.57,
  variationMinimum: 0.95,
  variationMaximum: 1.05,
  minimum: 0.57 * 0.95,
  maximum: 0.57 * 1.05,
} as const;

export const SHATTERED_PLAINS_AUTHORED_SURFACE = {
  radiusX: 5.65,
  radiusZ: 3.9,
} as const;

export const CHASMFIEND_LEG_ROWS = [
  -1.02,
  -0.68,
  -0.34,
  0,
  0.34,
  0.68,
  1.02,
] as const;

export const CHASMFIEND_LEG_GEOMETRY = {
  hipX: 0.17,
  upperReach: 0.18,
  upperDrop: -0.23,
  lowerReach: 0.13,
  lowerDrop: -0.36,
  footZ: -0.02,
  footClearance: 0.025,
  footVerticalRadius: 0.055,
} as const;

/**
 * Navigation exclusion envelopes derived from the runtime-scaled Shattered
 * Plains GLB and its authored bridge-run deck.
 */
export const SHATTERED_PLAINS_AUTHORED_OBSTACLES = [
  {
    id: "stormseat-ruins",
    kind: "ellipse",
    x: 0,
    z: 0,
    radiusX: 1.25,
    radiusZ: 1.2,
  },
  {
    id: "western-warcamp",
    kind: "ellipse",
    x: -2.9,
    z: 0.1,
    radiusX: 1.45,
    radiusZ: 2.35,
  },
  {
    id: "eastern-temple",
    kind: "ellipse",
    x: 1.95,
    z: 2.2,
    radiusX: 0.7,
    radiusZ: 0.82,
  },
  {
    id: "occupied-east-plateau",
    kind: "ellipse",
    x: 3.15,
    z: 1.35,
    radiusX: 1.28,
    radiusZ: 0.94,
  },
  {
    id: "bridge-run-deck",
    kind: "capsule",
    startX: -1.05,
    startZ: -2.35,
    endX: 2.65,
    endZ: -0.35,
    radius: 0.46,
  },
] as const;

export const CHASMFIEND_FOOTPRINT_RADIUS =
  CREATURE_MODEL_FOOTPRINT_RADIUS.chasmfiend;

export const CHASMFIEND_FOOT_COUNT = CHASMFIEND_LEG_ROWS.length * 2;

interface MutableGroundPoint {
  x: number;
  z: number;
}

export function chasmfiendLegYawAt(
  legIndex: number,
  gaitPhase: number,
  stormStrength: number,
) {
  const row = Math.floor(legIndex / 2);
  const side = legIndex % 2 === 0 ? -1 : 1;
  const storm = Math.max(0, Math.min(1, stormStrength));
  const phase = gaitPhase + row * 0.72 + (side > 0 ? Math.PI : 0);
  return Math.sin(phase) * (0.16 - storm * 0.035);
}

/**
 * Alternating swing clearance. Terrain offsets seat stance feet; this lift is
 * applied only to the advancing half-cycle so the articulated feet do not all
 * scrape sideways across the ground.
 */
export function chasmfiendLegLiftAt(
  legIndex: number,
  gaitPhase: number,
  stormStrength: number,
) {
  const row = Math.floor(legIndex / 2);
  const side = legIndex % 2 === 0 ? -1 : 1;
  const storm = Math.max(0, Math.min(1, stormStrength));
  const phase = gaitPhase + row * 0.72 + (side > 0 ? Math.PI : 0);
  return Math.max(0, Math.sin(phase)) * (0.072 - storm * 0.018);
}

/**
 * Writes the animated contact point for one of the fourteen feet in model
 * space. Callers reuse their target objects so grounding creates no frame
 * garbage.
 */
export function writeChasmfiendFootContact(
  target: MutableGroundPoint,
  legIndex: number,
  gaitPhase: number,
  stormStrength: number,
) {
  const row = Math.floor(legIndex / 2);
  const side = legIndex % 2 === 0 ? -1 : 1;
  const rowZ = CHASMFIEND_LEG_ROWS[row] ?? 0;
  const rowReach = 1 - Math.abs(rowZ) * 0.1;
  const legX =
    side *
    (CHASMFIEND_LEG_GEOMETRY.upperReach +
      CHASMFIEND_LEG_GEOMETRY.lowerReach) *
    rowReach;
  const yaw = chasmfiendLegYawAt(
    legIndex,
    gaitPhase,
    stormStrength,
  );
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  target.x =
    side * CHASMFIEND_LEG_GEOMETRY.hipX +
    legX * cosYaw +
    CHASMFIEND_LEG_GEOMETRY.footZ * sinYaw;
  target.z =
    rowZ -
    legX * sinYaw +
    CHASMFIEND_LEG_GEOMETRY.footZ * cosYaw;
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicUnit(seed: string) {
  let value = hashString(seed);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967295;
}

function speciesScale(species: CreatureSpecies) {
  switch (species) {
    case "chasmfiend":
      return CHASMFIEND_SCALE_LIMITS.base;
    case "chull":
      return 0.3;
    case "axehound":
      return 0.114;
    case "skyeel":
      return 0.06;
    case "cremling":
      return 0.045;
    case "sheep":
      return 0.07;
  }
}

function speciesScaleVariation(
  species: CreatureSpecies,
  randomUnit: number,
) {
  switch (species) {
    case "chasmfiend":
      return (
        CHASMFIEND_SCALE_LIMITS.variationMinimum +
        randomUnit *
          (CHASMFIEND_SCALE_LIMITS.variationMaximum -
            CHASMFIEND_SCALE_LIMITS.variationMinimum)
      );
    case "axehound":
    case "skyeel":
      return 0.94 + randomUnit * 0.12;
    case "chull":
    case "cremling":
      return 0.86 + randomUnit * 0.28;
    case "sheep":
      return 0.92 + randomUnit * 0.16;
  }
}

export function resolveEcologyLocationId(
  detailLevel: DetailLevel,
  proximityLocationId: string | null,
  selectedId: string,
) {
  const localOwner = localCityPresenceId(
    detailLevel,
    proximityLocationId,
  );
  if (detailLevel === "city" || detailLevel === "street") {
    return localOwner;
  }
  return selectedId;
}

export function creatureCollisionClearance(seed: CreatureSeed) {
  return CREATURE_MODEL_FOOTPRINT_RADIUS[seed.species] * seed.scale;
}

export function creatureRouteIndex(seed: CreatureSeed, routeCount: number) {
  if (routeCount <= 0) return -1;
  return Math.min(
    routeCount - 1,
    Math.floor(deterministicUnit(`${seed.id}:navigation-route`) * routeCount),
  );
}

export function ecologyBudget(
  detailLevel: DetailLevel,
  compactViewport: boolean,
) {
  const base = detailBudgets[detailLevel];
  const multiplier = compactViewport ? 0.62 : 1;
  return {
    creatures: Math.floor(base.creatures * multiplier),
    spren: Math.floor(base.spren * multiplier),
  };
}

export function createCreatureSeeds(
  locationId: string,
  detailLevel: DetailLevel,
  compactViewport = false,
) {
  const profile = habitatProfiles[locationId] ?? defaultHabitat;
  const budget = ecologyBudget(detailLevel, compactViewport).creatures;
  // Ralinsa's street tiers have no corridor that clears both the complete
  // chull footprint and the resident lanes. Keep chulls visible at city
  // detail, but do not manufacture a clipping route in the tighter street
  // scene.
  const supportedCreatures =
    locationId === "kharbranth" && detailLevel === "street"
      ? profile.creatures.filter((species) => species !== "chull")
      : profile.creatures;
  const commonCreatures = supportedCreatures.filter(
    (species) => species !== "chasmfiend",
  );
  const pastoralBudget =
    locationId === "shinovar"
      ? shinovarPastoralBudget(detailLevel, compactViewport)
      : null;
  const nonPastoralCreatures = supportedCreatures.filter(
    (species) => species !== "sheep",
  );
  let heroScheduled = false;
  return Array.from({ length: budget }, (_, index): CreatureSeed => {
    let species: CreatureSpecies =
      pastoralBudget && index < pastoralBudget.sheep
        ? "sheep"
        : nonPastoralCreatures[
            (index - (pastoralBudget?.sheep ?? 0)) %
              nonPastoralCreatures.length
          ] ??
          supportedCreatures[index % supportedCreatures.length] ??
          "cremling";
    if (species === "chasmfiend") {
      if (heroScheduled && commonCreatures.length > 0) {
        species = commonCreatures[index % commonCreatures.length];
      } else {
        heroScheduled = true;
      }
    }
    const key = `${locationId}:${species}:${index}`;
    const large = species === "chasmfiend";
    const airborne = species === "skyeel";
    return {
      id: key,
      species,
      phase: deterministicUnit(`${key}:phase`) * Math.PI * 2,
      radius:
        large
          ? Math.max(CHASMFIEND_ROUTE.radiusX, CHASMFIEND_ROUTE.radiusZ)
          : (airborne ? 4.8 : 2.5) +
            deterministicUnit(`${key}:radius`) * 5.2,
      angle: deterministicUnit(`${key}:angle`) * Math.PI * 2,
      speed:
        0.22 +
        deterministicUnit(`${key}:speed`) *
          (species === "axehound"
            ? 0.5
            : species === "sheep"
              ? 0.18
              : 0.28),
      scale:
        speciesScale(species) *
        speciesScaleVariation(
          species,
          deterministicUnit(`${key}:scale`),
        ),
    };
  });
}

export function createSprenSeeds(
  locationId: string,
  detailLevel: DetailLevel,
  compactViewport = false,
) {
  const profile = habitatProfiles[locationId] ?? defaultHabitat;
  const budget = ecologyBudget(detailLevel, compactViewport).spren;
  return Array.from({ length: budget }, (_, index): SprenSeed => {
    const type = profile.spren[index % profile.spren.length] ?? "windspren";
    const key = `${locationId}:${type}:${index}`;
    return {
      id: key,
      type,
      phase: deterministicUnit(`${key}:phase`) * Math.PI * 2,
      radius: 1.5 + deterministicUnit(`${key}:radius`) * 6.4,
      angle: deterministicUnit(`${key}:angle`) * Math.PI * 2,
      altitude: 0.08 + deterministicUnit(`${key}:altitude`) * 0.72,
    };
  });
}

export interface CreatureMotion {
  x: number;
  z: number;
  heading: number;
  crouch: number;
  pace: number;
  gaitPhase: number;
}

function wrappedUnit(value: number) {
  return ((value % 1) + 1) % 1;
}

function smoothstep01(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function lerpAngle(start: number, end: number, amount: number) {
  const delta = Math.atan2(Math.sin(end - start), Math.cos(end - start));
  return start + delta * amount;
}

export function creatureStormSpeedMultiplier(
  species: CreatureSpecies,
  stormStrength: number,
) {
  const storm = Math.max(0, Math.min(1, stormStrength));
  switch (species) {
    case "chasmfiend":
      return 1 - storm * 0.28;
    case "axehound":
      return 1 + storm * 3.1;
    case "skyeel":
      return 1 + storm * 2.2;
    case "sheep":
      return 1 + storm * 2.55;
    case "chull":
    case "cremling":
      return 1 + storm * 0.7;
  }
}

/**
 * Integrates a stable locomotion clock with trapezoidal storm-speed sampling.
 * Motion functions consume this clock instead of multiplying absolute world
 * time by the current storm speed, which used to jump phase and route modulus
 * whenever proximity changed late in a session.
 */
export function advanceCreatureMotionClock(
  clock: number,
  simulationDelta: number,
  species: CreatureSpecies,
  previousStormStrength: number,
  stormStrength: number,
) {
  const previousMultiplier = creatureStormSpeedMultiplier(
    species,
    previousStormStrength,
  );
  const multiplier = creatureStormSpeedMultiplier(
    species,
    stormStrength,
  );
  return clock + simulationDelta * (previousMultiplier + multiplier) * 0.5;
}

function writeNavigationSample(
  target: CreatureMotion,
  route: EcologyNavigationRoute,
  progress: number,
) {
  const distance = Math.max(0, Math.min(1, progress)) * route.length;
  let traveled = 0;
  for (let index = 1; index < route.points.length; index += 1) {
    const start = route.points[index - 1];
    const end = route.points[index];
    const segmentLength = Math.hypot(end.x - start.x, end.z - start.z);
    if (
      traveled + segmentLength >= distance ||
      index === route.points.length - 1
    ) {
      const amount =
        segmentLength <= 0.000001
          ? 0
          : Math.max(
              0,
              Math.min(1, (distance - traveled) / segmentLength),
            );
      target.x = start.x + (end.x - start.x) * amount;
      target.z = start.z + (end.z - start.z) * amount;
      target.heading = Math.atan2(end.x - start.x, end.z - start.z);
      return target;
    }
    traveled += segmentLength;
  }
  const final = route.points[route.points.length - 1];
  target.x = final?.x ?? 0;
  target.z = final?.z ?? 0;
  target.heading = 0;
  return target;
}

/**
 * Writes an obstacle-cleared, zero-garbage route pose. Each traversal eases to
 * rest before a short deterministic turn, avoiding endpoint teleportation or
 * an instantaneous 180° heading flip.
 */
export function writeRoutedCreatureMotion(
  target: CreatureMotion,
  seed: CreatureSeed,
  route: EcologyNavigationRoute,
  motionClockSeconds: number,
  stormStrength: number,
) {
  const storm = Math.max(0, Math.min(1, stormStrength));
  const speed =
    seed.speed * creatureStormSpeedMultiplier(seed.species, storm);
  const travelSpeed = Math.max(0.045, seed.speed * 0.22);
  const travelDuration = route.length / travelSpeed;
  const turnDuration = 1.4;
  const cycleDuration = travelDuration * 2 + turnDuration * 2;
  const clock =
    wrappedUnit(
      (motionClockSeconds + seed.phase * 0.37) / cycleDuration,
    ) *
    cycleDuration;

  let moving = false;
  if (clock < travelDuration) {
    const routeProgress = smoothstep01(clock / travelDuration);
    writeNavigationSample(target, route, routeProgress);
    moving = true;
  } else if (clock < travelDuration + turnDuration) {
    writeNavigationSample(target, route, 1);
    target.heading = lerpAngle(
      target.heading,
      target.heading + Math.PI,
      smoothstep01((clock - travelDuration) / turnDuration),
    );
  } else if (clock < travelDuration * 2 + turnDuration) {
    const routeProgress = smoothstep01(
      (clock - travelDuration - turnDuration) / travelDuration,
    );
    writeNavigationSample(target, route, 1 - routeProgress);
    target.heading += Math.PI;
    moving = true;
  } else {
    writeNavigationSample(target, route, 0);
    target.heading = lerpAngle(
      target.heading + Math.PI,
      target.heading + Math.PI * 2,
      smoothstep01(
        (clock - travelDuration * 2 - turnDuration) / turnDuration,
      ),
    );
  }

  target.crouch = Math.max(0.42, 1 - storm * 0.5);
  target.pace = moving ? speed : 0;
  if (moving) {
    target.gaitPhase =
      motionClockSeconds * seed.speed * 8 + seed.phase;
  }
  return target;
}

/**
 * Sheep graze along their terrain-cleared pasture route in calm weather, then
 * converge on its final (west/leeward) point as the Highstorm arrives. The
 * blend remains continuous, so a changing storm strength cannot teleport the
 * herd or reverse its heading in one frame.
 */
export function writePastoralCreatureMotion(
  target: CreatureMotion,
  seed: CreatureSeed,
  route: EcologyNavigationRoute,
  motionClockSeconds: number,
  stormStrength: number,
) {
  writeRoutedCreatureMotion(
    target,
    seed,
    route,
    motionClockSeconds,
    stormStrength,
  );
  const shelter = route.points[route.points.length - 1];
  if (!shelter) return target;

  const storm = Math.max(0, Math.min(1, stormStrength));
  const retreat =
    smoothstep01((storm - 0.12) / 0.78) * 0.84;
  const deltaX = shelter.x - target.x;
  const deltaZ = shelter.z - target.z;
  const shelterHeading = Math.atan2(deltaX, deltaZ);
  target.x += deltaX * retreat;
  target.z += deltaZ * retreat;
  target.heading = lerpAngle(
    target.heading,
    shelterHeading,
    smoothstep01(retreat * 1.08),
  );

  const distanceToShelter = Math.hypot(
    shelter.x - target.x,
    shelter.z - target.z,
  );
  if (storm >= 0.9) {
    // Preserve a short, phase-derived spread along the final pasture lane
    // rather than collapsing every animal into the same point.
    target.pace = 0;
  } else if (retreat > 0.01 && distanceToShelter > 0.012) {
    target.pace = Math.max(
      target.pace,
      seed.speed * (1 + storm * 2.55),
    );
    target.gaitPhase =
      motionClockSeconds * seed.speed * (8 + storm * 4) + seed.phase;
  } else if (distanceToShelter <= 0.012) {
    target.pace = 0;
  }
  target.crouch = Math.max(0.7, 1 - storm * 0.28);
  return target;
}

export function writeCreatureMotion(
  target: CreatureMotion,
  seed: CreatureSeed,
  motionClockSeconds: number,
  stormStrength: number,
) {
  const storm = Math.max(0, Math.min(1, stormStrength));
  const isFlying = seed.species === "skyeel";
  const isChasmfiend = seed.species === "chasmfiend";
  const shelters = seed.species !== "chasmfiend";
  const speed =
    seed.speed * creatureStormSpeedMultiplier(seed.species, storm);
  const orbitRate =
    seed.speed *
    (isChasmfiend
      ? CHASMFIEND_ROUTE.angularRateMultiplier
      : isFlying
        ? 0.45
        : 0.12);
  const orbit = seed.angle + motionClockSeconds * orbitRate;
  const shelterRadius = shelters ? seed.radius * (1 - storm * 0.68) : seed.radius;
  const routeZScale = 0.72;
  const lateralAmplitude = 0.24;
  const lateralPhase =
    motionClockSeconds * seed.speed + seed.phase;
  const lateral = Math.sin(lateralPhase) * lateralAmplitude;
  const lateralRate =
    Math.cos(lateralPhase) * lateralAmplitude * seed.speed;
  const cosOrbit = Math.cos(orbit);
  const sinOrbit = Math.sin(orbit);
  const x = isChasmfiend
    ? CHASMFIEND_ROUTE.centerX + cosOrbit * CHASMFIEND_ROUTE.radiusX
    : cosOrbit * shelterRadius - sinOrbit * lateral;
  const z = isChasmfiend
    ? CHASMFIEND_ROUTE.centerZ + sinOrbit * CHASMFIEND_ROUTE.radiusZ
    : sinOrbit * shelterRadius * routeZScale + cosOrbit * lateral;
  const dx = isChasmfiend
    ? -sinOrbit * CHASMFIEND_ROUTE.radiusX * orbitRate
    : -sinOrbit * shelterRadius * orbitRate -
      cosOrbit * orbitRate * lateral -
      sinOrbit * lateralRate;
  const dz = isChasmfiend
    ? cosOrbit * CHASMFIEND_ROUTE.radiusZ * orbitRate
    : cosOrbit * shelterRadius * routeZScale * orbitRate -
      sinOrbit * orbitRate * lateral +
      cosOrbit * lateralRate;
  target.x = x;
  target.z = z;
  target.heading = Math.atan2(dx, dz);
  target.crouch = isChasmfiend
    ? 1 - storm * 0.12
    : Math.max(0.42, 1 - storm * 0.5);
  target.pace = speed;
  target.gaitPhase =
    motionClockSeconds *
      seed.speed *
      (isChasmfiend ? 1.8 : 8) +
    seed.phase;
  return target;
}

export function creatureMotionAt(
  seed: CreatureSeed,
  timeSeconds: number,
  stormStrength: number,
): CreatureMotion {
  return writeCreatureMotion(
    {
      x: 0,
      z: 0,
      heading: 0,
      crouch: 1,
      pace: 0,
      gaitPhase: seed.phase,
    },
    seed,
    timeSeconds,
    stormStrength,
  );
}

export interface SprenBehavior {
  visibility: number;
  speed: number;
  heightMultiplier: number;
  stormDrift: number;
}

export function sprenBehaviorAt(type: SprenType, stormStrength: number) {
  const storm = Math.max(0, Math.min(1, stormStrength));
  switch (type) {
    case "windspren":
      return {
        visibility: 0.75 + storm * 0.25,
        speed: 1 + storm * 4.8,
        heightMultiplier: 1 + storm * 0.5,
        stormDrift: storm * 2.4,
      } satisfies SprenBehavior;
    case "rainspren":
      return {
        visibility: 0.04 + storm * 0.96,
        speed: 1 + storm * 3.2,
        heightMultiplier: 0.7,
        stormDrift: storm * 1.8,
      } satisfies SprenBehavior;
    case "lifespren":
      return {
        visibility: 1 - storm * 0.88,
        speed: 1 - storm * 0.48,
        heightMultiplier: 1 - storm * 0.5,
        stormDrift: 0,
      } satisfies SprenBehavior;
    case "gloryspren":
      return {
        visibility: 1 - storm * 0.56,
        speed: 1 + storm * 0.35,
        heightMultiplier: 1 - storm * 0.25,
        stormDrift: storm * 0.2,
      } satisfies SprenBehavior;
    case "fearspren":
      return {
        visibility: 0.38 + storm * 0.62,
        speed: 0.8 + storm * 1.3,
        heightMultiplier: 1 - storm * 0.76,
        stormDrift: storm * 0.14,
      } satisfies SprenBehavior;
  }
}
