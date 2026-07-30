import * as THREE from "three";
import { detailFromDistance } from "./coordinates";
import {
  KHARBRANTH_LANDMARK_SCALE,
  kharbranthRoadOffset,
} from "./cities/landmarkMetrics";
import { cityProfile } from "./cities/profiles";
import {
  landmarkSurfaceY,
  localSurfaceY,
} from "./terrain/localSurface";
import { terrainHeightAt } from "./terrain/terrainHeight";
import type { DetailLevel, WorldLocation } from "./types";

export type CameraPoint = readonly [number, number, number];

export interface SafeZoomRequest {
  location: WorldLocation;
  position: CameraPoint;
  target: CameraPoint;
  factor: number;
  requestedLevel?: DetailLevel;
}

export interface SafeCameraPose {
  position: CameraPoint;
  target: CameraPoint;
}

export interface CameraExclusionVolume {
  id: string;
  min: CameraPoint;
  max: CameraPoint;
  source: "authored-cliff" | "authored-facade" | "runtime-occupancy";
}

export interface CameraFrustumAudit {
  earliestVolumeHit: {
    volumeId: string;
    fraction: number;
  } | null;
  earliestTerrainHitFraction: number | null;
  minimumTerrainClearance: number;
}

export const CAMERA_NEAR_PLANE = 0.1;
export const CAMERA_SURFACE_CLEARANCE = 0.52;
export const LOCAL_CAMERA_MIN_PITCH = 0.46;
export const CAMERA_BODY_RADIUS = 0.24;
export const KHARBRANTH_STREET_CAMERA_CLEARANCE = 0.18;
export const KHARBRANTH_STREET_TARGET_CLEARANCE = 0.11;

const detailDistance: Record<DetailLevel, number> = {
  continent: 92,
  region: 42,
  city: 18,
  street: 8.4,
};

export function cameraDistanceForDetail(level: DetailLevel) {
  return detailDistance[level];
}

export function modeledCameraClearanceRadius(
  location: WorldLocation,
  level: DetailLevel,
) {
  if (level !== "city" && level !== "street") return 0;
  const profile = cityProfile(location.id, location.culture);
  return profile.radius * (level === "street" ? 1.35 : 1.25);
}

function localBoxToWorld(
  location: WorldLocation,
  id: string,
  min: CameraPoint,
  max: CameraPoint,
  source: CameraExclusionVolume["source"],
): CameraExclusionVolume {
  const baseY = landmarkSurfaceY(
    location.id,
    location.coordinates.x,
    location.coordinates.z,
  );
  return {
    id,
    min: [
      location.coordinates.x + min[0] * KHARBRANTH_LANDMARK_SCALE,
      baseY + min[1] * KHARBRANTH_LANDMARK_SCALE,
      location.coordinates.z + min[2] * KHARBRANTH_LANDMARK_SCALE,
    ],
    max: [
      location.coordinates.x + max[0] * KHARBRANTH_LANDMARK_SCALE,
      baseY + max[1] * KHARBRANTH_LANDMARK_SCALE,
      location.coordinates.z + max[2] * KHARBRANTH_LANDMARK_SCALE,
    ],
    source,
  };
}

/**
 * Conservative boxes measured from the exported Kharbranth GLB, augmented by
 * the runtime-only awning, pedestrian, and cargo occupancy zones. They are
 * intentionally broader than individual triangles so camera regressions are
 * caught without loading the 53 MB asset in the unit-test process.
 */
export function kharbranthCameraExclusionVolumes(
  location: WorldLocation,
): readonly CameraExclusionVolume[] {
  return [
    localBoxToWorld(
      location,
      "west-stormcut-cliff",
      [-6.8, -0.7, -6.2],
      [-4.2, 8.1, 5.62],
      "authored-cliff",
    ),
    localBoxToWorld(
      location,
      "east-stormcut-cliff",
      [4.2, -0.7, -6.1],
      [6.8, 7.2, 5.6],
      "authored-cliff",
    ),
    localBoxToWorld(
      location,
      "lower-ward-facade-atlas",
      [-4.62, 0.6, 2.65],
      [4.62, 3.31, 3.82],
      "authored-facade",
    ),
    localBoxToWorld(
      location,
      "west-retaining-and-upper-ward",
      [-4.7, 0.6, -6],
      [-3.35, 6.2, 2.78],
      "authored-facade",
    ),
    localBoxToWorld(
      location,
      "east-retaining-and-upper-ward",
      [3.35, 0.6, -6],
      [4.7, 6.2, 2.78],
      "authored-facade",
    ),
    localBoxToWorld(
      location,
      "lower-road-resident-band",
      [-4.9, 1.01, 2.42],
      [4.9, 1.68, 3.2],
      "runtime-occupancy",
    ),
    localBoxToWorld(
      location,
      "west-awning-and-cargo-band",
      [-5.2, 0.4, -2.5],
      [-3.45, 3.5, 3.35],
      "runtime-occupancy",
    ),
    localBoxToWorld(
      location,
      "east-awning-band",
      [3.45, 0.65, -2.5],
      [5.2, 3.5, 3.35],
      "runtime-occupancy",
    ),
  ];
}

