import type { DetailLevel } from "../types";
import { localSurfaceY } from "../terrain/localSurface";
import { kharbranthRoadOffset } from "./landmarkMetrics";
import type { CityProfile } from "./profiles";

export interface BuildingSeed {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  color: string;
  roofColor: string;
  lit: boolean;
  foundationDrop: number;
}

export interface ModuleSeed {
  name: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
  foundationWidth: number;
  foundationDepth: number;
  foundationDrop: number;
}

export interface ModuleMetric {
  width: number;
  depth: number;
  height: number;
  scale: number;
  walkable?: boolean;
}

export interface DistrictLayout {
  buildings: readonly BuildingSeed[];
  modules: readonly ModuleSeed[];
}

export interface FootprintContact {
  y: number;
  foundationDrop: number;
}

/**
 * Raw Blender plan dimensions and the calibrated runtime scale. Blender roots
 * are intentionally richer than the low-poly procedural kit, so each module is
 * scaled by its architectural purpose rather than one arbitrary global value.
 */
export const moduleMetrics: Record<string, ModuleMetric> = {
  Module_Storm_Awning: {
    width: 1.9,
    depth: 1.242,
    height: 1.556,
    scale: 0.14,
  },
  Module_Stone_Arch: {
    width: 1.44,
    depth: 0.56,
    height: 1.54,
    scale: 0.18,
    walkable: true,
  },
  Module_Market_Stall: {
    width: 1.84,
    depth: 1.16,
    height: 1.805,
    scale: 0.13,
  },
  Module_Dock_Crane: {
    width: 1.535,
    depth: 0.9,
    height: 2.7,
    scale: 0.23,
  },
  Module_Rope_Bridge: {
    width: 3.86,
    depth: 0.93,
    height: 0.905,
    scale: 0.32,
    walkable: true,
  },
  Module_Terraced_House: {
    width: 2.32,
    depth: 2.089,
    height: 2.04,
    scale: 0.24,
  },
  Module_Windbreak_House: {
    width: 2.853,
    depth: 2.041,
    height: 2.169,
    scale: 0.22,
  },
  Module_Azish_Arcade: {
    width: 3.3,
    depth: 1.893,
    height: 2.68,
    scale: 0.23,
  },
  Module_Shin_Farmstead: {
    width: 4.118,
    depth: 3.217,
    height: 2.89,
    scale: 0.22,
  },
  Module_Purelake_Jetty: {
    width: 4.304,
    depth: 1.497,
    height: 1.9,
    scale: 0.29,
  },
  Module_Warcamp_Scaffold: {
    width: 3.3,
    depth: 2.16,
    height: 2.125,
    scale: 0.26,
  },
  Module_Aimian_Ruin: {
    width: 3.1,
    depth: 3.1,
    height: 2.65,
    scale: 0.28,
  },
  Module_Urithiru_Gallery: {
    width: 3.1,
    depth: 2.42,
    height: 1.76,
    scale: 0.32,
  },
  Module_Thaylen_Warehouse: {
    width: 4.716,
    depth: 4.716,
    height: 2.15,
    scale: 0.24,
  },
};

const authoredLandmarkLocations = new Set([
  "azir",
  "shattered-plains",
  "urithiru",
  "shinovar",
  "purelake",
  "aimia",
  "kharbranth",
  "kholinar",
  "thaylen-city",
]);

export function usesProceduralArchitecture(locationId: string) {
  return !authoredLandmarkLocations.has(locationId);
}

/**
 * Samples the whole rotated footprint instead of placing architecture from a
 * single center point. The model sits on the highest sampled contact and a
 * masonry/earth footing fills the full drop to the lowest corner, preventing
 * the familiar "floating box on a hillside" silhouette.
 */
