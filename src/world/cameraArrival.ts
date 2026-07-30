import type { DetailLevel, WorldLocation } from "./types";
import { isCompactViewport } from "./compactViewport";
import {
  cityProximityCandidate,
  nearestCityProximityOwner,
  type CityProximityCandidate,
} from "./cities/progressiveLod";
import {
  landmarkLocalScale,
  landmarkPlanDimensions,
  landmarkRotationY,
} from "./cities/landmarkMetrics";
import { cityProfile } from "./cities/profiles";
import { semanticSettlementProfile } from "./gazetteer/semanticSettlements";
import { landmarkSurfaceY, localSurfaceY } from "./terrain/localSurface";

export type CameraPoint = readonly [number, number, number];

export interface ModeledArrivalPose {
  position: CameraPoint;
  target: CameraPoint;
}

export interface ModeledArrivalBounds {
  center: CameraPoint;
  halfSize: CameraPoint;
}

export interface QueuedZoomRequest {
  factor: number;
  level?: DetailLevel;
}

const ARRIVAL_SURFACE_CLEARANCE = 0.52;
const ARRIVAL_FRAME_EDGE = 0.94;
const MINIMUM_LOCAL_PITCH = 0.5;

/**
 * Conservative source-space bounds for the visible authored roots. They omit
 * presentation-only terrain shelves, matching the landmark plan metrics.
 */
const authoredLandmarkBounds: Record<
  string,
  {
    minY: number;
    maxY: number;
    sourceHalfX?: number;
    sourceHalfZ?: number;
  }
> = {
  Landmark_Akinah: { minY: -0.9, maxY: 2.8 },
  Landmark_Azimir: { minY: -0.6, maxY: 2.6 },
  // The facade and stormcut cliffs reach ±8.25 in the authored source.
  Landmark_Kharbranth: { minY: -0.8, maxY: 8.5, sourceHalfX: 8.25 },
  Landmark_Kholinar: { minY: -0.7, maxY: 2.9 },
  Landmark_Purelake: { minY: 0, maxY: 1.7 },
  Landmark_Shattered_Plains: { minY: -0.4, maxY: 2.7 },
  Landmark_Shinovar: { minY: -0.6, maxY: 3.7 },
  Landmark_ThaylenCity: { minY: -0.1, maxY: 3.1 },
  Landmark_Urithiru: { minY: -0.7, maxY: 11.6 },
  Landmark_Vedenar: {
    minY: -0.9,
    maxY: 3.2,
    // Burned docks project Tarat-ward beyond the civic cliff-cap plan.
    sourceHalfZ: 6.2,
  },
};

function pointDistance(a: CameraPoint, b: CameraPoint) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function normalizedArrivalDirection(location: WorldLocation) {
  const [cameraX, cameraY, cameraZ] = location.camera.position;
  const [targetX, targetY, targetZ] = location.camera.target;
  const horizontalX = cameraX - targetX;
  const horizontalZ = cameraZ - targetZ;
  const horizontalLength = Math.hypot(horizontalX, horizontalZ) || 1;
  const originalPitch = Math.atan2(cameraY - targetY, horizontalLength);
  const pitch = Math.max(MINIMUM_LOCAL_PITCH, Math.min(0.78, originalPitch));
  const horizontalScale = Math.cos(pitch);
  return [
    (horizontalX / horizontalLength) * horizontalScale,
    Math.sin(pitch),
    (horizontalZ / horizontalLength) * horizontalScale,
  ] as const;
}

