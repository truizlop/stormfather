import { describe, expect, it } from "vitest";
import type { Culture } from "../types";
import type { Occupation } from "./occupations";
import {
  createResidentVariation,
  cultureDressProfiles,
  movementGaitMultiplier,
  movementSpeedMultiplier,
  occupationPropMeters,
  residentMovementState,
} from "./residentVariation";

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

describe("resident variation", () => {
  it("is deterministic while producing varied plausible adult builds", () => {
    for (const culture of cultures) {
      const residents = Array.from({ length: 32 }, (_, index) =>
        createResidentVariation(culture, "kholinar", index, "artisan"),
      );
      expect(residents[7]).toEqual(
        createResidentVariation(culture, "kholinar", 7, "artisan"),
      );
      expect(Math.min(...residents.map((resident) => resident.heightMeters))).toBeGreaterThanOrEqual(
        1.56,
      );
      expect(Math.max(...residents.map((resident) => resident.heightMeters))).toBeLessThanOrEqual(
        2,
      );
      expect(
        new Set(
          residents.map((resident) => resident.shoulderScale.toFixed(3)),
        ).size,
      ).toBeGreaterThan(8);
    }
  });

  it("keeps child residents visibly smaller without miniature adults", () => {
    const child = createResidentVariation("shin", "shinovar", 4, "child");
    const adult = createResidentVariation("shin", "shinovar", 4, "farmer");
    expect(child.heightMeters).toBeGreaterThan(1.2);
    expect(child.heightMeters).toBeLessThan(1.56);
    expect(adult.heightMeters).toBeGreaterThan(child.heightMeters);
  });

  it("gives cultures distinct garment silhouettes and palettes", () => {
    expect(cultureDressProfiles.azish.garment).toBe("robe");
    expect(cultureDressProfiles.alethi.garment).toBe("coat");
    expect(cultureDressProfiles.shin.garment).toBe("tunic");
    expect(cultureDressProfiles.singer.shoulderBias).toBeGreaterThan(
      cultureDressProfiles.aimian.shoulderBias,
    );
    expect(cultureDressProfiles.azish.garmentLength).toBeGreaterThan(
      cultureDressProfiles.shin.garmentLength,
    );
    expect(
      new Set(cultures.map((culture) => cultureDressProfiles[culture].cloth[0]))
        .size,
    ).toBe(cultures.length);
  });

  it("assigns visible props to the expanded occupation set", () => {
    const occupations: Occupation[] = [
      "artisan",
      "courier",
      "dockworker",
      "herder",
      "scout",
      "vendor",
    ];
    for (const occupation of occupations) {
      expect(Math.max(...occupationPropMeters(occupation))).toBeGreaterThan(
        0.1,
      );
    }
  });

  it("selects working, carrying, conversing, and bridge-running states", () => {
    expect(residentMovementState("kholinar", "artisan", 0, 0)).toBe(
      "working",
    );
    expect(residentMovementState("kharbranth", "porter", 0, 0)).toBe(
      "carrying",
    );
    expect(residentMovementState("azir", "vendor", 2, 0)).toBe(
      "conversing",
    );
    expect(
      residentMovementState("shattered-plains", "builder", 0, 0),
    ).toBe("bridge-running");
    expect(residentMovementState("kholinar", "builder", 0, 0)).not.toBe(
      "bridge-running",
    );
  });

  it("interrupts every occupation to flee and shelter from storms", () => {
    for (const occupation of [
      "artisan",
      "courier",
      "farmer",
      "guard",
      "porter",
      "vendor",
    ] as const) {
      expect(
        residentMovementState("kholinar", occupation, 5, 0.7),
      ).toBe("fleeing");
    }
    expect(movementSpeedMultiplier("fleeing")).toBeGreaterThan(1);
    expect(movementGaitMultiplier("fleeing")).toBeGreaterThan(1);
  });
});