function segmentBoxEntryFraction(
  start: CameraPoint,
  end: CameraPoint,
  volume: CameraExclusionVolume,
  padding: number,
) {
  let minimum = 0;
  let maximum = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    const delta = end[axis] - start[axis];
    const lower = volume.min[axis] - padding;
    const upper = volume.max[axis] + padding;
    if (Math.abs(delta) < 1e-9) {
      if (start[axis] < lower || start[axis] > upper) return null;
      continue;
    }
    const first = (lower - start[axis]) / delta;
    const second = (upper - start[axis]) / delta;
    minimum = Math.max(minimum, Math.min(first, second));
    maximum = Math.min(maximum, Math.max(first, second));
    if (minimum > maximum) return null;
  }
  return maximum >= 0 && minimum <= 1
    ? Math.max(0, minimum)
    : null;
}

function frustumEndpoints(
  pose: SafeCameraPose,
  verticalFovDegrees: number,
  aspect: number,
  ndcSpread: number,
) {
  const position = new THREE.Vector3(...pose.position);
  const target = new THREE.Vector3(...pose.target);
  const forward = target.clone().sub(position).normalize();
  const right = new THREE.Vector3()
    .crossVectors(forward, new THREE.Vector3(0, 1, 0))
    .normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();
  const distance = position.distanceTo(target);
  const halfHeight =
    Math.tan(THREE.MathUtils.degToRad(verticalFovDegrees / 2)) *
    distance;
  const halfWidth = halfHeight * aspect;
  const endpoints: CameraPoint[] = [];
  for (const vertical of [-ndcSpread, 0, ndcSpread]) {
    for (const horizontal of [-ndcSpread, 0, ndcSpread]) {
      const point = target
        .clone()
        .addScaledVector(right, horizontal * halfWidth)
        .addScaledVector(up, vertical * halfHeight);
      endpoints.push([point.x, point.y, point.z]);
    }
  }
  return endpoints;
}

export function auditKharbranthCameraFrustum(
  pose: SafeCameraPose,
  location: WorldLocation,
  {
    includeRuntimeOccupancy = true,
    verticalFovDegrees = 42,
    aspect = 1.44,
    ndcSpread = 0.3,
    terrainSamples = 192,
  }: {
    includeRuntimeOccupancy?: boolean;
    verticalFovDegrees?: number;
    aspect?: number;
    ndcSpread?: number;
    terrainSamples?: number;
  } = {},
): CameraFrustumAudit {
  const volumes = kharbranthCameraExclusionVolumes(location).filter(
    (volume) =>
      includeRuntimeOccupancy || volume.source !== "runtime-occupancy",
  );
  let earliestVolumeHit: CameraFrustumAudit["earliestVolumeHit"] = null;
  let earliestTerrainHitFraction: number | null = null;
  let minimumTerrainClearance = Number.POSITIVE_INFINITY;
  for (const endpoint of frustumEndpoints(
    pose,
    verticalFovDegrees,
    aspect,
    ndcSpread,
  )) {
    for (const volume of volumes) {
      const fraction = segmentBoxEntryFraction(
        pose.position,
        endpoint,
        volume,
        CAMERA_BODY_RADIUS,
      );
      if (
        fraction !== null &&
        (!earliestVolumeHit ||
          fraction < earliestVolumeHit.fraction)
      ) {
        earliestVolumeHit = { volumeId: volume.id, fraction };
      }
    }
    for (let sample = 0; sample <= terrainSamples; sample += 1) {
      const fraction = sample / terrainSamples;
      const x =
        pose.position[0] +
        (endpoint[0] - pose.position[0]) * fraction;
      const y =
        pose.position[1] +
        (endpoint[1] - pose.position[1]) * fraction;
      const z =
        pose.position[2] +
        (endpoint[2] - pose.position[2]) * fraction;
      const terrainClearance =
        y - terrainHeightAt(x, z, "kharbranth");
      minimumTerrainClearance = Math.min(
        minimumTerrainClearance,
        terrainClearance,
      );
      if (
        terrainClearance < CAMERA_BODY_RADIUS &&
        (earliestTerrainHitFraction === null ||
          fraction < earliestTerrainHitFraction)
      ) {
        earliestTerrainHitFraction = fraction;
      }
    }
  }
  return {
    earliestVolumeHit,
    earliestTerrainHitFraction,
    minimumTerrainClearance,
  };
}

