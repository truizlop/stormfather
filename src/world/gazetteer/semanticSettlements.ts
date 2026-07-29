import type { DetailLevel } from "../types";
import type { GazetteerPlace } from "./types";

export const semanticSettlementIds = [
  "hearthstone",
  "vedenar",
  "sesemalex-dar",
  "new-natanan",
  "yeddaw",
  "rall-elorim",
  "kurth",
  "panatham",
] as const;

export type SemanticSettlementId = (typeof semanticSettlementIds)[number];
export type SemanticRoofStyle = "flat" | "dome" | "pitched" | "carapace";
export type SemanticLayoutStyle =
  | "stormward-lanes"
  | "ravine-rings"
  | "sunken-rings"
  | "harbor-crescent"
  | "covered-grid"
  | "shadow-terraces"
  | "lagoon-spokes"
  | "caravan-rings";
export type SemanticSignature =
  | "lait-manor"
  | "highprince-citadel"
  | "tukari-sanctum"
  | "breakwater-gate"
  | "grand-market-canopy"
  | "shadow-spires"
  | "riran-sea-gate"
  | "caravanserai";
export type SemanticActivity =
  | "farmstead"
  | "guard-patrol"
  | "procession"
  | "dockwork"
  | "market-crowd"
  | "promenade"
  | "ferry-traffic"
  | "caravan-trade";

export interface SemanticSettlementProfile {
  id: SemanticSettlementId;
  seed: number;
  layout: SemanticLayoutStyle;
  signature: SemanticSignature;
  activity: SemanticActivity;
  roof: SemanticRoofStyle;
  radius: number;
  buildingCount: {
    city: number;
    street: number;
  };
  height: readonly [number, number];
  footprint: readonly [number, number];
  palette: readonly [string, string, string, ...string[]];
  roofPalette: readonly [string, string, ...string[]];
  activityPalette: readonly [string, string, ...string[]];
  pavingColor: string;
  foundationColor: string;
  accentColor: string;
}

