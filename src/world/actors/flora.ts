import type { DetailLevel } from "../types";

export type FloraKind = "rockbud" | "shell-fan" | "grass";

export interface FloraSeed {
  id: string;
  kind: FloraKind;
  angle: number;
  radius: number;
  scale: number;
  phase: number;
}

const floraBudgets: Record<DetailLevel, number> = {
  continent: 0,
  region: 22,
  city: 42,
  street: 62,
};

function hashUnit(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash << 13;
  hash ^= hash >>> 17;
  hash ^= hash << 5;
  return (hash >>> 0) / 4294967295;
}

function floraKindsFor(locationId: string): readonly FloraKind[] {
  if (locationId === "shinovar") {
    return ["grass", "grass", "grass", "grass", "shell-fan"];
  }
  if (locationId === "purelake") {
    return ["shell-fan", "shell-fan", "rockbud"];
  }
  if (locationId === "aimia" || locationId === "urithiru") {
    return ["rockbud", "rockbud", "shell-fan"];
  }
  return ["rockbud", "rockbud", "shell-fan", "rockbud", "shell-fan"];
}

export function floraBudget(
  detailLevel: DetailLevel,
  compactViewport: boolean,
) {
  return Math.floor(
    floraBudgets[detailLevel] * (compactViewport ? 0.58 : 1),
  );
}

export function createFloraSeeds(
  locationId: string,
  detailLevel: DetailLevel,
  compactViewport = false,
) {
  const kinds = floraKindsFor(locationId);
  const count = floraBudget(detailLevel, compactViewport);
  return Array.from({ length: count }, (_, index): FloraSeed => {
    const kind = kinds[index % kinds.length];
    const key = `${locationId}:${kind}:${index}`;
    const minimumRadius = detailLevel === "street" ? 2.2 : 3.1;
    const radiusRange = detailLevel === "region" ? 12 : 8.4;
    const baseScale = kind === "grass" ? 0.075 : kind === "rockbud" ? 0.13 : 0.11;
    return {
      id: key,
      kind,
      angle:
        (index * 2.399963229728653 +
          hashUnit(`${key}:angle`) * 0.42) %
        (Math.PI * 2),
      radius:
        minimumRadius + hashUnit(`${key}:radius`) * radiusRange,
      scale: baseScale * (0.78 + hashUnit(`${key}:scale`) * 0.58),
      phase: hashUnit(`${key}:phase`) * Math.PI * 2,
    };
  });
}

export interface FloraReaction {
  openness: number;
  height: number;
  bend: number;
}

export function floraReactionAt(
  kind: FloraKind,
  stormStrength: number,
  shelteredByMountains: boolean,
): FloraReaction {
  const storm = Math.max(0, Math.min(1, stormStrength));
  if (kind === "grass") {
    const effectiveStorm = storm * (shelteredByMountains ? 0.34 : 1);
    return {
      openness: 1,
      height: 1 - effectiveStorm * 0.12,
      bend: effectiveStorm * 0.72,
    };
  }
  if (kind === "rockbud") {
    return {
      openness: Math.max(0.05, 1 - storm * 1.08),
      height: 1 - storm * 0.2,
      bend: storm * 0.08,
    };
  }
  return {
    openness: Math.max(0.08, 1 - storm * 1.03),
    height: Math.max(0.28, 1 - storm * 0.74),
    bend: storm * 1.04,
  };
}