function safeKharbranthStreetPose(
  location: WorldLocation,
): SafeCameraPose {
  // The authored close-detail residents, promenade, lights and cyclorama all
  // occupy this harbor-side lower run. Enter along its sightline so "Street"
  // shows people at human scale instead of roofs or an interior facade.
  const lowerRoadZ =
    location.coordinates.z + kharbranthRoadOffset(0);
  const positionX = location.coordinates.x - 0.26;
  const positionZ = lowerRoadZ + 1.94;
  const targetX = location.coordinates.x;
  const targetZ = lowerRoadZ + 1.1;
  const targetY =
    localSurfaceY(location.id, targetX, targetZ) +
    KHARBRANTH_STREET_TARGET_CLEARANCE;
  const positionY =
    localSurfaceY(location.id, positionX, positionZ) +
    KHARBRANTH_STREET_CAMERA_CLEARANCE;

  return {
    position: [positionX, positionY, positionZ],
    target: [targetX, targetY, targetZ],
  };
}

export function usesKharbranthStreetInspectionPose({
  location,
  position,
  target,
  factor,
  requestedLevel,
}: SafeZoomRequest) {
  const currentDistance = Math.hypot(
    position[0] - target[0],
    position[1] - target[1],
    position[2] - target[2],
  );
  const desiredDistance = requestedLevel
    ? cameraDistanceForDetail(requestedLevel)
    : Math.min(165, Math.max(0.72, currentDistance * factor));
  const intendedLevel =
    requestedLevel ?? detailFromDistance(desiredDistance);
  return (
    location.id === "kharbranth" &&
    (requestedLevel === "street" ||
      (requestedLevel === undefined &&
        factor < 1 &&
        detailFromDistance(currentDistance) !== "street" &&
        intendedLevel === "street"))
  );
}

/**
 * Produces an exterior, terrain-cleared camera pose for zoom controls. It is
 * deliberately stateless: both the top-level detail buttons and incremental
 * zoom controls pass through the same geometry envelope.
 */
export function collisionSafeZoomPose({
  location,
  position,
  target,
  factor,
  requestedLevel,
}: SafeZoomRequest): SafeCameraPose {
  const offset = [
    position[0] - target[0],
    position[1] - target[1],
    position[2] - target[2],
  ] as const;
  const currentDistance = Math.hypot(...offset);
  const desiredDistance = requestedLevel
    ? cameraDistanceForDetail(requestedLevel)
    : Math.min(165, Math.max(0.72, currentDistance * factor));
  const intendedLevel =
    requestedLevel ?? detailFromDistance(desiredDistance);
  if (
    usesKharbranthStreetInspectionPose({
      location,
      position,
      target,
      factor,
      requestedLevel,
    })
  ) {
    return safeKharbranthStreetPose(location);
  }

  const fallbackOffset = [
    location.camera.position[0] - location.camera.target[0],
    location.camera.position[1] - location.camera.target[1],
    location.camera.position[2] - location.camera.target[2],
  ] as const;
  const sourceOffset =
    currentDistance > 0.0001 ? offset : fallbackOffset;
  const sourceLength = Math.max(0.0001, Math.hypot(...sourceOffset));
  const safeTargetY = Math.max(
    target[1],
    localSurfaceY(location.id, target[0], target[2]) + 0.14,
  );
  let x = target[0] + (sourceOffset[0] / sourceLength) * desiredDistance;
  let z = target[2] + (sourceOffset[2] / sourceLength) * desiredDistance;
  let y =
    safeTargetY +
    (sourceOffset[1] / sourceLength) * desiredDistance;

  const clearanceRadius = modeledCameraClearanceRadius(
    location,
    intendedLevel,
  );
  if (clearanceRadius > 0) {
    let radialX = x - location.coordinates.x;
    let radialZ = z - location.coordinates.z;
    let radialLength = Math.hypot(radialX, radialZ);
    if (radialLength < 0.0001) {
      radialX =
        location.camera.position[0] - location.coordinates.x;
      radialZ =
        location.camera.position[2] - location.coordinates.z;
      radialLength = Math.max(0.0001, Math.hypot(radialX, radialZ));
    }
    if (radialLength < clearanceRadius) {
      x =
        location.coordinates.x +
        (radialX / radialLength) * clearanceRadius;
      z =
        location.coordinates.z +
        (radialZ / radialLength) * clearanceRadius;
    }
  }

  const horizontalLookDistance = Math.hypot(
    x - target[0],
    z - target[2],
  );
  if (intendedLevel === "city" || intendedLevel === "street") {
    y = Math.max(
      y,
      safeTargetY +
        Math.tan(LOCAL_CAMERA_MIN_PITCH) * horizontalLookDistance,
    );
  }
  y = Math.max(
    y,
    localSurfaceY(location.id, x, z) + CAMERA_SURFACE_CLEARANCE,
  );

  return {
    position: [x, y, z],
    target: [target[0], safeTargetY, target[2]],
  };
}