export function footprintContactAt(
  locationId: string,
  x: number,
  z: number,
  width: number,
  depth: number,
  rotation: number,
): FootprintContact {
  const centerY = localSurfaceY(locationId, x, z);
  if (locationId === "purelake") {
    return { y: centerY, foundationDrop: 0.035 };
  }
  if (locationId === "kharbranth") {
    // Kharbranth uses authored stepped roads. Sampling across a switchback can
    // reach the neighboring terrace even when the module is correctly seated.
    return { y: centerY, foundationDrop: 0.055 };
  }

  const halfWidth = width * 0.52;
  const halfDepth = depth * 0.52;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const offsets = [
    [0, 0],
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [-halfWidth, halfDepth],
    [halfWidth, halfDepth],
    [-halfWidth, 0],
    [halfWidth, 0],
    [0, -halfDepth],
    [0, halfDepth],
  ] as const;
  const samples = offsets.map(([localX, localZ]) =>
    localSurfaceY(
      locationId,
      x + localX * cos + localZ * sin,
      z - localX * sin + localZ * cos,
    ),
  );
  const highest = Math.max(...samples);
  const lowest = Math.min(...samples);
  return {
    y: highest - 0.008,
    foundationDrop: Math.max(0.045, highest - lowest + 0.075),
  };
}

export function districtCounts(
  profile: CityProfile,
  locationId: string,
  detailLevel: DetailLevel,
  viewportWidth: number,
) {
  const mobileFactor = viewportWidth < 720 ? 0.62 : 1;
  const architectureBase = detailLevel === "street" ? 64 : 46;
  const authored = !usesProceduralArchitecture(locationId);
  const moduleBase = authored
    ? detailLevel === "street"
      ? 12
      : 8
    : detailLevel === "street"
      ? 16
      : 10;
  return {
    buildingCount: usesProceduralArchitecture(locationId)
      ? Math.round(architectureBase * profile.density * mobileFactor)
      : 0,
    moduleCount: Math.max(3, Math.round(moduleBase * mobileFactor)),
  };
}

export function createBuildingSeeds(
  profile: CityProfile,
  locationId: string,
  center: readonly [number, number],
  count: number,
) {
  const [minHeight, maxHeight] = profile.height;
  const [minFootprint, maxFootprint] = profile.footprint;
  return Array.from({ length: count }, (_, index): BuildingSeed => {
    const angle = index * 2.399963 + (locationId.length % 9) * 0.17;
    const normalized = ((index * 41 + locationId.length * 13) % 101) / 100;
    const radius = 0.72 + Math.sqrt(normalized) * (profile.radius - 0.72);
    const width =
      minFootprint +
      (((index * 17 + 3) % 23) / 22) * (maxFootprint - minFootprint);
    const depth =
      minFootprint +
      (((index * 11 + 7) % 19) / 18) * (maxFootprint - minFootprint);
    const height =
      minHeight +
      (((index * 29 + 5) % 31) / 30) * (maxHeight - minHeight);
    const x = center[0] + Math.cos(angle) * radius;
    const z = center[1] + Math.sin(angle) * radius * 0.72;

    const contact = footprintContactAt(
      locationId,
      x,
      z,
      width,
      depth,
      angle + ((index % 5) - 2) * 0.06,
    );

    return {
      x,
      y: contact.y,
      z,
      width,
      depth,
      height,
      rotation: angle + ((index % 5) - 2) * 0.06,
      color: profile.palette[index % profile.palette.length],
      roofColor:
        profile.roofPalette[(index * 3 + 1) % profile.roofPalette.length],
      lit: index % 4 === 0 || index % 9 === 0,
      foundationDrop: contact.foundationDrop,
    };
  });
}

function footprintRadius(seed: {
  width: number;
  depth: number;
  scale?: number;
}) {
  return (
    Math.hypot(seed.width, seed.depth) *
    (seed.scale ?? 1) *
    0.5
  );
}

function distanceToSegment(
  x: number,
  z: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSquared),
        );
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

