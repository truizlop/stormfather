import { locationById } from "../locations";
import { landmarkSurfaceY } from "../terrain/localSurface";
import type { DetailLevel } from "../types";
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

export interface CityLodRenderPolicy {
  allowNear: boolean;
  forceNear: boolean;
  retainOutgoingNear: boolean;
}

export interface CityProximityCandidate {
  locationId: string;
  center: readonly [number, number, number];
  nearDistance: number;
  lensDistance: number;
}

export const CITY_LOD_HIDDEN_WEIGHT = 0.001;
export const CITY_PROXIMITY_HANDOFF_HYSTERESIS = 0.8;

export interface CityProximityOwnerOptions {
  currentOwnerId?: string | null;
  handoffHysteresis?: number;
  /**
   * MapControls' target (the point actually being viewed). Camera distance
   * still gates near-detail eligibility; this focus point disambiguates dense,
   * overlapping cities such as Kharbranth and Thaylen City.
   */
  focusPosition?: readonly [number, number, number];
}

export function effectiveCityLodDistance(
  cameraDistance: number,
  forceNear: boolean,
  allowNear = true,
  ownedNearActivationDistance?: number,
  blockedNearFloorDistance?: number,
) {
  if (forceNear) return 0;
  if (!allowNear) {
    return blockedNearFloorDistance === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(cameraDistance, blockedNearFloorDistance);
  }
  return ownedNearActivationDistance === undefined
    ? cameraDistance
    : Math.min(cameraDistance, ownedNearActivationDistance);
}

/**
 * Keep expensive authored content out of the React tree until its near tier is
 * requested. Once mounted, retain it long enough for the outgoing crossfade to
 * finish before releasing its cloned meshes and materials.
 */
export function cityNearDetailShouldMount(
  state: CityLodState,
  forceNear: boolean,
  allowNear = true,
  retainOutgoingNear = true,
) {
  if (forceNear) return true;
  if (!allowNear && !retainOutgoingNear) return false;
  return (
    (allowNear && state.target === "near") ||
    state.weights.near > CITY_LOD_HIDDEN_WEIGHT
  );
}

export function cityProximityCandidate(
  locationId: string,
): CityProximityCandidate {
  const silhouette = createCitySilhouette(locationId, "far");
  const config = cityLodConfig(silhouette.profile);
  return {
    locationId,
    center: silhouette.center,
    nearDistance: config.nearDistance,
    // The viewed point determines local ownership. A separate, wider lens
    // envelope permits majestic exterior cameras (notably Urithiru) without
    // letting an offscreen selected city remain active after the focus pans.
    lensDistance: config.farDistance,
  };
}

/**
 * Overlapping near-distance spheres are common at continental scale. Elect one
 * viewed owner so manual navigation cannot clone several authored scenes at
 * once. List/search selection is intentionally not an input: it can force near
 * detail only after this camera-derived owner confirms the city is in view.
 */
