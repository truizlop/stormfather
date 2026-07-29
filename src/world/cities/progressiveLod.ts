import { locationById } from "../locations";
import { landmarkSurfaceY } from "../terrain/localSurface";
import { footprintContactAt } from "./districtLayout";
import { cityProfile, type CityProfile } from "./profiles";

export type CityLodTier = "far" | "mid" | "near";

export interface CityLodWeights {
  far: number;
  mid: number;
  near: number;
}

export interface CityLodConfig {
  nearDistance: number;
  farDistance: number;
  hysteresis: number;
  fadeSeconds: number;
}

export interface CityLodState {
  target: CityLodTier;
  weights: CityLodWeights;
}

export type CitySilhouetteStyle =
  | "tower"
  | "terraced-port"
  | "harbor"
  | "fortress"
  | "civic"
  | "lake"
  | "farm"
  | "warcamp"
  | "ruins"
  | "market";

export interface CitySilhouetteSeed {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  foundationWidth: number;
  foundationDepth: number;
  foundationDrop: number;
  color: string;
  roofColor: string;
}

export interface CitySilhouette {
  locationId: string;
  tier: "far" | "mid";
  style: CitySilhouetteStyle;
  center: readonly [number, number, number];
  profile: CityProfile;
  seeds: readonly CitySilhouetteSeed[];
  estimatedDrawCalls: 3;
}

interface RawSilhouetteSeed {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
}

const GOLDEN_ANGLE = 2.399963229728653;

export function cityLodConfig(
  profile: Pick<CityProfile, "radius">,
): CityLodConfig {
  return {
    nearDistance: profile.radius * 5,
    farDistance: profile.radius * 10,
    hysteresis: profile.radius * 0.45,
    fadeSeconds: 0.28,
  };
}

function tierForDistance(
  distance: number,
  config: CityLodConfig,
): CityLodTier {
  if (distance <= config.nearDistance) return "near";
  if (distance <= config.farDistance) return "mid";
  return "far";
}

export function createCityLodState(
  distance: number,
  config: CityLodConfig,
): CityLodState {
  const target = tierForDistance(distance, config);
  return {
    target,
    weights: {
      far: target === "far" ? 1 : 0,
      mid: target === "mid" ? 1 : 0,
      near: target === "near" ? 1 : 0,
    },
  };
}

function nextTarget(
  distance: number,
  current: CityLodTier,
  config: CityLodConfig,
): CityLodTier {
  if (current === "far") {
    return distance < config.farDistance - config.hysteresis ? "mid" : "far";
  }
  if (current === "near") {
    return distance > config.nearDistance + config.hysteresis ? "mid" : "near";
  }
  if (distance > config.farDistance + config.hysteresis) return "far";
  if (distance < config.nearDistance - config.hysteresis) return "near";
  return "mid";
}

/**
 * Mutates a persistent render-loop state object. Avoiding React state and
 * per-frame allocations keeps camera travel smooth while the weights crossfade.
 */
export function updateCityLodState(
  state: CityLodState,
  distance: number,
  deltaSeconds: number,
  config: CityLodConfig,
) {
  state.target = nextTarget(distance, state.target, config);
  const blend =
    config.fadeSeconds <= 0
      ? 1
      : 1 - Math.exp(-Math.max(0, deltaSeconds) / config.fadeSeconds);
  for (const tier of ["far", "mid", "near"] as const) {
    const targetWeight = tier === state.target ? 1 : 0;
    const next =
      state.weights[tier] +
      (targetWeight - state.weights[tier]) * blend;
    state.weights[tier] =
      Math.abs(targetWeight - next) < 0.0005 ? targetWeight : next;
  }
}

function silhouetteStyle(
  locationId: string,
  profile: CityProfile,
): CitySilhouetteStyle {
  if (locationId === "urithiru") return "tower";
  if (locationId === "kharbranth") return "terraced-port";
  if (locationId === "thaylen-city") return "harbor";
  if (profile.activity === "fortress") return "fortress";
  if (profile.activity === "civic") return "civic";
  if (profile.activity === "lake") return "lake";
  if (profile.activity === "farm") return "farm";
  if (profile.activity === "warcamp") return "warcamp";
  if (profile.activity === "ruins") return "ruins";
  return "market";
}

function radialSeed(
  profile: CityProfile,
  index: number,
  count: number,
  radiusScale: number,
) {
  const angle = index * GOLDEN_ANGLE + profile.id.length * 0.13;
  const normalized = ((index * 37 + profile.id.length * 11) % 97) / 96;
  const radius =
    profile.radius * radiusScale * (0.24 + Math.sqrt(normalized) * 0.76);
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius * 0.72,
    angle,
    normalized,
    count,
  };
}