export const semanticSettlementProfiles = {
  hearthstone: {
    id: "hearthstone",
    seed: 11,
    layout: "stormward-lanes",
    signature: "lait-manor",
    activity: "farmstead",
    roof: "pitched",
    radius: 2.45,
    buildingCount: { city: 24, street: 38 },
    height: [0.27, 0.61],
    footprint: [0.24, 0.46],
    palette: ["#7f735e", "#98846a", "#665d50", "#a08e73"],
    roofPalette: ["#344553", "#62483d", "#7b6248"],
    activityPalette: ["#31577a", "#8a7044", "#6f3c34"],
    pavingColor: "#746c5c",
    foundationColor: "#46453f",
    accentColor: "#b18b4f",
  },
  vedenar: {
    id: "vedenar",
    seed: 23,
    layout: "ravine-rings",
    signature: "highprince-citadel",
    activity: "guard-patrol",
    roof: "pitched",
    radius: 3.35,
    buildingCount: { city: 44, street: 64 },
    height: [0.34, 0.88],
    footprint: [0.22, 0.46],
    palette: ["#98745f", "#756250", "#b1a184", "#71484a"],
    roofPalette: ["#6c323d", "#31575c", "#8d6442"],
    activityPalette: ["#7b2737", "#343f5c", "#a88a5b"],
    pavingColor: "#75695d",
    foundationColor: "#4c4541",
    accentColor: "#b78d68",
  },
  "sesemalex-dar": {
    id: "sesemalex-dar",
    seed: 37,
    layout: "sunken-rings",
    signature: "tukari-sanctum",
    activity: "procession",
    roof: "dome",
    radius: 3.05,
    buildingCount: { city: 38, street: 56 },
    height: [0.3, 0.76],
    footprint: [0.24, 0.5],
    palette: ["#b49a73", "#8a7059", "#c3b28e", "#76564d"],
    roofPalette: ["#49656a", "#9a6945", "#b3925a"],
    activityPalette: ["#a97739", "#ded0a2", "#653d32"],
    pavingColor: "#9c896e",
    foundationColor: "#5f5549",
    accentColor: "#d0ae67",
  },
  "new-natanan": {
    id: "new-natanan",
    seed: 41,
    layout: "harbor-crescent",
    signature: "breakwater-gate",
    activity: "dockwork",
    roof: "carapace",
    radius: 3.15,
    buildingCount: { city: 38, street: 56 },
    height: [0.28, 0.72],
    footprint: [0.23, 0.48],
    palette: ["#687276", "#8b806a", "#5b655f", "#8b6752"],
    roofPalette: ["#285267", "#6d4239", "#9c7b4f"],
    activityPalette: ["#2d6880", "#9b6a3e", "#d5ba7e"],
    pavingColor: "#657071",
    foundationColor: "#3f4b4e",
    accentColor: "#78b8c7",
  },
  yeddaw: {
    id: "yeddaw",
    seed: 53,
    layout: "covered-grid",
    signature: "grand-market-canopy",
    activity: "market-crowd",
    roof: "flat",
    radius: 3.2,
    buildingCount: { city: 42, street: 62 },
    height: [0.28, 0.68],
    footprint: [0.21, 0.44],
    palette: ["#bd9a69", "#a7784e", "#cfbd91", "#815b54"],
    roofPalette: ["#466b70", "#9b5145", "#c19047"],
    activityPalette: ["#315f69", "#a6473b", "#d4ad5c"],
    pavingColor: "#aa9270",
    foundationColor: "#655345",
    accentColor: "#d5aa55",
  },
  "rall-elorim": {
    id: "rall-elorim",
    seed: 67,
    layout: "shadow-terraces",
    signature: "shadow-spires",
    activity: "promenade",
    roof: "dome",
    radius: 3.2,
    buildingCount: { city: 40, street: 58 },
    height: [0.34, 0.96],
    footprint: [0.21, 0.42],
    palette: ["#c6ad79", "#907951", "#d4c38f", "#746361"],
    roofPalette: ["#344f69", "#7f5a77", "#b49345"],
    activityPalette: ["#725889", "#d2b35c", "#345f79"],
    pavingColor: "#8f8066",
    foundationColor: "#504d4a",
    accentColor: "#d9b85f",
  },
  kurth: {
    id: "kurth",
    seed: 71,
    layout: "lagoon-spokes",
    signature: "riran-sea-gate",
    activity: "ferry-traffic",
    roof: "dome",
    radius: 2.85,
    buildingCount: { city: 34, street: 52 },
    height: [0.3, 0.74],
    footprint: [0.22, 0.45],
    palette: ["#8d8b78", "#aa9571", "#6f7d7d", "#8b6e61"],
    roofPalette: ["#365d70", "#745776", "#b08953"],
    activityPalette: ["#305f75", "#75517a", "#c4a15b"],
    pavingColor: "#778080",
    foundationColor: "#465256",
    accentColor: "#75b9ca",
  },
  panatham: {
    id: "panatham",
    seed: 83,
    layout: "caravan-rings",
    signature: "caravanserai",
    activity: "caravan-trade",
    roof: "flat",
    radius: 3.05,
    buildingCount: { city: 40, street: 60 },
    height: [0.28, 0.7],
    footprint: [0.23, 0.48],
    palette: ["#b08a5d", "#927051", "#c3a878", "#765149"],
    roofPalette: ["#5c4b65", "#936044", "#b78d4f"],
    activityPalette: ["#6b456f", "#9f673d", "#d0ad62"],
    pavingColor: "#9a7c5d",
    foundationColor: "#5e493d",
    accentColor: "#cf9d4e",
  },
} as const satisfies Record<SemanticSettlementId, SemanticSettlementProfile>;

const semanticSettlementIdSet = new Set<string>(semanticSettlementIds);

