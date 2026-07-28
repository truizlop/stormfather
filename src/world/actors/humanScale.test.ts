import { describe, expect, it } from "vitest";
import { localToMeters } from "../scale";
import type { Culture } from "../types";
import {
  detailedActorLocalScale,
  residentHeightMeters,
} from "./humanScale";

const cultures: Culture[] = [
  "alethi",
  "azish",
  "shin",
  "veden",
  "singer",
  "thaylen",
  "purelaker",
  "aimian",
  "reshi",
];

describe("inhabitant physical scale", () => {
  it("keeps every culture within a plausible calibrated human range", () => {
    for (const culture of cultures) {
      for (let index = 0; index < 24; index += 1) {
        const height = residentHeightMeters(culture, index, 7);
        expect(height).toBeGreaterThanOrEqual(1.56);
        expect(height).toBeLessThanOrEqual(2);
      }
    }
  });

  it("normalizes differently sized Blender actors into local meter scale", () => {
    const alethiScale = detailedActorLocalScale("alethi", 3, 10);
    const shinScale = detailedActorLocalScale("shin", 3, 10);
    expect(alethiScale).toBeGreaterThan(0.06);
    expect(alethiScale).toBeLessThan(0.09);
    expect(shinScale).toBeGreaterThan(alethiScale);
    expect(localToMeters(alethiScale * 2.063)).toBeCloseTo(
      residentHeightMeters("alethi", 3, 10),
    );
  });
});
