import type { Culture } from "../types";
import { residentHeightMeters } from "./humanScale";
import type { Occupation } from "./occupations";

export type ResidentMovementState =
  | "walking"
  | "working"
  | "carrying"
  | "conversing"
  | "bridge-running"
  | "fleeing";

export type GarmentStyle = "coat" | "robe" | "wrap" | "tunic";

export interface CultureDressProfile {
  cloth: readonly string[];
  skin: readonly string[];
  accent: readonly string[];
  garment: GarmentStyle;
  garmentLength: number;
  garmentWidth: number;
  garmentDepth: number;
  shoulderBias: number;
  marbling?: string;
}

export const cultureDressProfiles: Record<Culture, CultureDressProfile> = {
  alethi: {
    cloth: ["#173d73", "#284f75", "#6d3f30", "#8d713d", "#27353b"],
    skin: ["#5b321f", "#704026", "#8a5536", "#9d6744"],
    accent: ["#d1a24d", "#91b8bd", "#be7658"],
    garment: "coat",
    garmentLength: 0.34,
    garmentWidth: 0.2,
    garmentDepth: 0.125,
    shoulderBias: 1.08,
  },
  azish: {
    cloth: ["#6b214f", "#4b2b69", "#7e542c", "#173f51", "#d0b887"],
    skin: ["#28130d", "#3a1b12", "#542a1a", "#6a3924"],
    accent: ["#d6b25c", "#a779a4", "#6fb0ac"],
    garment: "robe",
    garmentLength: 0.49,
    garmentWidth: 0.225,
    garmentDepth: 0.145,
    shoulderBias: 0.96,
  },
  shin: {
    cloth: ["#d3c3a2", "#846b4d", "#718052", "#9b6b54"],
    skin: ["#b98263", "#d1a889", "#e0bd9d"],
    accent: ["#8fae62", "#b97d4e", "#725e46"],
    garment: "tunic",
    garmentLength: 0.27,
    garmentWidth: 0.205,
    garmentDepth: 0.14,
    shoulderBias: 0.94,
  },
  veden: {
    cloth: ["#7e2f2f", "#5c343c", "#3b4f68", "#92724e"],
    skin: ["#704129", "#8a4f33", "#9d6645"],
    accent: ["#d39c62", "#6fa0a2", "#c4a45c"],
    garment: "coat",
    garmentLength: 0.38,
    garmentWidth: 0.215,
    garmentDepth: 0.135,
    shoulderBias: 1.03,
  },
  singer: {
    cloth: ["#762a22", "#3a302b", "#8a593e", "#253c41"],
    skin: ["#be3b2a", "#e4d0be", "#8f2e25"],
    accent: ["#1d1716", "#d4b8a1", "#70463b"],
    garment: "wrap",
    garmentLength: 0.29,
    garmentWidth: 0.225,
    garmentDepth: 0.15,
    shoulderBias: 1.14,
    marbling: "#241818",
  },
  thaylen: {
    cloth: ["#46545a", "#2e6267", "#76533d", "#8a785c"],
    skin: ["#7e4c34", "#9b6342", "#b17651"],
    accent: ["#d8d3c7", "#b69a64", "#6d9492"],
    garment: "coat",
    garmentLength: 0.35,
    garmentWidth: 0.205,
    garmentDepth: 0.135,
    shoulderBias: 1,
  },
  purelaker: {
    cloth: ["#16737b", "#2f8990", "#a15a36", "#c49a44", "#424e43"],
    skin: ["#7f472c", "#9c603a", "#b87950"],
    accent: ["#e0bb57", "#7ec5b9", "#cf694b"],
    garment: "wrap",
    garmentLength: 0.3,
    garmentWidth: 0.22,
    garmentDepth: 0.145,
    shoulderBias: 0.98,
  },
  aimian: {
    cloth: ["#44666d", "#4c596b", "#6a6655"],
    skin: ["#668aa6", "#78a2ba", "#53758f"],
    accent: ["#8bd3dc", "#c0b482", "#6b8d93"],
    garment: "robe",
    garmentLength: 0.45,
    garmentWidth: 0.205,
    garmentDepth: 0.13,
    shoulderBias: 0.92,
    marbling: "#23434f",
  },
  reshi: {
    cloth: ["#596836", "#3d6f62", "#8c6038", "#a88a48"],
    skin: ["#75472f", "#936047", "#ad7958"],
    accent: ["#9bb66a", "#d8ad52", "#72aaa1"],
    garment: "wrap",
    garmentLength: 0.28,
    garmentWidth: 0.215,
    garmentDepth: 0.145,
    shoulderBias: 0.97,
  },
};