export function semanticSettlementProfile(
  id: string,
): SemanticSettlementProfile | undefined {
  if (!semanticSettlementIdSet.has(id)) return undefined;
  return semanticSettlementProfiles[id as SemanticSettlementId];
}

export function isSemanticSettlementDetailEligible(
  place:
    | Pick<GazetteerPlace, "id" | "renderable" | "world">
    | null
    | undefined,
  detailLevel: DetailLevel,
) {
  return Boolean(
    place &&
      place.renderable &&
      place.world &&
      semanticSettlementIdSet.has(place.id) &&
      (detailLevel === "city" || detailLevel === "street"),
  );
}

export type SettlementHeightSampler = (x: number, z: number) => number;

export interface SemanticBuildingSeed {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  foundationDrop: number;
  color: string;
  roofColor: string;
  lit: boolean;
}

export interface SemanticPavingSeed {
  x: number;
  y: number;
  z: number;
  width: number;
  length: number;
  rotation: number;
}

export interface SemanticActivitySeed {
  start: readonly [number, number, number];
  end: readonly [number, number, number];
  phase: number;
  speed: number;
  color: string;
}

export type SemanticSignatureShape =
  | "box"
  | "cylinder"
  | "cone"
  | "dome"
  | "ring";
export type SemanticSignatureMaterial =
  | "primary"
  | "secondary"
  | "roof"
  | "accent"
  | "wood"
  | "water";

export interface SemanticSignaturePart {
  shape: SemanticSignatureShape;
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  material: SemanticSignatureMaterial;
}

export interface SemanticSettlementLayout {
  buildings: readonly SemanticBuildingSeed[];
  paving: readonly SemanticPavingSeed[];
  activity: readonly SemanticActivitySeed[];
  signature: readonly SemanticSignaturePart[];
}

function hash01(index: number, seed: number, multiplier: number) {
  return ((index * multiplier + seed * 17) % 101) / 100;
}

function localBuildingPosition(
  profile: SemanticSettlementProfile,
  index: number,
  count: number,
) {
  const normalized = index / Math.max(1, count - 1);
  switch (profile.layout) {
    case "stormward-lanes": {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const rows = Math.ceil(count / 6);
      return {
        x: (column - 2.5) * 0.42,
        z: (row - (rows - 1) / 2) * 0.5 + (column % 2) * 0.07,
        rotation: column % 2 === 0 ? 0.05 : -0.08,
      };
    }
    case "ravine-rings": {
      const angle = index * 2.399963 + 0.2;
      const radius =
        profile.radius * (0.3 + 0.56 * Math.sqrt(hash01(index, profile.seed, 31)));
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius * 0.72,
        rotation: -angle + Math.PI / 2,
      };
    }
    case "sunken-rings": {
      const ring = index % 3;
      const angle = index * 2.149963 + ring * 0.31;
      const radius = profile.radius * (0.38 + ring * 0.19);
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius * 0.78,
        rotation: -angle,
      };
    }
    case "harbor-crescent": {
      const row = index % 3;
      const angle = -1.34 + normalized * 2.68;
      const radius = profile.radius * (0.58 + row * 0.1);
      return {
        x: Math.sin(angle) * radius,
        z: Math.cos(angle) * radius * 0.7 - profile.radius * 0.12,
        rotation: -angle,
      };
    }
    case "covered-grid": {
      const column = index % 8;
      const row = Math.floor(index / 8);
      const rows = Math.ceil(count / 8);
      const x = (column - 3.5) * 0.48;
      const z = (row - (rows - 1) / 2) * 0.5;
      return {
        x: x + (Math.abs(x) < 0.3 ? Math.sign(x || 1) * 0.28 : 0),
        z: z + (Math.abs(z) < 0.25 ? Math.sign(z || 1) * 0.26 : 0),
        rotation: (row + column) % 2 === 0 ? 0 : Math.PI / 2,
      };
    }
    case "shadow-terraces": {
      const row = index % 5;
      const column = Math.floor(index / 5);
      const columns = Math.ceil(count / 5);
      return {
        x: (column - (columns - 1) / 2) * 0.4,
        z: (row - 2) * 0.55,
        rotation: row % 2 === 0 ? 0 : 0.12,
      };
    }
    case "lagoon-spokes": {
      const ring = index % 2;
      const angle = index * 2.399963 + ring * 0.4;
      const radius = profile.radius * (0.45 + ring * 0.27);
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius * 0.72,
        rotation: -angle + Math.PI / 2,
      };
    }
    case "caravan-rings": {
      const angle = index * 2.399963;
      const radius =
        profile.radius * (0.35 + 0.46 * Math.sqrt(hash01(index, profile.seed, 43)));
      const axisClearance = 0.3;
      const rawX = Math.cos(angle) * radius;
      const rawZ = Math.sin(angle) * radius * 0.76;
      return {
        x:
          Math.abs(rawX) < axisClearance
            ? Math.sign(rawX || 1) * axisClearance
            : rawX,
        z:
          Math.abs(rawZ) < axisClearance
            ? Math.sign(rawZ || 1) * axisClearance
            : rawZ,
        rotation: -angle,
      };
  }
}
}