export function modeledArrivalBounds(
  location: WorldLocation,
): ModeledArrivalBounds | null {
  if (!location.modelRoot) return null;
  const sourceBounds = authoredLandmarkBounds[location.modelRoot];
  if (!sourceBounds) return null;
  const profile = cityProfile(location.id, location.culture);
  const scale = landmarkLocalScale(location.modelRoot, profile);
  const plan = landmarkPlanDimensions(location.modelRoot);
  if (!plan) return null;
  const baseY = landmarkSurfaceY(
    location.id,
    location.coordinates.x,
    location.coordinates.z,
  );
  const rotated = landmarkRotationY(location.id) === Math.PI / 2;
  const planHalfX = (rotated ? plan[1] : plan[0]) * scale * 0.5;
  const planHalfZ = (rotated ? plan[0] : plan[1]) * scale * 0.5;
  const sourceHalfX = sourceBounds.sourceHalfX ?? 0;
  const sourceHalfZ = sourceBounds.sourceHalfZ ?? 0;
  const halfX = Math.max(
    planHalfX,
    (rotated ? sourceHalfZ : sourceHalfX) * scale,
  );
  const halfZ = Math.max(
    planHalfZ,
    (rotated ? sourceHalfX : sourceHalfZ) * scale,
  );
  const centerY =
    baseY + ((sourceBounds.minY + sourceBounds.maxY) / 2) * scale;

  return {
    center: [location.coordinates.x, centerY, location.coordinates.z],
    halfSize: [
      halfX,
      ((sourceBounds.maxY - sourceBounds.minY) / 2) * scale,
      halfZ,
    ],
  };
}

function poseAtArrivalDistance(
  location: WorldLocation,
  bounds: ModeledArrivalBounds,
  distance: number,
): ModeledArrivalPose {
  const direction = normalizedArrivalDirection(location);
  const x = bounds.center[0] + direction[0] * distance;
  const z = bounds.center[2] + direction[2] * distance;
  const plannedY = bounds.center[1] + direction[1] * distance;
  const y = Math.max(
    plannedY,
    localSurfaceY(location.id, x, z) + ARRIVAL_SURFACE_CLEARANCE,
  );
  return { position: [x, y, z], target: bounds.center };
}

/** Returns the furthest normalized projection occupied by a bounding box. */
export function modeledArrivalProjectedExtent(
  pose: ModeledArrivalPose,
  bounds: ModeledArrivalBounds,
  viewportWidth: number,
  viewportHeight: number,
  verticalFovDegrees: number,
) {
  const forwardX = pose.target[0] - pose.position[0];
  const forwardY = pose.target[1] - pose.position[1];
  const forwardZ = pose.target[2] - pose.position[2];
  const distance = Math.hypot(forwardX, forwardY, forwardZ);
  if (distance < 0.0001 || viewportWidth <= 0 || viewportHeight <= 0) {
    return {
      horizontal: Number.POSITIVE_INFINITY,
      vertical: Number.POSITIVE_INFINITY,
    };
  }
  const forward = [
    forwardX / distance,
    forwardY / distance,
    forwardZ / distance,
  ] as const;
  const rightLength = Math.hypot(forward[2], forward[0]) || 1;
  const right = [
    forward[2] / rightLength,
    0,
    -forward[0] / rightLength,
  ] as const;
  const up = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ] as const;
  const tangent = Math.tan((verticalFovDegrees * Math.PI) / 360);
  const aspect = viewportWidth / viewportHeight;
  let horizontal = 0;
  let vertical = 0;
  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      for (const zSign of [-1, 1]) {
        const x = bounds.center[0] + bounds.halfSize[0] * xSign - pose.position[0];
        const y = bounds.center[1] + bounds.halfSize[1] * ySign - pose.position[1];
        const z = bounds.center[2] + bounds.halfSize[2] * zSign - pose.position[2];
        const depth = x * forward[0] + y * forward[1] + z * forward[2];
        if (depth <= 0) {
          return {
            horizontal: Number.POSITIVE_INFINITY,
            vertical: Number.POSITIVE_INFINITY,
          };
        }
        horizontal = Math.max(
          horizontal,
          Math.abs(x * right[0] + y * right[1] + z * right[2]) /
            (depth * tangent * aspect),
        );
        vertical = Math.max(
          vertical,
          Math.abs(x * up[0] + y * up[1] + z * up[2]) / (depth * tangent),
        );
      }
    }
  }
  return { horizontal, vertical };
}