function moduleCandidate(
  locationId: string,
  center: readonly [number, number],
  profile: CityProfile,
  index: number,
  attempt: number,
) {
  const angle = index * 2.399963 + attempt * 0.73 + 0.6;

  if (locationId === "shattered-plains") {
    const plateaus = [
      { x: -3.15, z: -1.8, rx: 1.35, rz: 0.82 },
      { x: 0.45, z: -0.15, rx: 1.08, rz: 0.72 },
      { x: 3.15, z: 1.35, rx: 0.74, rz: 0.56 },
    ] as const;
    const plateau = plateaus[(index + attempt) % plateaus.length];
    const radius = 0.32 + ((index * 17 + attempt * 11) % 41) / 100;
    return {
      x: center[0] + plateau.x + Math.cos(angle) * plateau.rx * radius,
      z: center[1] + plateau.z + Math.sin(angle) * plateau.rz * radius,
    };
  }

  if (locationId === "kharbranth") {
    const tier = index % 6;
    const side = index % 2 === 0 ? -1 : 1;
    return {
      x:
        center[0] +
        side * (profile.radius * 0.75 - tier * 0.16 + attempt * 0.05),
      z: center[1] + kharbranthRoadOffset(tier) + attempt * 0.035,
    };
  }

  if (locationId === "purelake") {
    const radius = profile.radius * (0.58 + ((index * 13 + attempt) % 23) / 100);
    return {
      x: center[0] + Math.cos(angle) * radius,
      z: center[1] + Math.sin(angle) * radius * 0.62,
    };
  }

  const authored = authoredLandmarkLocations.has(locationId);
  const radius =
    profile.radius *
    (authored
      ? 0.76 + ((index * 13 + attempt * 7) % 17) / 100
      : 0.44 + ((index * 19 + attempt * 11) % 41) / 100);
  return {
    x: center[0] + Math.cos(angle) * radius,
    z: center[1] + Math.sin(angle) * radius * 0.7,
  };
}

function overlapsExisting(
  x: number,
  z: number,
  radius: number,
  buildings: readonly BuildingSeed[],
  modules: readonly ModuleSeed[],
) {
  const buildingOverlap = buildings.some(
    (building) =>
      Math.hypot(x - building.x, z - building.z) <
      radius + footprintRadius(building) + 0.08,
  );
  if (buildingOverlap) return true;
  return modules.some((module) => {
    const metric = moduleMetrics[module.name];
    if (!metric) return false;
    return (
      Math.hypot(x - module.x, z - module.z) <
      radius +
        footprintRadius({ ...metric, scale: module.scale }) +
        0.08
    );
  });
}

export function createModuleSeeds(
  profile: CityProfile,
  locationId: string,
  center: readonly [number, number],
  count: number,
  buildings: readonly BuildingSeed[],
) {
  const modules: ModuleSeed[] = [];
  for (let index = 0; index < count; index += 1) {
    const name = profile.modules[index % profile.modules.length];
    const metric = moduleMetrics[name];
    if (!metric) continue;
    const radius = footprintRadius({ ...metric, scale: metric.scale });
    for (let attempt = 0; attempt < 36; attempt += 1) {
      const candidate = moduleCandidate(
        locationId,
        center,
        profile,
        index,
        attempt,
      );
      const insideDistrict =
        Math.hypot(candidate.x - center[0], candidate.z - center[1]) <
        profile.radius * 0.98;
      const blocksBridgeRun =
        locationId === "shattered-plains" &&
        distanceToSegment(
          candidate.x,
          candidate.z,
          center[0] - 1.05,
          center[1] - 2.35,
          center[0] + 2.65,
          center[1] - 0.35,
        ) <
          radius + 0.46;
      if (
        !insideDistrict ||
        blocksBridgeRun ||
        overlapsExisting(
          candidate.x,
          candidate.z,
          radius,
          buildings,
          modules,
        )
      ) {
        continue;
      }
      const foundationWidth = metric.width * metric.scale * 1.04;
      const foundationDepth = metric.depth * metric.scale * 1.04;
      const contact = footprintContactAt(
        locationId,
        candidate.x,
        candidate.z,
        foundationWidth,
        foundationDepth,
        -(
          index * 2.399963 +
          attempt * 0.73 +
          0.6
        ) + Math.PI / 2,
      );
      modules.push({
        name,
        x: candidate.x,
        y: contact.y,
        z: candidate.z,
        rotation: -(
          index * 2.399963 +
          attempt * 0.73 +
          0.6
        ) + Math.PI / 2,
        scale: metric.scale,
        foundationWidth,
        foundationDepth,
        foundationDrop: contact.foundationDrop,
      });
      break;
    }
  }
  return modules;
}

export function createDistrictLayout(
  profile: CityProfile,
  locationId: string,
  center: readonly [number, number],
  detailLevel: DetailLevel,
  viewportWidth: number,
): DistrictLayout {
  const { buildingCount, moduleCount } = districtCounts(
    profile,
    locationId,
    detailLevel,
    viewportWidth,
  );
  const buildings = createBuildingSeeds(
    profile,
    locationId,
    center,
    buildingCount,
  );
  return {
    buildings,
    modules: createModuleSeeds(
      profile,
      locationId,
      center,
      moduleCount,
      buildings,
    ),
  };
}