function rawSeed(
  profile: CityProfile,
  style: CitySilhouetteStyle,
  index: number,
  count: number,
): RawSilhouetteSeed {
  const averageHeight = (profile.height[0] + profile.height[1]) / 2;
  const averageFootprint =
    (profile.footprint[0] + profile.footprint[1]) / 2;
  const radial = radialSeed(profile, index, count, 0.82);
  let x = radial.x;
  let z = radial.z;
  let width = averageFootprint * 2.2;
  let depth = averageFootprint * 2.1;
  let height = averageHeight * (1.55 + radial.normalized * 0.8);
  let rotation = radial.angle + Math.PI / 2;

  if (style === "tower") {
    if (index === 0) {
      return {
        x: 0,
        z: 0,
        width: profile.radius * 0.56,
        depth: profile.radius * 0.48,
        height: profile.radius * 1.34,
        rotation: 0,
      };
    }
    const ring = radialSeed(profile, index, count, 0.48);
    x = ring.x;
    z = ring.z;
    height = profile.radius * (0.22 + (1 - ring.normalized) * 0.34);
    width *= 1.35;
    depth *= 1.25;
  } else if (style === "terraced-port") {
    const row = index % 6;
    const bank = Math.floor(index / 6);
    const side = index % 2 === 0 ? -1 : 1;
    x =
      side * profile.radius * (0.18 + row * 0.075) +
      (bank % 2 === 0 ? -0.12 : 0.12);
    z =
      profile.radius * (0.5 - row * 0.18) +
      (index % 3) * 0.12 +
      bank * 0.16;
    height = profile.radius * (0.18 + row * 0.065);
    width *= 1.45;
    depth *= 1.15;
    rotation = 0;
  } else if (style === "harbor") {
    if (index === 0) {
      return {
        x: 0,
        z: profile.radius * 0.18,
        width: profile.radius * 0.38,
        depth: profile.radius * 0.32,
        height: profile.radius * 0.46,
        rotation: 0,
      };
    }
    const arc = -1.25 + (2.5 * (index - 1)) / Math.max(1, count - 2);
    x = Math.sin(arc) * profile.radius * 0.76;
    z = Math.cos(arc) * profile.radius * 0.58;
    height *= 1.15;
    width *= 1.35;
    rotation = -arc;
  } else if (style === "fortress") {
    if (index === 0) {
      return {
        x: 0,
        z: 0,
        width: profile.radius * 0.42,
        depth: profile.radius * 0.34,
        height: profile.radius * 0.48,
        rotation: 0,
      };
    }
    const angle = (2 * Math.PI * index) / Math.max(1, count - 1);
    x = Math.cos(angle) * profile.radius * 0.68;
    z = Math.sin(angle) * profile.radius * 0.52;
    width *= 1.7;
    depth *= 0.82;
    height = profile.radius * (0.15 + (index % 3) * 0.035);
    rotation = -angle;
  } else if (style === "civic") {
    if (index === 0) {
      height = profile.radius * 0.44;
      width = depth = profile.radius * 0.46;
      x = z = 0;
    } else {
      const axis = index % 4;
      const lane = Math.ceil(index / 4);
      x = axis < 2 ? (axis === 0 ? -1 : 1) * lane * 0.72 : 0;
      z = axis >= 2 ? (axis === 2 ? -1 : 1) * lane * 0.72 : 0;
      width *= 1.4;
      depth *= 1.4;
      height *= 1.15;
      rotation = axis >= 2 ? Math.PI / 2 : 0;
    }
  } else if (style === "lake") {
    width *= 1.8;
    depth *= 1.7;
    height *= 0.48;
  } else if (style === "farm") {
    width *= 1.45;
    depth *= 1.35;
    height *= 0.72;
  } else if (style === "warcamp") {
    width *= 2.1;
    depth *= 1.55;
    height *= index % 5 === 0 ? 1.65 : 0.62;
  } else if (style === "ruins") {
    width *= 0.82;
    depth *= 0.82;
    height *= 0.75 + (index % 4) * 0.48;
  }

  return { x, z, width, depth, height, rotation };
}

export function createCitySilhouette(
  locationId: string,
  tier: "far" | "mid",
): CitySilhouette {
  const location = locationById.get(locationId);
  if (!location) {
    throw new Error(`Unknown city location: ${locationId}`);
  }
  const profile = cityProfile(location.id, location.culture);
  const style = silhouetteStyle(location.id, profile);
  const count = tier === "far" ? 9 : 24;
  const baseY = landmarkSurfaceY(
    location.id,
    location.coordinates.x,
    location.coordinates.z,
  );
  const positionScale = tier === "far" ? 0.16 : 0.68;
  const horizontalScale = tier === "far" ? 0.34 : 0.67;
  const verticalScale = tier === "far" ? 0.2 : 0.58;
  const seeds = Array.from({ length: count }, (_, index) => {
    const raw = rawSeed(profile, style, index, count);
    const width = raw.width * horizontalScale;
    const depth = raw.depth * horizontalScale;
    const height = raw.height * verticalScale;
    const x = location.coordinates.x + raw.x * positionScale;
    const z = location.coordinates.z + raw.z * positionScale;
    const contact = footprintContactAt(
      location.id,
      x,
      z,
      width,
      depth,
      raw.rotation,
    );
    const skirt = tier === "far" ? 0.14 : 0.08;
    return {
      x,
      y: contact.y,
      z,
      width,
      depth,
      height,
      rotation: raw.rotation,
      foundationWidth: width * 1.12,
      foundationDepth: depth * 1.12,
      foundationDrop: contact.foundationDrop + skirt,
      color: profile.palette[index % profile.palette.length],
      roofColor:
        profile.roofPalette[index % profile.roofPalette.length],
    };
  });

  return {
    locationId,
    tier,
    style,
    center: [
      location.coordinates.x,
      baseY,
      location.coordinates.z,
    ],
    profile,
    seeds,
    estimatedDrawCalls: 3,
  };
}