export interface ResidentVariation {
  heightMeters: number;
  shoulderScale: number;
  torsoDepthScale: number;
  limbScale: number;
  legLengthScale: number;
  headScale: number;
  garmentLength: number;
  garmentWidth: number;
  garmentDepth: number;
  cloth: string;
  skin: string;
  accent: string;
  propMeters: readonly [number, number, number];
}

function deterministicUnit(index: number, locationSeed: number, salt: number) {
  return (
    ((index * (29 + salt * 4) + locationSeed * (11 + salt * 6) + salt * 17) %
      101) /
    100
  );
}

export function occupationPropMeters(
  occupation: Occupation,
): readonly [number, number, number] {
  switch (occupation) {
    case "porter":
    case "dockworker":
      return [0.46, 0.38, 0.5];
    case "guard":
    case "scout":
    case "fisher":
      return [0.045, 1.5, 0.045];
    case "scribe":
      return [0.34, 0.045, 0.46];
    case "builder":
    case "artisan":
      return [0.18, 0.62, 0.1];
    case "merchant":
    case "sailor":
      return [0.4, 0.32, 0.4];
    case "vendor":
      return [0.48, 0.06, 0.34];
    case "courier":
      return [0.32, 0.36, 0.14];
    case "surgeon":
      return [0.29, 0.14, 0.36];
    case "farmer":
    case "herder":
    case "pilgrim":
      return [0.07, 1.28, 0.07];
    default:
      return [0.0001, 0.0001, 0.0001];
  }
}

export function createResidentVariation(
  culture: Culture,
  locationId: string,
  index: number,
  occupation: Occupation,
): ResidentVariation {
  const dress = cultureDressProfiles[culture];
  const locationSeed = locationId.length;
  const build = 0.88 + deterministicUnit(index, locationSeed, 1) * 0.24;
  const height =
    residentHeightMeters(culture, index, locationSeed) *
    (occupation === "child" ? 0.78 : 1);
  return {
    heightMeters: height,
    shoulderScale: dress.shoulderBias * build,
    torsoDepthScale:
      0.88 + deterministicUnit(index, locationSeed, 2) * 0.22,
    limbScale: 0.9 + deterministicUnit(index, locationSeed, 3) * 0.18,
    legLengthScale:
      0.9 + deterministicUnit(index, locationSeed, 4) * 0.17,
    headScale: 0.94 + deterministicUnit(index, locationSeed, 5) * 0.12,
    garmentLength:
      dress.garmentLength *
      (0.94 + deterministicUnit(index, locationSeed, 6) * 0.12),
    garmentWidth: dress.garmentWidth * build,
    garmentDepth:
      dress.garmentDepth *
      (0.94 + deterministicUnit(index, locationSeed, 7) * 0.12),
    cloth: dress.cloth[index % dress.cloth.length],
    skin: dress.skin[(index * 3 + 1) % dress.skin.length],
    accent: dress.accent[(index * 5 + 2) % dress.accent.length],
    propMeters: occupationPropMeters(occupation),
  };
}

const workingOccupations = new Set<Occupation>([
  "artisan",
  "builder",
  "farmer",
  "fisher",
  "herder",
  "scribe",
  "surgeon",
]);

const carryingOccupations = new Set<Occupation>([
  "courier",
  "dockworker",
  "merchant",
  "porter",
  "sailor",
]);

const socialOccupations = new Set<Occupation>([
  "child",
  "pilgrim",
  "vendor",
]);

export function residentMovementState(
  locationId: string,
  occupation: Occupation,
  index: number,
  stormProximity: number,
): ResidentMovementState {
  if (stormProximity >= 0.34) return "fleeing";
  if (
    locationId === "shattered-plains" &&
    ["builder", "guard", "porter", "scout"].includes(occupation) &&
    index % 3 === 0
  ) {
    return "bridge-running";
  }
  if (workingOccupations.has(occupation) && index % 3 !== 2) {
    return "working";
  }
  if (carryingOccupations.has(occupation) && index % 3 !== 1) {
    return "carrying";
  }
  if (socialOccupations.has(occupation) || index % 11 === 0) {
    return "conversing";
  }
  return "walking";
}

export function movementSpeedMultiplier(state: ResidentMovementState) {
  switch (state) {
    case "working":
      return 0.16;
    case "conversing":
      return 0.08;
    case "carrying":
      return 0.72;
    case "bridge-running":
      return 1.55;
    case "fleeing":
      return 1.18;
    default:
      return 1;
  }
}

export function movementGaitMultiplier(state: ResidentMovementState) {
  switch (state) {
    case "working":
      return 0.18;
    case "conversing":
      return 0.08;
    case "carrying":
      return 0.58;
    case "bridge-running":
      return 1.4;
    case "fleeing":
      return 1.22;
    default:
      return 1;
  }
}
