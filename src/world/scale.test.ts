import { describe, expect, it } from "vitest";
import {
  KM_PER_GEOGRAPHIC_UNIT,
  METERS_PER_LOCAL_UNIT,
  MILES_PER_GEOGRAPHIC_UNIT,
  ROSHAR_COASTLINE_WIDTH_UNITS,
  ROSHAR_EAST_WEST_MILES,
  scalePresentation,
} from "./scale";

describe("Roshar scale calibration", () => {
  it("maps the authored coastline to the published rough width", () => {
    expect(
      ROSHAR_COASTLINE_WIDTH_UNITS * MILES_PER_GEOGRAPHIC_UNIT,
    ).toBeCloseTo(ROSHAR_EAST_WEST_MILES);
    expect(KM_PER_GEOGRAPHIC_UNIT).toBeCloseTo(67.06, 1);
  });

  it("separates map geography from internally consistent close detail", () => {
    expect(scalePresentation.continent.mode).toBe("geographic");
    expect(scalePresentation.region.mode).toBe("geographic");
    expect(scalePresentation.city.mode).toBe("local");
    expect(scalePresentation.street.mode).toBe("local");
    expect(METERS_PER_LOCAL_UNIT).toBeGreaterThan(0);
  });
});
