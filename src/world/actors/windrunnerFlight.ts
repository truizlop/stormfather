import type { DetailLevel } from "../types";
import { deterministicUnit } from "../ecology/ecology";

export type WindrunnerRank = "captain" | "knight" | "squire";
export type WindrunnerFlightMode =
  | "patrol"
  | "launch"
  | "dive"
  | "stormguard";

export interface WindrunnerSeed {
  id: string;
  index: number;
  rank: WindrunnerRank;
  angle: number;
  radius: number;
  altitude: number;
  speed: number;
  phase: number;
  period: number;
  direction: -1 | 1;
  bodyScale: number;
  flightBand: "crown" | "perimeter";
}

export interface WindrunnerFlightPose {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  bank: number;
  speed: number;
  stormlight: number;
  mode: WindrunnerFlightMode;
}

/**
 * The authored Urithiru tower occupies a radius of roughly 4.2 local units at
 * its broadest terrace. Patrols retain this additional clearance even while
 * launching and diving so plated figures never pass through the architecture.
 */
export const URITHIRU_TOWER_CLEARANCE_RADIUS = 4.62;
export const URITHIRU_CROWN_CLEARANCE_RADIUS = 1.72;
export const URITHIRU_CROWN_MINIMUM_ALTITUDE = 9.18;