function poseFitsModeledArrival(
  pose: ModeledArrivalPose,
  bounds: ModeledArrivalBounds,
  viewportWidth: number,
  viewportHeight: number,
  verticalFovDegrees: number,
) {
  const extent = modeledArrivalProjectedExtent(
    pose,
    bounds,
    viewportWidth,
    viewportHeight,
    verticalFovDegrees,
  );
  return (
    extent.horizontal <= ARRIVAL_FRAME_EDGE &&
    extent.vertical <= ARRIVAL_FRAME_EDGE
  );
}

/**
 * Fits a portrait or landscape viewport to an exterior, terrain-cleared
 * authored-city arrival. The returned camera always remains inside that
 * city's proximity lens, or is null when the requested viewport cannot fit.
 */
export function fittedModeledArrivalPose(
  location: WorldLocation,
  viewportWidth: number,
  viewportHeight: number,
  verticalFovDegrees: number,
): ModeledArrivalPose | null {
  const bounds = modeledArrivalBounds(location);
  if (!bounds) return null;
  const candidate = cityProximityCandidate(location.id);
  const steps = 160;
  for (let step = 1; step <= steps; step += 1) {
    const distance = (candidate.lensDistance * step) / steps;
    const pose = poseAtArrivalDistance(location, bounds, distance);
    if (
      pointDistance(pose.position, candidate.center) <=
        candidate.lensDistance &&
      poseFitsModeledArrival(
        pose,
        bounds,
        viewportWidth,
        viewportHeight,
        verticalFovDegrees,
      )
    ) {
      return pose;
    }
  }
  return null;
}

/**
 * An arrival may retain city detail only when its fitted lens naturally owns
 * the same focused proximity candidate; selection alone never grants this.
 */
export function fittedModeledArrivalDetailOwner(
  location: WorldLocation,
  pose: ModeledArrivalPose,
  candidates: readonly CityProximityCandidate[],
) {
  const owner = nearestCityProximityOwner(pose.position, candidates, {
    focusPosition: pose.target,
  });
  return owner === location.id ? owner : null;
}

/** Adds a zoom request without allowing a travel transition to be interrupted. */
export function enqueueZoomRequest(
  pending: readonly QueuedZoomRequest[],
  request: QueuedZoomRequest,
) {
  return [...pending, request];
}

/**
 * Releases queued zoom requests only after the arrival pose is installed.
 * Returning the original order lets callers apply explicit detail levels
 * exactly as the user requested them.
 */
export function drainQueuedZoomRequests(
  transitionProgress: number,
  pending: readonly QueuedZoomRequest[],
) {
  if (transitionProgress < 1) {
    return { ready: [] as QueuedZoomRequest[], pending: [...pending] };
  }
  return { ready: [...pending], pending: [] as QueuedZoomRequest[] };
}

export type GazetteerArrivalPlace = {
  id: string;
  minimumLod: DetailLevel;
};

export function gazetteerArrivalOffset(
  place: GazetteerArrivalPlace,
  mobile: boolean,
): readonly [number, number, number] {
  const semanticCity = Boolean(semanticSettlementProfile(place.id));
  if (place.id === "hearthstone" && mobile) {
    return [4.6, 8.3, 6.6];
  }
  if (place.minimumLod === "street") {
    return mobile ? [6, 8, 7] : [4, 6, 5];
  }
  if (place.minimumLod === "region" && !semanticCity) {
    return mobile ? [24, 34, 30] : [18, 28, 22];
  }
  return mobile ? [9, 16, 12] : [7, 12, 9];
}

export function atlasCameraFov(
  viewportWidth: number,
  viewportHeight: number,
  worldOverview: boolean,
) {
  if (!isCompactViewport(viewportWidth, viewportHeight)) return 42;
  return worldOverview ? 72 : 54;
}

export function isMobileWorldOverview(
  viewportWidth: number,
  viewportHeight: number,
  selectedId: string,
  selectedGazetteerId: string | null,
  detailLevel: DetailLevel,
  proximityLocationId: string | null,
) {
  return (
    isCompactViewport(viewportWidth, viewportHeight) &&
    selectedId === "roshar" &&
    selectedGazetteerId === null &&
    proximityLocationId === null &&
    detailLevel !== "city" &&
    detailLevel !== "street"
  );
}
