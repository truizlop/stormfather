import { destinationAnchors } from "../cartography/geography";
import type { DetailedLocationId } from "./locationSurface";

export type TerrainCradleKind =
  | "civic"
  | "plateaus"
  | "mountain"
  | "valley"
  | "lakebed"
  | "island"
  | "cliff"
  | "ravines"
  | "harbor";

export interface LocationTerrainCradle {
  id: DetailedLocationId;
  center: readonly [number, number];
  kind: TerrainCradleKind;
  coreRadiusX: number;
  coreRadiusZ: number;
  influenceRadiusX: number;
  influenceRadiusZ: number;
}

const cradleInputs: readonly Omit<LocationTerrainCradle, "center">[] = [
  {
    id: "azir",
    kind: "civic",
    coreRadiusX: 4.72,
    coreRadiusZ: 4.72,
    influenceRadiusX: 6.35,
    influenceRadiusZ: 6.35,
  },
  {
    id: "shattered-plains",
    kind: "plateaus",
    coreRadiusX: 5.55,
    coreRadiusZ: 3.85,
    influenceRadiusX: 7.15,
    influenceRadiusZ: 5.25,
  },
  {
    id: "urithiru",
    kind: "mountain",
    coreRadiusX: 4.65,
    coreRadiusZ: 4.35,
    influenceRadiusX: 8.4,
    influenceRadiusZ: 7.65,
  },
  {
    id: "shinovar",
    kind: "valley",
    coreRadiusX: 4.85,
    coreRadiusZ: 3.85,
    // The valley opens westward. Keep the fade tight enough on the east to
    // preserve the canonical Misted Mountain crest sampled near x=-36.
    influenceRadiusX: 5.8,
    influenceRadiusZ: 6.25,
  },
  {
    id: "purelake",
    kind: "lakebed",
    coreRadiusX: 4.85,
    coreRadiusZ: 3.45,
    influenceRadiusX: 6.65,
    influenceRadiusZ: 4.95,
  },
  {
    id: "aimia",
    kind: "island",
    coreRadiusX: 4.65,
    coreRadiusZ: 4.65,
    influenceRadiusX: 6.7,
    influenceRadiusZ: 6.7,
  },
  {
    id: "kharbranth",
    kind: "cliff",
    coreRadiusX: 6.45,
    coreRadiusZ: 4.5,
    influenceRadiusX: 8.2,
    influenceRadiusZ: 6.4,
  },
  {
    id: "kholinar",
    kind: "ravines",
    coreRadiusX: 4.85,
    coreRadiusZ: 4.25,
    influenceRadiusX: 6.65,
    influenceRadiusZ: 6.05,
  },
  {
    id: "thaylen-city",
    kind: "harbor",
    coreRadiusX: 4.75,
    coreRadiusZ: 4.1,
    influenceRadiusX: 6.65,
    influenceRadiusZ: 5.75,
  },
] as const;