const detailBudgets: Record<DetailLevel, number> = {
  continent: 0,
  region: 3,
  city: 9,
  street: 13,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep01(value: number) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function arcPulse(value: number, start: number, end: number) {
  if (value <= start || value >= end) return 0;
  const progress = (value - start) / (end - start);
  return Math.sin(progress * Math.PI);
}

function normalizedCycle(seed: WindrunnerSeed, timeSeconds: number) {
  const raw =
    timeSeconds / seed.period + seed.phase / (Math.PI * 2);
  return ((raw % 1) + 1) % 1;
}

export function windrunnerBudget(
  detailLevel: DetailLevel,
  compactViewport: boolean,
) {
  const base = detailBudgets[detailLevel];
  if (!compactViewport || base === 0) return base;
  return Math.max(1, Math.floor(base * 0.58));
}

function rankFor(index: number): WindrunnerRank {
  if (index === 0) return "captain";
  if (index % 4 === 0) return "knight";
  return "squire";
}

export function createWindrunnerSeeds(
  detailLevel: DetailLevel,
  compactViewport = false,
): WindrunnerSeed[] {
  const count = windrunnerBudget(detailLevel, compactViewport);
  return Array.from({ length: count }, (_, index) => {
    const key = `urithiru:windrunner:${index}`;
    const flightBand = index % 5 === 0 ? "crown" : "perimeter";
    return {
      id: key,
      index,
      rank: rankFor(index),
      angle: deterministicUnit(`${key}:angle`) * Math.PI * 2,
      radius:
        flightBand === "crown"
          ? URITHIRU_CROWN_CLEARANCE_RADIUS +
            0.38 +
            deterministicUnit(`${key}:radius`) * 0.86
          : URITHIRU_TOWER_CLEARANCE_RADIUS +
            0.52 +
            deterministicUnit(`${key}:radius`) * 2.05,
      altitude:
        flightBand === "crown"
          ? URITHIRU_CROWN_MINIMUM_ALTITUDE +
            0.34 +
            deterministicUnit(`${key}:altitude`) * 0.74
          : 4.25 + deterministicUnit(`${key}:altitude`) * 4.85,
      speed:
        0.105 + deterministicUnit(`${key}:speed`) * 0.072,
      phase: deterministicUnit(`${key}:phase`) * Math.PI * 2,
      period:
        22 + deterministicUnit(`${key}:period`) * 17,
      direction: index % 3 === 1 ? -1 : 1,
      bodyScale:
        0.93 + deterministicUnit(`${key}:scale`) * 0.13,
      flightBand,
    };
  });
}

export function windrunnerFlightModeAt(
  seed: WindrunnerSeed,
  timeSeconds: number,
  stormStrength: number,
): WindrunnerFlightMode {
  if (clamp01(stormStrength) >= 0.62) return "stormguard";
  const cycle = normalizedCycle(seed, timeSeconds);
  if (cycle < 0.48) return "patrol";
  if (cycle < 0.64) return "launch";
  if (cycle < 0.82) return "dive";
  return "patrol";
}

interface FlightPosition {
  x: number;
  y: number;
  z: number;
  stormlight: number;
  mode: WindrunnerFlightMode;
}

export interface WindrunnerFlightWorkspace {
  current: FlightPosition;
  lookAhead: FlightPosition;
}

function emptyFlightPosition(): FlightPosition {
  return {
    x: 0,
    y: 0,
    z: 0,
    stormlight: 0,
    mode: "patrol",
  };
}

export function createWindrunnerFlightWorkspace(): WindrunnerFlightWorkspace {
  return {
    current: emptyFlightPosition(),
    lookAhead: emptyFlightPosition(),
  };
}

export function createWindrunnerFlightPose(): WindrunnerFlightPose {
  return {
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    pitch: 0,
    bank: 0,
    speed: 0,
    stormlight: 0,
    mode: "patrol",
  };
}

function writeFlightPositionAt(
  seed: WindrunnerSeed,
  timeSeconds: number,
  stormStrength: number,
  target: FlightPosition,
) {
  const storm = clamp01(stormStrength);
  const cycle = normalizedCycle(seed, timeSeconds);
  const mode = windrunnerFlightModeAt(seed, timeSeconds, storm);
  const crownPatrol = seed.flightBand === "crown";
  const maneuverStrength =
    (crownPatrol ? 0.24 : 1) -
    smoothstep01(storm * 1.12) * (crownPatrol ? 0.18 : 1);
  const launch =
    arcPulse(cycle, 0.48, 0.64) * maneuverStrength;
  const dive =
    arcPulse(cycle, 0.64, 0.82) * maneuverStrength;
  const orbit =
    seed.angle +
    timeSeconds *
      seed.speed *
      seed.direction *
      (1 + storm * 1.55);
  const formationTightening = 1 - storm * 0.14;
  const radius = Math.max(
    (crownPatrol
      ? URITHIRU_CROWN_CLEARANCE_RADIUS
      : URITHIRU_TOWER_CLEARANCE_RADIUS) + 0.18,
    seed.radius * formationTightening +
      Math.sin(orbit * 1.8 + seed.phase) * 0.28 -
      launch * 0.36 +
      dive * 0.92,
  );
  const stormLineOffset =
    storm * Math.sin(seed.index * 1.7 + orbit * 0.22) * 0.42;
  const rawX =
    Math.cos(orbit) * radius -
    storm * 0.38 +
    stormLineOffset;
  const rawZ =
    Math.sin(orbit) * radius * (0.72 - storm * 0.1) +
    Math.sin(orbit * 0.58 + seed.phase) * 0.22;
  const planarDistance = Math.max(0.0001, Math.hypot(rawX, rawZ));
  const clearanceRadius = crownPatrol
    ? URITHIRU_CROWN_CLEARANCE_RADIUS
    : URITHIRU_TOWER_CLEARANCE_RADIUS;
  const clearanceScale = Math.max(
    1,
    (clearanceRadius + 0.18) / planarDistance,
  );
  const x = rawX * clearanceScale;
  const z = rawZ * clearanceScale;
  const rawY =
    seed.altitude +
    Math.sin(orbit * 1.42 + seed.phase) * 0.48 +
    launch * 2.3 -
    dive * 1.86 +
    storm * (1.32 + (seed.index % 3) * 0.18);
  const y = crownPatrol
    ? Math.max(
        URITHIRU_CROWN_MINIMUM_ALTITUDE + storm * 0.55,
        rawY,
      )
    : rawY;
  const rankGlow =
    seed.rank === "captain" ? 0.16 : seed.rank === "knight" ? 0.08 : 0;
  target.x = x;
  target.y = y;
  target.z = z;
  target.stormlight =
    0.72 +
    rankGlow +
    storm * 0.76 +
    (launch + dive) * 0.18;
  target.mode = mode;
  return target;
}

export function writeWindrunnerFlightPoseAt(
  seed: WindrunnerSeed,
  timeSeconds: number,
  stormStrength: number,
  target: WindrunnerFlightPose,
  workspace: WindrunnerFlightWorkspace,
) {
  const current = writeFlightPositionAt(
    seed,
    timeSeconds,
    stormStrength,
    workspace.current,
  );
  const lookAhead = writeFlightPositionAt(
    seed,
    timeSeconds + 0.055,
    stormStrength,
    workspace.lookAhead,
  );
  const dx = lookAhead.x - current.x;
  const dy = lookAhead.y - current.y;
  const dz = lookAhead.z - current.z;
  const horizontalSpeed = Math.max(0.0001, Math.hypot(dx, dz));
  const speed = Math.hypot(dx, dy, dz) / 0.055;
  const storm = clamp01(stormStrength);
  const maneuverBank =
    current.mode === "launch"
      ? -0.12
      : current.mode === "dive"
        ? 0.18
        : 0;

  target.x = current.x;
  target.y = current.y;
  target.z = current.z;
  target.stormlight = current.stormlight;
  target.mode = current.mode;
  target.heading = Math.atan2(dx, dz);
  target.pitch = Math.atan2(dy, horizontalSpeed);
  target.bank =
    seed.direction * (-0.34 - storm * 0.32) +
    maneuverBank +
    Math.sin(timeSeconds * 0.31 + seed.phase) * 0.08;
  target.speed = speed;
  return target;
}

export function windrunnerFlightPoseAt(
  seed: WindrunnerSeed,
  timeSeconds: number,
  stormStrength: number,
): WindrunnerFlightPose {
  return writeWindrunnerFlightPoseAt(
    seed,
    timeSeconds,
    stormStrength,
    createWindrunnerFlightPose(),
    createWindrunnerFlightWorkspace(),
  );
}
