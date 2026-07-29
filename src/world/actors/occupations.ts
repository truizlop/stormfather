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
  | "pilgrim"
  | "artisan"
  | "courier"
  | "vendor"
  | "herder"
  | "dockworker"
  | "scout";

const cultureDefaults: Record<Culture, readonly Occupation[]> = {
  alethi: [
    "guard",
    "merchant",
    "porter",
    "scribe",
    "courier",
    "artisan",
    "child",
  ],
  azish: ["scribe", "vendor", "artisan", "guard", "courier", "pilgrim"],
  shin: ["farmer", "herder", "artisan", "vendor", "child", "pilgrim"],
  veden: ["merchant", "courier", "guard", "farmer", "artisan", "scribe"],
  singer: ["builder", "scout", "porter", "artisan", "guard", "child"],
  thaylen: ["sailor", "dockworker", "vendor", "porter", "guard", "child"],
  purelaker: ["fisher", "vendor", "child", "porter", "sailor", "artisan"],
  aimian: ["pilgrim", "artisan", "scout"],
  reshi: ["fisher", "sailor", "vendor", "artisan", "child"],
};

const locationOverrides: Record<string, readonly Occupation[]> = {
  kharbranth: [
    "porter",
    "merchant",
    "surgeon",
    "sailor",
    "dockworker",
    "courier",
    "vendor",
    "scribe",
    "guard",
    "child",
  ],
  "shattered-plains": [
    "builder",
    "porter",
    "guard",
    "scout",
    "artisan",
    "scribe",
    "surgeon",
    "merchant",
  ],
  purelake: [
    "fisher",
    "fisher",
    "vendor",
    "child",
    "porter",
    "sailor",
    "artisan",
  ],
  azir: [
    "scribe",
    "scribe",
    "vendor",
    "courier",
    "guard",
    "artisan",
    "pilgrim",
  ],
  shinovar: ["farmer", "farmer", "herder", "vendor", "child", "pilgrim"],
  "thaylen-city": [
    "sailor",
    "dockworker",
    "dockworker",
    "vendor",
    "porter",
    "guard",
  ],
  urithiru: [
    "pilgrim",
    "scribe",
    "courier",
    "guard",
    "builder",
    "surgeon",
    "artisan",
  ],
  aimia: ["pilgrim", "artisan", "scout"],
};

export function occupationsFor(locationId: string, culture: Culture) {
  return locationOverrides[locationId] ?? cultureDefaults[culture];
}
