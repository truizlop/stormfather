import { describe, expect, it } from "vitest";
import {
  KM_PER_GEOGRAPHIC_UNIT,
  PEDESTRIAN_CLEARANCE_LOCAL_UNITS,
  PEDESTRIAN_RADIUS_LOCAL_UNITS,
  REFERENCE_HUMAN_HEIGHT_LOCAL_UNITS,
  REFERENCE_HUMAN_HEIGHT_METERS,
  STANDARD_DOOR_HEIGHT_METERS,
  METERS_PER_LOCAL_UNIT,
  MILES_PER_GEOGRAPHIC_UNIT,
  ROSHAR_COASTLINE_WIDTH_UNITS,
  ROSHAR_EAST_WEST_MILES,
  localToMeters,
  metersToLocal,
  scalePresentation,
} from "./scale";

describe("Roshar scale calibration", () => {
  it("maps the authored coastline to the published rough width", () => {
    expect(
      ROSHAR_COASTLINE_WIDTH_UNITS * MILES_PER_GEOGRAPHIC_UNIT,
    ).toBeCloseTo(ROSHAR_EAST_WEST_MILES);
    expect(KM_PER_GEOGRAPHIC_UNIT).toBeCloseTo(62.94, 1);
  });

  it("separates map geography from internally consistent close detail", () => {
    expect(scalePresentation.continent.mode).toBe("geographic");
    expect(scalePresentation.region.mode).toBe("geographic");
    expect(scalePresentation.city.mode).toBe("local");
    expect(scalePresentation.street.mode).toBe("local");
    expect(METERS_PER_LOCAL_UNIT).toBeGreaterThan(0);
  });

  it("uses one physical calibration for people, doors, and clearance", () => {
    expect(localToMeters(REFERENCE_HUMAN_HEIGHT_LOCAL_UNITS)).toBeCloseTo(
      REFERENCE_HUMAN_HEIGHT_METERS,
    );
    expect(localToMeters(metersToLocal(STANDARD_DOOR_HEIGHT_METERS))).toBeCloseTo(
      STANDARD_DOOR_HEIGHT_METERS,
    );
    expect(
      localToMeters(
        PEDESTRIAN_RADIUS_LOCAL_UNITS +
          PEDESTRIAN_CLEARANCE_LOCAL_UNITS,
      ),
    ).toBeCloseTo(0.77);
  });
});
