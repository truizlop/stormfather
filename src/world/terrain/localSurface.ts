import { terrainHeightAt } from "./terrainHeight";
import { destinationAnchors } from "../cartography/geography";
import {
  KHARBRANTH_LANDMARK_SCALE,
  kharbranthRoadElevation,
} from "../cities/landmarkMetrics";

export const PURELAKE_WATER_HEIGHT = 0.11;

/**
 * Close-detail systems share this sampler so buildings, residents, props, and
 * authored landmarks remain registered with the canonical heightfield.
 */
export function localSurfaceY(
  locationId: string,
  x: number,
  z: number,
) {
  if (locationId === "purelake") return PURELAKE_WATER_HEIGHT;
  if (locationId === "kharbranth") {
    const [centerX, centerZ] = destinationAnchors.kharbranth;
    const localThreeZ = (z - centerZ) / KHARBRANTH_LANDMARK_SCALE;
    const tier = Math.max(
      0,
      Math.min(5, Math.round((2.82 - localThreeZ) / 1.02)),
    );
    return (
      terrainHeightAt(centerX, centerZ) +
      kharbranthRoadElevation(tier)
    );
  }
  return terrainHeightAt(x, z) + 0.025;
}

export function landmarkSurfaceY(
  locationId: string,
  x: number,
  z: number,
) {
  if (locationId === "purelake") return 0.085;
  if (locationId === "urithiru") {
    // The model contains its own excavated mountain mass. Sink that mass into
    // the shared heightfield so the lower retaining works emerge from rock
    // rather than standing on a freestanding plinth.
    return terrainHeightAt(x, z) - 0.62;
  }
  return terrainHeightAt(x, z);
}