function footprintContact(
  center: readonly [number, number],
  localX: number,
  localZ: number,
  width: number,
  depth: number,
  rotation: number,
  heightAt: SettlementHeightSampler,
) {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const halfWidth = width * 0.54;
  const halfDepth = depth * 0.54;
  const offsets = [
    [0, 0],
    [-halfWidth, -halfDepth],
    [halfWidth, -halfDepth],
    [-halfWidth, halfDepth],
    [halfWidth, halfDepth],
  ] as const;
  const heights = offsets.map(([x, z]) =>
    heightAt(
      center[0] + localX + x * cosine + z * sine,
      center[1] + localZ - x * sine + z * cosine,
    ),
  );
  const highest = Math.max(...heights);
  const lowest = Math.min(...heights);
  return {
    y: highest - 0.006,
    foundationDrop: Math.max(0.055, highest - lowest + 0.075),
  };
}

function createBuildings(
  profile: SemanticSettlementProfile,
  center: readonly [number, number],
  detailLevel: "city" | "street",
  compactViewport: boolean,
  heightAt: SettlementHeightSampler,
) {
  const compactFactor = compactViewport ? 0.68 : 1;
  const count = Math.max(
    18,
    Math.round(profile.buildingCount[detailLevel] * compactFactor),
  );
  return Array.from({ length: count }, (_, index): SemanticBuildingSeed => {
    const candidate = localBuildingPosition(profile, index, count);
    const centerDistance = Math.hypot(candidate.x, candidate.z);
    const signatureClearance = 0.98;
    const clearanceScale =
      centerDistance > 0 && centerDistance < signatureClearance
        ? signatureClearance / centerDistance
        : 1;
    const position = {
      x: candidate.x * clearanceScale,
      z: candidate.z * clearanceScale,
      rotation: candidate.rotation,
    };
    const widthMix = hash01(index, profile.seed, 29);
    const depthMix = hash01(index, profile.seed + 3, 37);
    const heightMix = hash01(index, profile.seed + 7, 47);
    const width =
      profile.footprint[0] +
      (profile.footprint[1] - profile.footprint[0]) * widthMix;
    const depth =
      profile.footprint[0] +
      (profile.footprint[1] - profile.footprint[0]) * depthMix;
    let height =
      profile.height[0] +
      (profile.height[1] - profile.height[0]) * heightMix;
    if (profile.layout === "shadow-terraces" && index % 7 === 0) {
      height *= 1.55;
    }
    if (profile.layout === "stormward-lanes") height *= 0.82;
    const contact = footprintContact(
      center,
      position.x,
      position.z,
      width,
      depth,
      position.rotation,
      heightAt,
    );
    return {
      ...position,
      y: contact.y,
      width,
      depth,
      height,
      foundationDrop: contact.foundationDrop,
      color: profile.palette[index % profile.palette.length],
      roofColor:
        profile.roofPalette[(index * 3 + 1) % profile.roofPalette.length],
      lit: index % 4 === 0 || index % 11 === 0,
    };
  });
}