export function nearestCityProximityOwner(
  cameraPosition: readonly [number, number, number],
  candidates: readonly CityProximityCandidate[],
  options: CityProximityOwnerOptions = {},
) {
  const {
    currentOwnerId,
    handoffHysteresis = CITY_PROXIMITY_HANDOFF_HYSTERESIS,
    focusPosition = cameraPosition,
  } = options;

  let nearestCandidate: CityProximityCandidate | undefined;
  let nearestScore = Number.POSITIVE_INFINITY;
  let currentCandidate: CityProximityCandidate | undefined;
  let currentFocusDistance = Number.POSITIVE_INFINITY;
  let currentScore = Number.POSITIVE_INFINITY;
  const viewX = focusPosition[0] - cameraPosition[0];
  const viewY = focusPosition[1] - cameraPosition[1];
  const viewZ = focusPosition[2] - cameraPosition[2];
  const viewLength = Math.hypot(viewX, viewY, viewZ);
  const forwardX = viewLength > 0.0001 ? viewX / viewLength : 0;
  const forwardY = viewLength > 0.0001 ? viewY / viewLength : 0;
  const forwardZ = viewLength > 0.0001 ? viewZ / viewLength : 0;
  for (const candidate of candidates) {
    const cameraDistance = Math.hypot(
      cameraPosition[0] - candidate.center[0],
      cameraPosition[1] - candidate.center[1],
      cameraPosition[2] - candidate.center[2],
    );
    const focusDistance = Math.hypot(
      focusPosition[0] - candidate.center[0],
      focusPosition[1] - candidate.center[1],
      focusPosition[2] - candidate.center[2],
    );
    const centerFromFocusX = candidate.center[0] - focusPosition[0];
    const centerFromFocusY = candidate.center[1] - focusPosition[1];
    const centerFromFocusZ = candidate.center[2] - focusPosition[2];
    const forwardDepth =
      centerFromFocusX * forwardX +
      centerFromFocusY * forwardY +
      centerFromFocusZ * forwardZ;
    // A focus on Kharbranth's harbor-side lower road is geographically
    // nearer Thaylen's map anchor, but the city being inspected is several
    // units farther along the sightline while Thaylen is behind the camera.
    // Reward visible mass beyond the focus plane and penalize candidates
    // behind it; center-targeted views keep their natural zero score.
    const ownershipScore =
      focusDistance -
      Math.max(0, Math.min(focusDistance, forwardDepth)) * 0.78 +
      Math.max(0, -forwardDepth) * 1.6;
    if (candidate.locationId === currentOwnerId) {
      currentCandidate = candidate;
      currentFocusDistance = focusDistance;
      currentScore = ownershipScore;
    }
    // Both the lens and the viewed point must be local. This keeps a nearby
    // city from mounting behind the camera and makes proximity clear as soon
    // as the user pans back to a regional view.
    if (
      cameraDistance > candidate.lensDistance ||
      focusDistance > candidate.nearDistance
    ) {
      continue;
    }
    if (
      !nearestCandidate ||
      ownershipScore < nearestScore ||
      (ownershipScore === nearestScore &&
        candidate.locationId < nearestCandidate.locationId)
    ) {
      nearestCandidate = candidate;
      nearestScore = ownershipScore;
    }
  }

  if (
    currentCandidate &&
    Math.hypot(
      cameraPosition[0] - currentCandidate.center[0],
      cameraPosition[1] - currentCandidate.center[1],
      cameraPosition[2] - currentCandidate.center[2],
    ) <= currentCandidate.lensDistance + handoffHysteresis &&
    currentFocusDistance <=
      currentCandidate.nearDistance + handoffHysteresis
  ) {
    if (
      nearestCandidate &&
      nearestCandidate.locationId !== currentCandidate.locationId &&
      nearestScore + handoffHysteresis < currentScore
    ) {
      return nearestCandidate.locationId;
    }
    return currentCandidate.locationId;
  }

  return nearestCandidate?.locationId ?? null;
}

export function nearestCityFocusOwner(
  focusPosition: readonly [number, number, number],
  candidates: readonly CityProximityCandidate[],
) {
  let nearest: CityProximityCandidate | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = Math.hypot(
      focusPosition[0] - candidate.center[0],
      focusPosition[1] - candidate.center[1],
      focusPosition[2] - candidate.center[2],
    );
    if (
      distance > candidate.nearDistance ||
      (nearest &&
        (distance > nearestDistance ||
          (distance === nearestDistance &&
            candidate.locationId > nearest.locationId)))
    ) {
      continue;
    }
    nearest = candidate;
    nearestDistance = distance;
  }
  return nearest?.locationId ?? null;
}

export function localCityPresenceId(
  detailLevel: DetailLevel,
  proximityLocationId: string | null,
) {
  return detailLevel === "city" || detailLevel === "street"
    ? proximityLocationId
    : null;
}

/**
 * Authored city geometry owns a local visual tier independently from the
 * wider geographic chrome. A Region camera that has entered a city's lens
 * should reveal City geometry, while Street remains an explicit closer tier.
 */
export function localCityRenderDetail(
  detailLevel: DetailLevel,
): Extract<DetailLevel, "city" | "street"> {
  return detailLevel === "street" ? "street" : "city";
}

export function resolvedCityProximityOwner(
  cameraOwnerId: string | null,
  inspectionOwnerId: string | null,
) {
  return inspectionOwnerId ?? cameraOwnerId;
}

