import {
  settlementSupportY,
  settlementWalkableY,
} from "./locationSurface";

/**
 * Close-detail systems share this sampler so buildings, residents, props, and
 * authored landmarks remain registered with the canonical heightfield.
 */
export function localSurfaceY(
  locationId: string,
  x: number,
  z: number,
) {
  return settlementWalkableY(locationId, x, z);
}

export function landmarkSurfaceY(
  locationId: string,
  x: number,
  z: number,
) {
  return settlementSupportY(locationId, x, z);
}
