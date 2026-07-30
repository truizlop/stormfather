import { describe, expect, it } from "vitest";
import {
  landmarkChildVerticalShift,
  landmarkPresentationNodeIsHidden,
  landmarkTerrainShift,
} from "./landmarkTerrainDatum";

describe("authored terrain registration", () => {
  it("removes Thaylen City's circular presentation shelf", () => {
    expect(
      landmarkPresentationNodeIsHidden(
        "thaylen-city",
        "ThaylenCity_CoastalFoundation",
      ),
    ).toBe(true);
    expect(
      landmarkPresentationNodeIsHidden(
        "thaylen-city",
        "ThaylenCity_Seawall_01",
      ),
    ).toBe(false);
  });

  it("rejects only the Shattered Plains presentation floor disk", () => {
    expect(
      landmarkPresentationNodeIsHidden(
        "shattered-plains",
        "ShatteredPlains_Chasm_Floor",
      ),
    ).toBe(true);
    expect(
      landmarkPresentationNodeIsHidden(
        "shattered-plains",
        "ShatteredPlains_Plateau_01",
      ),
    ).toBe(false);
    expect(landmarkTerrainShift("shattered-plains")).toBe(0);
  });

  it("seats Thaylen foundations and seawalls on the runtime terrain datum", () => {
    const shift = landmarkTerrainShift("thaylen-city");
    expect(0.5 + shift).toBeCloseTo(0);
    expect(
      landmarkChildVerticalShift(
        "thaylen-city",
        "ThaylenCity_MerchantQuarter_1_01_Assembly",
        -1.2,
      ),
    ).toBe(shift);
    expect(
      landmarkChildVerticalShift(
        "thaylen-city",
        "ThaylenCity_Seawall_01",
        -1.2,
      ),
    ).toBe(shift);
  });

  it("registers rebuilt roots but lets runtime terrain replace Blender cradle bands", () => {
    const rebuiltCradles = [
      ["kholinar", 0.67, 0, "Kholinar_TerrainCradle"],
      ["azir", 0.6, 0.12, "Azimir_TerrainCradle"],
      ["shinovar", 0.36, 0, "Shinovar_TerrainCradle_Valley"],
      ["aimia", 0.56, 0, "Akinah_TerrainCradle_Island"],
      ["vedenar", 0.58, 0.1, "Vedenar_TerrainCradle_Cliff"],
    ] as const;

    for (const [
      locationId,
      authoredSupportY,
      terrainRevealY,
      nodePrefix,
    ] of rebuiltCradles) {
      const shift = landmarkTerrainShift(locationId);
      expect(authoredSupportY + shift, locationId).toBeCloseTo(
        terrainRevealY,
      );
      for (const suffix of [
        "Surface",
        "Transition",
        "OutcropBatch",
      ] as const) {
        const nodeName = `${nodePrefix}_${suffix}`;
        expect(
          landmarkPresentationNodeIsHidden(locationId, nodeName),
          nodeName,
        ).toBe(true);
        expect(
          landmarkChildVerticalShift(
            locationId,
            nodeName,
            -1.5,
          ),
          nodeName,
        ).toBe(shift);
      }
      expect(
        landmarkPresentationNodeIsHidden(
          locationId,
          `${nodePrefix}_Unrelated`,
        ),
      ).toBe(false);
    }
  });

  it("preserves the independent ocean datum for docks and ships", () => {
    const harborShift = -1.37;
    for (const nodeName of [
      "ThaylenCity_HarborBasin",
      "ThaylenCity_Dock_1_Plank_01",
      "ThaylenCity_DockCraneMast_1",
      "ThaylenCity_MerchantShip_1_Hull",
    ]) {
      expect(
        landmarkChildVerticalShift(
          "thaylen-city",
          nodeName,
          harborShift,
        ),
        nodeName,
      ).toBe(harborShift);
    }
  });

  it("does not alter landmarks without an authored terrain datum", () => {
    expect(landmarkTerrainShift("urithiru")).toBe(0);
    expect(
      landmarkPresentationNodeIsHidden(
        "urithiru",
        "Urithiru_Stratum_01",
      ),
    ).toBe(false);
  });
});