function pavingPoint(
  profile: SemanticSettlementProfile,
  index: number,
  count: number,
) {
  const t = index / Math.max(1, count - 1);
  switch (profile.layout) {
    case "stormward-lanes": {
      const lane = index % 3;
      const laneT = Math.floor(index / 3) / Math.max(1, Math.ceil(count / 3) - 1);
      return {
        x: lane === 2 ? (laneT - 0.5) * profile.radius * 1.65 : (lane - 0.5) * 0.58,
        z: lane === 2 ? 0 : (laneT - 0.5) * profile.radius * 1.65,
        rotation: lane === 2 ? Math.PI / 2 : 0,
      };
    }
    case "ravine-rings":
    case "sunken-rings":
    case "caravan-rings": {
      const ring = index % 2;
      const angle = t * Math.PI * 4 + ring * 0.18;
      const radius = profile.radius * (0.35 + ring * 0.35);
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius * 0.75,
        rotation: -angle,
      };
    }
    case "harbor-crescent": {
      const angle = -1.4 + t * 2.8;
      return {
        x: Math.sin(angle) * profile.radius * 0.7,
        z: Math.cos(angle) * profile.radius * 0.5 - profile.radius * 0.2,
        rotation: -angle,
      };
    }
    case "covered-grid": {
      const avenue = index % 4;
      const avenueT = Math.floor(index / 4) / Math.max(1, Math.ceil(count / 4) - 1);
      const horizontal = avenue >= 2;
      return {
        x: horizontal
          ? (avenueT - 0.5) * profile.radius * 1.65
          : (avenue - 0.5) * 0.64,
        z: horizontal
          ? (avenue - 2.5) * 0.64
          : (avenueT - 0.5) * profile.radius * 1.6,
        rotation: horizontal ? Math.PI / 2 : 0,
      };
    }
    case "shadow-terraces": {
      const terrace = index % 5;
      const terraceT =
        Math.floor(index / 5) / Math.max(1, Math.ceil(count / 5) - 1);
      return {
        x: (terraceT - 0.5) * profile.radius * 1.65,
        z: (terrace - 2) * 0.55,
        rotation: Math.PI / 2,
      };
    }
    case "lagoon-spokes": {
      const spoke = index % 6;
      const spokeT = Math.floor(index / 6) / Math.max(1, Math.ceil(count / 6) - 1);
      const angle = (spoke * Math.PI * 2) / 6;
      return {
        x: Math.cos(angle) * spokeT * profile.radius * 0.76,
        z: Math.sin(angle) * spokeT * profile.radius * 0.62,
        rotation: Math.PI / 2 - angle,
      };
    }
  }
}

function createPaving(
  profile: SemanticSettlementProfile,
  center: readonly [number, number],
  detailLevel: "city" | "street",
  compactViewport: boolean,
  heightAt: SettlementHeightSampler,
) {
  const baseCount = detailLevel === "street" ? 72 : 46;
  const count = Math.round(baseCount * (compactViewport ? 0.7 : 1));
  return Array.from({ length: count }, (_, index): SemanticPavingSeed => {
    const point = pavingPoint(profile, index, count);
    return {
      ...point,
      y: heightAt(center[0] + point.x, center[1] + point.z) + 0.009,
      width: profile.activity === "procession" ? 0.18 : 0.13,
      length: detailLevel === "street" ? 0.28 : 0.34,
    };
  });
}

