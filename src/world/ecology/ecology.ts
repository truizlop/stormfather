import type { DetailLevel } from "../types";

export type CreatureSpecies =
  | "chasmfiend"
  | "chull"
  | "axehound"
  | "skyeel"
  | "cremling";

export type SprenType =
  | "windspren"
  | "lifespren"
  | "gloryspren"
  | "fearspren"
  | "rainspren";

export interface CreatureSeed {
  id: string;
  species: CreatureSpecies;
  phase: number;
  radius: number;
  angle: number;
  speed: number;
  scale: number;
}

export interface SprenSeed {
  id: string;
  type: SprenType;
  phase: number;
  radius: number;
  angle: number;
  altitude: number;
}

interface HabitatProfile {
  creatures: readonly CreatureSpecies[];
  spren: readonly SprenType[];
}

const defaultHabitat: HabitatProfile = {
  creatures: ["cremling", "axehound", "skyeel"],
  spren: ["windspren", "lifespren", "fearspren", "rainspren"],
};

const habitatProfiles: Record<string, HabitatProfile> = {
  roshar: {
    creatures: ["skyeel"],
    spren: ["windspren", "rainspren"],
  },
  alethkar: {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "gloryspren", "fearspren", "rainspren"],
  },
  "shattered-plains": {
    creatures: ["chasmfiend", "chull", "cremling", "skyeel"],
    spren: ["windspren", "gloryspren", "fearspren", "rainspren"],
  },
  kholinar: {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "gloryspren", "lifespren", "fearspren", "rainspren"],
  },
  azir: {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "lifespren", "gloryspren", "rainspren"],
  },
  shinovar: {
    creatures: ["axehound", "cremling", "skyeel"],
    spren: ["lifespren", "windspren", "gloryspren"],
  },
  "jah-keved": {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "lifespren", "fearspren", "rainspren"],
  },
  purelake: {
    creatures: ["skyeel"],
    spren: ["lifespren", "windspren", "gloryspren", "rainspren"],
  },
  aimia: {
    creatures: ["cremling", "skyeel"],
    spren: ["windspren", "fearspren", "rainspren"],
  },
  kharbranth: {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "lifespren", "gloryspren", "fearspren", "rainspren"],
  },
  "thaylen-city": {
    creatures: ["chull", "axehound", "cremling", "skyeel"],
    spren: ["windspren", "lifespren", "gloryspren", "rainspren"],
  },
  urithiru: {
    creatures: ["cremling", "skyeel"],
    spren: ["windspren", "gloryspren", "lifespren"],
  },
};

const detailBudgets: Record<
  DetailLevel,
  { creatures: number; spren: number }
