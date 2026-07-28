import type { Culture } from "../types";

export type Occupation =
  | "porter"
  | "merchant"
  | "scribe"
  | "guard"
  | "fisher"
  | "builder"
  | "farmer"
  | "sailor"
  | "surgeon"
  | "child"
  | "pilgrim";

const cultureDefaults: Record<Culture, readonly Occupation[]> = {
  alethi: ["guard", "merchant", "porter", "scribe", "child"],
  azish: ["scribe", "merchant", "guard", "porter", "pilgrim"],
  shin: ["farmer", "merchant", "child", "pilgrim"],
  veden: ["merchant", "porter", "guard", "farmer", "scribe"],
  singer: ["builder", "guard", "porter", "scribe", "child"],
  thaylen: ["sailor", "merchant", "porter", "guard", "child"],
  purelaker: ["fisher", "merchant", "child", "porter", "sailor"],
  aimian: ["pilgrim", "builder", "guard"],
  reshi: ["fisher", "sailor", "merchant", "child"],
};

const locationOverrides: Record<string, readonly Occupation[]> = {
  kharbranth: [
    "porter",
    "merchant",
    "surgeon",
    "sailor",
    "scribe",
    "guard",
    "child",
  ],
  "shattered-plains": [
    "builder",
    "porter",
    "guard",
    "scribe",
    "surgeon",
    "merchant",
  ],
  purelake: ["fisher", "fisher", "merchant", "child", "porter", "sailor"],
  azir: ["scribe", "scribe", "merchant", "guard", "porter", "pilgrim"],
  shinovar: ["farmer", "farmer", "merchant", "child", "pilgrim"],
  "thaylen-city": ["sailor", "sailor", "merchant", "porter", "guard"],
  urithiru: ["pilgrim", "scribe", "porter", "guard", "builder", "surgeon"],
  aimia: ["pilgrim", "builder", "guard"],
};

export function occupationsFor(locationId: string, culture: Culture) {
  return locationOverrides[locationId] ?? cultureDefaults[culture];
}
