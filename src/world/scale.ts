import type { DetailLevel } from "./types";

/**
 * Isaac Stewart has described Roshar as roughly 4,000 miles east-to-west. The
 * authored coastline spans 96 world units, so geographic/map-space units stay
 * calibrated to that estimate.
 */
export const ROSHAR_EAST_WEST_MILES = 4_000;
export const ROSHAR_COASTLINE_WIDTH_UNITS = 96;
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
    note: "1 world unit ≈ 41.7 mi",
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
    note: "People and buildings share meter scale",
  },
};
