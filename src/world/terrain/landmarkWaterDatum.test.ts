import { describe, expect, it } from "vitest";
import { OCEAN_WATER_HEIGHT } from "./locationSurface";
import {
  landmarkHarborNodeUsesWaterDatum,
  landmarkHarborWaterShift,
} from "./landmarkWaterDatum";

describe("authored harbor water registration", () => {
  it("moves Kharbranth's complete working harbor as one datum", () => {
    for (const nodeName of [
      "Kharbranth_Harbor_Quay",
      "Kharbranth_Harbor_TrimCargoBatch",
      "Kharbranth_Dock_01",
      "Kharbranth_DockCrane_Mast_01",
      "Kharbranth_QuayButtressBatch",
      "Kharbranth_MooringCoil_01",
    ]) {
      expect(
        landmarkHarborNodeUsesWaterDatum("kharbranth", nodeName),
        nodeName,
      ).toBe(true);
    }
    expect(
      landmarkHarborNodeUsesWaterDatum(
        "kharbranth",
        "Kharbranth_LowerWard_Block_01",
      ),
    ).toBe(false);

    const baseY = 1.04;
    const scale = 1.2;
    const shift = landmarkHarborWaterShift(
      "kharbranth",
      baseY,
      scale,
    );
    expect(baseY + (0.1 + shift) * scale).toBeCloseTo(
      OCEAN_WATER_HEIGHT,
    );
  });

  it("registers Thaylen docks and ships to its authored basin plane", () => {
    for (const nodeName of [
      "ThaylenCity_HarborBasin",
      "ThaylenCity_Dock_1_Plank_01",
      "ThaylenCity_DockCraneMast_1",
      "ThaylenCity_MerchantShip_1_Hull",
    ]) {
      expect(
        landmarkHarborNodeUsesWaterDatum("thaylen-city", nodeName),
        nodeName,
      ).toBe(true);
    }
    expect(
      landmarkHarborNodeUsesWaterDatum(
        "thaylen-city",
        "ThaylenCity_ExchangeHall",
      ),
    ).toBe(false);

    const baseY = 0.86;
    const scale = 0.82;
    const shift = landmarkHarborWaterShift(
      "thaylen-city",
      baseY,
      scale,
    );
    expect(baseY + (0.49 + shift) * scale).toBeCloseTo(
      OCEAN_WATER_HEIGHT,
    );
  });

  it("does not translate inland or unsupported landmark roots", () => {
    expect(landmarkHarborWaterShift("kholinar", 1, 0.8)).toBe(0);
    expect(landmarkHarborWaterShift("kharbranth", 1, 0)).toBe(0);
  });
});