export function cityInspectionOwnerAtFocus(
  inspectionOwnerId: string | null,
  inspectionFocus: readonly [number, number, number] | null,
  viewedFocus: readonly [number, number, number],
  releaseDistance = 0.45,
) {
  if (!inspectionOwnerId || !inspectionFocus) return inspectionOwnerId;
  return Math.hypot(
    viewedFocus[0] - inspectionFocus[0],
    viewedFocus[1] - inspectionFocus[1],
    viewedFocus[2] - inspectionFocus[2],
  ) <= releaseDistance
    ? inspectionOwnerId
    : null;
}

export function selectedCityShouldForceNear(
  locationId: string,
  selectedLocalLocationId: string | undefined,
  proximityOwnerId: string | null,
) {
  return (
    locationId === selectedLocalLocationId &&
    locationId === proximityOwnerId
  );
}

export function cityClusterLodPolicy(
  locationId: string,
  activeOwnerId: string | null,
  selectedLocalLocationId: string | undefined,
): CityLodRenderPolicy {
  const forceNear = selectedCityShouldForceNear(
    locationId,
    selectedLocalLocationId,
    activeOwnerId,
  );
  const explicitForceIsActive =
    activeOwnerId !== null &&
    activeOwnerId === selectedLocalLocationId;
  return {
    allowNear: locationId === activeOwnerId,
    forceNear,
    // A camera-driven owner change keeps the outgoing authored scene long
    // enough to finish its alpha fade. Once an explicit list/search target is
    // actually in view, it replaces the outgoing scene immediately.
    retainOutgoingNear: !explicitForceIsActive,
  };
}

export function updateCityNearLifecycle(
  state: CityLodState,
  cameraDistance: number,
  deltaSeconds: number,
  config: CityLodConfig,
  policy: CityLodRenderPolicy,
) {
  updateCityLodState(
    state,
    effectiveCityLodDistance(
      cameraDistance,
      policy.forceNear,
      policy.allowNear,
      // Proximity ownership already confirms that both camera and viewed
      // point are inside this city's two-part lens. Enter the authored tier
      // from that signal even when a majestic exterior camera is wider than
      // the raw center-distance cutoff.
      policy.allowNear
        ? config.nearDistance - config.hysteresis - 0.001
        : undefined,
      // Non-owners still need their real far→mid silhouette transition.
      // Clamp only beyond the near exit boundary instead of sending the
      // entire LOD state to Infinity, which used to jump directly far→near.
      policy.allowNear
        ? undefined
        : config.nearDistance + config.hysteresis + 0.001,
    ),
    deltaSeconds,
    config,
  );
  return cityNearDetailShouldMount(
    state,
    policy.forceNear,
    policy.allowNear,
    policy.retainOutgoingNear,
  );
}

export function nearWorldSpaceOffset(
  center: readonly [number, number, number],
  enabled: boolean,
) {
  return enabled
    ? ([-center[0], -center[1], -center[2]] as const)
    : undefined;
}

export type CitySilhouetteStyle =
  | "tower"
  | "terraced-port"
  | "terraced-fortress"
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
  if (locationId === "vedenar") return "terraced-fortress";
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
  } else if (style === "terraced-fortress") {
    if (index === 0) {
      // Broad central Valhav Oathgate precinct.
      return {
        x: -profile.radius * 0.04,
        z: 0,
        width: profile.radius * 0.48,
        depth: profile.radius * 0.4,
        height: profile.radius * 0.34,
        rotation: 0,
      };
    }
    if (index === 1) {
      // The broken upper palace remains Vedenar's far-distance landmark.
      return {
        x: profile.radius * 0.18,
        z: -profile.radius * 0.54,
        width: profile.radius * 0.42,
        depth: profile.radius * 0.3,
        height: profile.radius * 0.62,
        rotation: -0.08,
      };
    }
    const terrace = (index - 2) % 5;
    const slot = Math.floor((index - 2) / 5);
    const side = slot % 2 === 0 ? -1 : 1;
    x =
      side * profile.radius * (0.2 + Math.floor(slot / 2) * 0.14) +
      ((index * 17) % 5) * 0.045;
    z = profile.radius * (0.5 - terrace * 0.245);
    width *= 1.52;
    depth *= 1.08;
    height =
      profile.radius *
      (0.15 + terrace * 0.042 + (index % 3) * 0.018);
    rotation = side * 0.035;
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
  const positionScale = tier === "far" ? 0.16 : 0.46;
  const horizontalScale = tier === "far" ? 0.34 : 0.4;
  const verticalScale = tier === "far" ? 0.2 : 0.34;
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
