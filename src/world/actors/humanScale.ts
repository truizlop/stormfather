import type { Culture } from "../types";
import { metersToLocal } from "../scale";

const cultureHeightBias: Record<Culture, number> = {
  alethi: 0.12,
  azish: -0.02,
  shin: -0.06,
  veden: 0.07,
  singer: 0.18,
  thaylen: 0.01,
  purelaker: 0,
  aimian: 0.09,
  reshi: -0.01,
};

const detailedActorBodyHeight: Record<Culture, number> = {
  alethi: 2.063,
  azish: 1.91,
  shin: 1.811,
  veden: 1.994,
  singer: 2.139,
  thaylen: 1.91,
  purelaker: 1.87,
  aimian: 2.148,
  reshi: 1.891,
};

export function residentHeightMeters(
  culture: Culture,
  index: number,
  locationSeed = 0,
) {
  const variation = ((index * 29 + locationSeed * 7) % 19) / 100;
  return 1.62 + cultureHeightBias[culture] + variation;
}

export function detailedActorLocalScale(
  culture: Culture,
  index: number,
  locationSeed = 0,
) {
  return (
    metersToLocal(residentHeightMeters(culture, index, locationSeed)) /
    detailedActorBodyHeight[culture]
  );
}