> = {
  continent: { creatures: 0, spren: 0 },
  region: { creatures: 3, spren: 4 },
  city: { creatures: 9, spren: 12 },
  street: { creatures: 16, spren: 20 },
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicUnit(seed: string) {
  let value = hashString(seed);
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967295;
}

function speciesScale(species: CreatureSpecies) {
  switch (species) {
    case "chasmfiend":
      return 1.2;
    case "chull":
      return 0.3;
    case "axehound":
      return 0.17;
    case "skyeel":
      return 0.32;
    case "cremling":
      return 0.045;
  }
}

export function ecologyBudget(
  detailLevel: DetailLevel,
  compactViewport: boolean,
) {
  const base = detailBudgets[detailLevel];
  const multiplier = compactViewport ? 0.62 : 1;
  return {
    creatures: Math.floor(base.creatures * multiplier),
    spren: Math.floor(base.spren * multiplier),
  };
}

export function createCreatureSeeds(
  locationId: string,
  detailLevel: DetailLevel,
  compactViewport = false,
) {
  const profile = habitatProfiles[locationId] ?? defaultHabitat;
  const budget = ecologyBudget(detailLevel, compactViewport).creatures;
  return Array.from({ length: budget }, (_, index): CreatureSeed => {
    const species =
      profile.creatures[index % profile.creatures.length] ?? "cremling";
    const key = `${locationId}:${species}:${index}`;
    const large = species === "chasmfiend";
    const airborne = species === "skyeel";
    return {
      id: key,
      species,
      phase: deterministicUnit(`${key}:phase`) * Math.PI * 2,
      radius:
        (large ? 7.5 : airborne ? 4.8 : 2.5) +
        deterministicUnit(`${key}:radius`) * (large ? 4 : 5.2),
      angle: deterministicUnit(`${key}:angle`) * Math.PI * 2,
      speed:
        0.22 +
        deterministicUnit(`${key}:speed`) *
          (species === "axehound" ? 0.5 : 0.28),
      scale:
        speciesScale(species) *
        (0.86 + deterministicUnit(`${key}:scale`) * 0.28),
    };
  });
}

export function createSprenSeeds(
  locationId: string,
  detailLevel: DetailLevel,
  compactViewport = false,
) {
  const profile = habitatProfiles[locationId] ?? defaultHabitat;
  const budget = ecologyBudget(detailLevel, compactViewport).spren;
  return Array.from({ length: budget }, (_, index): SprenSeed => {
    const type = profile.spren[index % profile.spren.length] ?? "windspren";
    const key = `${locationId}:${type}:${index}`;
    return {
      id: key,
      type,
      phase: deterministicUnit(`${key}:phase`) * Math.PI * 2,
      radius: 1.5 + deterministicUnit(`${key}:radius`) * 6.4,
      angle: deterministicUnit(`${key}:angle`) * Math.PI * 2,
      altitude: 0.08 + deterministicUnit(`${key}:altitude`) * 0.72,
    };
  });
}

export interface CreatureMotion {
  x: number;
  z: number;
  heading: number;
  crouch: number;
  pace: number;
}

export function creatureMotionAt(
  seed: CreatureSeed,
  timeSeconds: number,
  stormStrength: number,
): CreatureMotion {
  const storm = Math.max(0, Math.min(1, stormStrength));
  const isFlying = seed.species === "skyeel";
  const fleesQuickly = seed.species === "axehound";
  const shelters = seed.species !== "chasmfiend";
  const speed =
    seed.speed *
    (1 + storm * (fleesQuickly ? 3.1 : isFlying ? 2.2 : 0.7));
  const orbit = seed.angle + timeSeconds * speed * (isFlying ? 0.45 : 0.12);
  const shelterRadius = shelters ? seed.radius * (1 - storm * 0.68) : seed.radius;
  const lateral = Math.sin(timeSeconds * speed + seed.phase) * 0.24;
  const x = Math.cos(orbit) * shelterRadius + Math.cos(orbit + 1.57) * lateral;
  const z =
    Math.sin(orbit) * shelterRadius * 0.72 +
    Math.sin(orbit + 1.57) * lateral;
  return {
    x,
    z,
    heading: Math.atan2(
      Math.cos(orbit) * shelterRadius,
      -Math.sin(orbit) * shelterRadius,
    ),
    crouch:
      seed.species === "chasmfiend"
        ? 1 - storm * 0.34
        : Math.max(0.42, 1 - storm * 0.5),
    pace: speed,
  };
}

export interface SprenBehavior {
  visibility: number;
  speed: number;
  heightMultiplier: number;
  stormDrift: number;
}

export function sprenBehaviorAt(type: SprenType, stormStrength: number) {
  const storm = Math.max(0, Math.min(1, stormStrength));
  switch (type) {
    case "windspren":
      return {
        visibility: 0.75 + storm * 0.25,
        speed: 1 + storm * 4.8,
        heightMultiplier: 1 + storm * 0.5,
        stormDrift: storm * 2.4,
      } satisfies SprenBehavior;
    case "rainspren":
      return {
        visibility: 0.04 + storm * 0.96,
        speed: 1 + storm * 3.2,
        heightMultiplier: 0.7,
        stormDrift: storm * 1.8,
      } satisfies SprenBehavior;
    case "lifespren":
      return {
        visibility: 1 - storm * 0.88,
        speed: 1 - storm * 0.48,
        heightMultiplier: 1 - storm * 0.5,
        stormDrift: 0,
      } satisfies SprenBehavior;
    case "gloryspren":
      return {
        visibility: 1 - storm * 0.56,
        speed: 1 + storm * 0.35,
        heightMultiplier: 1 - storm * 0.25,
        stormDrift: storm * 0.2,
      } satisfies SprenBehavior;
    case "fearspren":
      return {
        visibility: 0.38 + storm * 0.62,
        speed: 0.8 + storm * 1.3,
        heightMultiplier: 1 - storm * 0.76,
        stormDrift: storm * 0.14,
      } satisfies SprenBehavior;
  }
}
