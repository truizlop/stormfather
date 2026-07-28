import type { DetailLevel } from "./types";

/**
 * Isaac Stewart has described Roshar as roughly 4,000 miles east-to-west. The
 * canonical mainland spans 102.272 world units, so geographic/map-space units
 * stay calibrated to that estimate.
 */
export const ROSHAR_EAST_WEST_MILES = 4_000;
export const ROSHAR_COASTLINE_WIDTH_UNITS = 102.272;
export const MILES_PER_GEOGRAPHIC_UNIT =
  ROSHAR_EAST_WEST_MILES / ROSHAR_COASTLINE_WIDTH_UNITS;
export const KM_PER_GEOGRAPHIC_UNIT = MILES_PER_GEOGRAPHIC_UNIT * 1.609344;

/**
 * City and street modes are semantic local scenes centered on the selected
 * coordinate. Geometry in those modes represents a district, not a city enlarged
 * to the size of a country. Keeping a separate, explicit scale avoids implying
 * that close-detail modules occupy their map-space footprint.
 */
export const METERS_PER_LOCAL_UNIT = 12;
export const LOCAL_UNITS_PER_METER = 1 / METERS_PER_LOCAL_UNIT;

/**
 * Local-detail geometry is authored against these real-world dimensions.
 * Keeping them here prevents characters, doors, props, and navigation clearance
 * from drifting onto unrelated visual scales.
 */
export const REFERENCE_HUMAN_HEIGHT_METERS = 1.76;
export const REFERENCE_HUMAN_HEIGHT_LOCAL_UNITS =
  REFERENCE_HUMAN_HEIGHT_METERS * LOCAL_UNITS_PER_METER;
export const PEDESTRIAN_RADIUS_METERS = 0.31;
export const PEDESTRIAN_RADIUS_LOCAL_UNITS =
  PEDESTRIAN_RADIUS_METERS * LOCAL_UNITS_PER_METER;
export const PEDESTRIAN_CLEARANCE_METERS = 0.46;
export const PEDESTRIAN_CLEARANCE_LOCAL_UNITS =
  PEDESTRIAN_CLEARANCE_METERS * LOCAL_UNITS_PER_METER;
export const STANDARD_DOOR_HEIGHT_METERS = 2.08;
export const STANDARD_DOOR_WIDTH_METERS = 0.92;

export function metersToLocal(meters: number) {
  return meters * LOCAL_UNITS_PER_METER;
}

export function localToMeters(localUnits: number) {
  return localUnits * METERS_PER_LOCAL_UNIT;
}

export interface ScalePresentation {
  mode: "geographic" | "local";
  eyebrow: string;
  distance: string;
  note: string;
}

export const scalePresentation: Record<DetailLevel, ScalePresentation> = {
  continent: {
    mode: "geographic",
    eyebrow: "Geographic scale",
    distance: "500 mi",
    note: "1 world unit ≈ 39.1 mi",
  },
  region: {
    mode: "geographic",
    eyebrow: "Geographic scale",
    distance: "100 mi",
    note: "Country distances preserved",
  },
  city: {
    mode: "local",
    eyebrow: "Local district",
    distance: "50 m",
    note: "Detail scene rebased at selection",
  },
  street: {
    mode: "local",
    eyebrow: "Local street",
    distance: "10 m",
    note: "1 local unit = 12 m · 1:1 human clearance",
  },
};
