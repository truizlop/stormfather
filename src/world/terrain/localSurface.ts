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
    const localZ = (z - centerZ) / KHARBRANTH_LANDMARK_SCALE;
    const tier = Math.max(
      0,
      Math.min(5, Math.round((localZ + 2.52) / 1.02)),
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
  return terrainHeightAt(x, z);
}