function createActivity(
  profile: SemanticSettlementProfile,
  center: readonly [number, number],
  detailLevel: "city" | "street",
  compactViewport: boolean,
  paving: readonly SemanticPavingSeed[],
  heightAt: SettlementHeightSampler,
) {
  const baseCount = detailLevel === "street" ? 16 : 9;
  const count = Math.round(baseCount * (compactViewport ? 0.68 : 1));
  return Array.from({ length: count }, (_, index): SemanticActivitySeed => {
    const start = paving[(index * 5) % paving.length];
    const end = paving[(index * 5 + 3) % paving.length];
    const startY = heightAt(center[0] + start.x, center[1] + start.z);
    const endY = heightAt(center[0] + end.x, center[1] + end.z);
    return {
      start: [start.x, startY, start.z],
      end: [end.x, endY, end.z],
      phase: hash01(index, profile.seed, 23) * 2,
      speed:
        profile.activity === "procession"
          ? 0.1
          : profile.activity === "market-crowd"
            ? 0.18
            : 0.14,
      color:
        profile.activityPalette[index % profile.activityPalette.length],
    };
  });
}

function part(
  shape: SemanticSignatureShape,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  material: SemanticSignatureMaterial,
  rotation?: readonly [number, number, number],
): SemanticSignaturePart {
  return { shape, position, scale, rotation, material };
}