export const LOCATION_TERRAIN_CRADLES: readonly LocationTerrainCradle[] =
  cradleInputs.map((cradle) => ({
    ...cradle,
    center: destinationAnchors[cradle.id],
  }));

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number) {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function ellipseDistance(
  x: number,
  z: number,
  radiusX: number,
  radiusZ: number,
) {
  return Math.hypot(x / radiusX, z / radiusZ);
}

export function locationTerrainInfluenceAt(
  cradle: LocationTerrainCradle,
  x: number,
  z: number,
) {
  const localX = x - cradle.center[0];
  const localZ = z - cradle.center[1];
  const outerDistance = ellipseDistance(
    localX,
    localZ,
    cradle.influenceRadiusX,
    cradle.influenceRadiusZ,
  );
  if (outerDistance >= 1) return 0;
  const coreDistance = ellipseDistance(
    localX,
    localZ,
    cradle.coreRadiusX,
    cradle.coreRadiusZ,
  );
  const baseInfluence =
    coreDistance <= 1
      ? 1
      : 1 -
        smoothstep(
          (outerDistance -
            Math.min(
              cradle.coreRadiusX / cradle.influenceRadiusX,
              cradle.coreRadiusZ / cradle.influenceRadiusZ,
            )) /
            (1 -
              Math.min(
                cradle.coreRadiusX / cradle.influenceRadiusX,
                cradle.coreRadiusZ / cradle.influenceRadiusZ,
              )),
        );
  if (cradle.kind === "valley") {
    // Shinovar's inhabited valley is open to the west but meets the Misted
    // Mountains on its east. Do not flatten that canonical ridge merely
    // because the selected-detail agricultural footprint reaches its toe.
    const eastMountainFade =
      1 - smoothstep((localX - 1.15) / (3.15 - 1.15));
    return baseInfluence * eastMountainFade;
  }
  return baseInfluence;
}

function localCradleTarget(
  cradle: LocationTerrainCradle,
  x: number,
  z: number,
  anchorNaturalHeight: number,
) {
  const localX = x - cradle.center[0];
  const localZ = z - cradle.center[1];
  const normalizedRadius = ellipseDistance(
    localX,
    localZ,
    cradle.coreRadiusX,
    cradle.coreRadiusZ,
  );
  const strata =
    Math.sin(localX * 1.73 + localZ * 0.41) * 0.025 +
    Math.sin(localX * 0.37 - localZ * 1.39) * 0.018;

  switch (cradle.kind) {
    case "civic": {
      const terrace = Math.floor(clamp01(normalizedRadius) * 4) * 0.018;
      return anchorNaturalHeight - 0.1 + terrace + strata * 0.35;
    }
    case "plateaus": {
      const cymatic =
        Math.abs(
          Math.sin(Math.atan2(localZ, localX) * 7 + normalizedRadius * 4.2),
        ) *
        0.055;
      return anchorNaturalHeight - 0.28 - cymatic + strata * 0.6;
    }
    case "mountain": {
      const distance = Math.hypot(localX, localZ);
      const eastApproach =
        Math.max(0, localX / Math.max(0.1, distance)) *
        Math.max(0, 1 - distance / 5.2);
      const shoulder =
        Math.exp(
          -(
            Math.pow((localX + 1.15) / 5.2, 2) +
            Math.pow((localZ - 0.35) / 4.7, 2)
          ),
        ) * 0.24;
      return (
        3.93 -
        Math.max(0, distance - 2.3) * 0.027 +
        eastApproach * 0.26 +
        shoulder +
        strata * 1.7
      );
    }
    case "valley": {
      const drainage =
        Math.exp(-Math.pow((localZ + localX * 0.12) / 0.72, 2)) * 0.055;
      return anchorNaturalHeight - 0.18 - drainage + strata * 0.65;
    }
    case "lakebed": {
      const sandbar =
        Math.sin(localX * 0.82 + localZ * 0.34) * 0.012 +
        Math.sin(localZ * 1.18) * 0.008;
      return 0.035 + sandbar;
    }
    case "island": {
      const crown = Math.max(0, 1 - normalizedRadius) * 0.18;
      const coastalShelf = Math.max(-0.03, anchorNaturalHeight - 0.1);
      return coastalShelf + crown + strata * 1.2;
    }
    case "cliff": {
      const inlandRise = Math.max(0, -localZ) * 0.22;
      const harborCut =
        Math.exp(
          -(
            Math.pow((localX - 1.1) / 3.2, 2) +
            Math.pow((localZ - 3.45) / 1.75, 2)
          ),
        ) * 0.46;
      return (
        anchorNaturalHeight -
        0.3 +
        inlandRise -
        harborCut +
        strata * 1.15
      );
    }
    case "ravines": {
      const leftCut =
        Math.exp(-Math.pow((localX + localZ * 0.34 + 1.15) / 0.36, 2)) *
        0.18;
      const rightCut =
        Math.exp(-Math.pow((localX - localZ * 0.27 - 1.05) / 0.4, 2)) *
        0.16;
      return (
        anchorNaturalHeight -
        0.07 -
        leftCut -
        rightCut +
        strata * 0.55
      );
    }
    case "harbor": {
      const inlandRise = Math.max(0, -localZ - 0.35) * 0.055;
      const basin =
        Math.exp(
          -(
            Math.pow((localX - 0.55) / 3.7, 2) +
            Math.pow((localZ - 2.75) / 1.8, 2)
          ),
        ) * 0.22;
      return (
        anchorNaturalHeight -
        0.08 +
        inlandRise -
        basin +
        strata * 0.75
      );
    }
  }
}

export function applyLocationTerrainCradles(
  x: number,
  z: number,
  naturalHeight: number,
  naturalHeightAt: (x: number, z: number) => number,
) {
  let result = naturalHeight;
  for (const cradle of LOCATION_TERRAIN_CRADLES) {
    const influence = locationTerrainInfluenceAt(cradle, x, z);
    if (influence <= 0) continue;
    const anchorNaturalHeight = naturalHeightAt(
      cradle.center[0],
      cradle.center[1],
    );
    const target = localCradleTarget(
      cradle,
      x,
      z,
      anchorNaturalHeight,
    );
    if (cradle.kind === "mountain") {
      result = Math.max(
        result,
        result + Math.max(0, target - result) * influence,
      );
    } else {
      result += (target - result) * influence;
    }
  }
  return result;
}