function createSignature(
  profile: SemanticSettlementProfile,
  center: readonly [number, number],
  heightAt: SettlementHeightSampler,
): readonly SemanticSignaturePart[] {
  const contact = footprintContact(center, 0, 0, 1.2, 1, 0, heightAt);
  const y = contact.y;
  const seated = (parts: readonly SemanticSignaturePart[]) => [
    part(
      "cylinder",
      [0, y - contact.foundationDrop / 2 + 0.008, 0],
      [1.35, contact.foundationDrop, 1.08],
      "secondary",
    ),
    ...parts,
  ];
  switch (profile.signature) {
    case "lait-manor":
      return seated([
        part("box", [0, y + 0.11, -0.56], [1.45, 0.22, 0.16], "secondary"),
        part("box", [0, y + 0.23, 0], [0.76, 0.46, 0.58], "primary"),
        part("cone", [0, y + 0.54, 0], [0.58, 0.22, 0.48], "roof", [0, Math.PI / 4, 0]),
        part("cylinder", [-0.52, y + 0.2, 0.24], [0.16, 0.4, 0.16], "secondary"),
        part("cone", [-0.52, y + 0.43, 0.24], [0.2, 0.14, 0.2], "roof"),
      ]);
    case "highprince-citadel":
      return seated([
        part("box", [0, y + 0.28, 0], [0.86, 0.56, 0.7], "primary"),
        part("cone", [0, y + 0.67, 0], [0.58, 0.25, 0.48], "roof", [0, Math.PI / 4, 0]),
        ...([-0.5, 0.5] as const).flatMap((x) =>
          ([-0.38, 0.38] as const).flatMap((z) => [
            part("cylinder", [x, y + 0.31, z], [0.17, 0.62, 0.17], "secondary"),
            part("cone", [x, y + 0.68, z], [0.21, 0.16, 0.21], "roof"),
          ]),
        ),
      ]);
    case "tukari-sanctum":
      return seated([
        part("ring", [0, y + 0.025, 0], [0.9, 0.9, 0.9], "accent", [-Math.PI / 2, 0, 0]),
        part("cylinder", [0, y + 0.22, 0], [0.62, 0.44, 0.62], "primary"),
        part("dome", [0, y + 0.46, 0], [0.54, 0.25, 0.54], "roof"),
        ...([-0.68, 0.68] as const).map((x) =>
          part("cylinder", [x, y + 0.28, 0], [0.12, 0.56, 0.12], "secondary"),
        ),
      ]);
    case "breakwater-gate":
      return seated([
        part("box", [-0.48, y + 0.07, 0.32], [0.8, 0.14, 0.18], "wood", [0, -0.25, 0]),
        part("box", [0.48, y + 0.07, 0.32], [0.8, 0.14, 0.18], "wood", [0, 0.25, 0]),
        part("cylinder", [-0.34, y + 0.3, 0], [0.2, 0.6, 0.2], "primary"),
        part("cylinder", [0.34, y + 0.3, 0], [0.2, 0.6, 0.2], "primary"),
        part("box", [0, y + 0.53, 0], [0.75, 0.16, 0.2], "secondary"),
        part("cone", [0, y + 0.7, 0], [0.34, 0.24, 0.08], "accent", [0, 0, -Math.PI / 2]),
      ]);
    case "grand-market-canopy":
      return seated([
        part("box", [0, y + 0.08, 0], [1.25, 0.16, 0.92], "secondary"),
        part("cone", [0, y + 0.38, 0], [0.9, 0.45, 0.7], "roof", [0, Math.PI / 4, 0]),
        part("cylinder", [0, y + 0.42, 0], [0.13, 0.84, 0.13], "accent"),
        ...([-0.48, 0.48] as const).flatMap((x) =>
          ([-0.32, 0.32] as const).map((z) =>
            part("cylinder", [x, y + 0.23, z], [0.06, 0.46, 0.06], "primary"),
          ),
        ),
      ]);
    case "shadow-spires":
      return seated([
        ...([-0.38, 0, 0.38] as const).flatMap((x, index) => [
          part("cylinder", [x, y + 0.42 + index * 0.08, 0], [0.2, 0.84 + index * 0.16, 0.2], "primary"),
          part("dome", [x, y + 0.88 + index * 0.16, 0], [0.22, 0.14, 0.22], "accent"),
        ]),
        part("box", [0, y + 0.2, 0.28], [1.15, 0.08, 0.42], "roof"),
      ]);
    case "riran-sea-gate":
      return seated([
        part("box", [-0.42, y + 0.09, 0.28], [0.18, 0.18, 0.88], "wood"),
        part("box", [0.42, y + 0.09, 0.28], [0.18, 0.18, 0.88], "wood"),
        part("cylinder", [-0.34, y + 0.3, -0.12], [0.22, 0.6, 0.22], "primary"),
        part("cylinder", [0.34, y + 0.3, -0.12], [0.22, 0.6, 0.22], "primary"),
        part("box", [0, y + 0.51, -0.12], [0.75, 0.16, 0.2], "secondary"),
        part("dome", [-0.34, y + 0.65, -0.12], [0.24, 0.16, 0.24], "roof"),
        part("dome", [0.34, y + 0.65, -0.12], [0.24, 0.16, 0.24], "roof"),
      ]);
    case "caravanserai":
      return seated([
        part("box", [0, y + 0.13, -0.52], [1.25, 0.26, 0.18], "primary"),
        part("box", [0, y + 0.13, 0.52], [1.25, 0.26, 0.18], "primary"),
        part("box", [-0.54, y + 0.13, 0], [0.18, 0.26, 0.9], "primary"),
        part("box", [0.54, y + 0.13, 0], [0.18, 0.26, 0.9], "primary"),
        ...([-0.54, 0.54] as const).flatMap((x) =>
          ([-0.52, 0.52] as const).flatMap((z) => [
            part("cylinder", [x, y + 0.28, z], [0.16, 0.56, 0.16], "secondary"),
            part("dome", [x, y + 0.58, z], [0.18, 0.12, 0.18], "accent"),
          ]),
        ),
      ]);
  }
}

export function createSemanticSettlementLayout(
  profile: SemanticSettlementProfile,
  center: readonly [number, number],
  detailLevel: "city" | "street",
  compactViewport: boolean,
  heightAt: SettlementHeightSampler,
): SemanticSettlementLayout {
  const paving = createPaving(
    profile,
    center,
    detailLevel,
    compactViewport,
    heightAt,
  );
  return {
    buildings: createBuildings(
      profile,
      center,
      detailLevel,
      compactViewport,
      heightAt,
    ),
    paving,
    activity: createActivity(
      profile,
      center,
      detailLevel,
      compactViewport,
      paving,
      heightAt,
    ),
    signature: createSignature(profile, center, heightAt),
  };
}
