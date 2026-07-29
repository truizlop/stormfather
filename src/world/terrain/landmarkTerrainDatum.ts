import { landmarkHarborNodeUsesWaterDatum } from "./landmarkWaterDatum";

interface AuthoredTerrainDatum {
  /**
   * Height of the old Blender presentation shelf in authored local units.
   * Runtime terrain replaces that shelf, so inland geometry is translated
   * down by this amount before the landmark scale is applied.
   */
  authoredSupportY: number;
  hidesNode: (nodeName: string) => boolean;
}

function hidesAuthoredTerrainCradle(
  nodePrefix: string,
): (nodeName: string) => boolean {
  const hiddenNodes = new Set([
    `${nodePrefix}_Surface`,
    `${nodePrefix}_Transition`,
    `${nodePrefix}_OutcropBatch`,
  ]);
  return (nodeName) => hiddenNodes.has(nodeName);
}

const authoredTerrainDatums: Partial<
  Record<string, AuthoredTerrainDatum>
> = {
  azir: {
    authoredSupportY: 0.6,
    hidesNode: hidesAuthoredTerrainCradle("Azimir_TerrainCradle"),
  },
  aimia: {
    authoredSupportY: 0.56,
    hidesNode: hidesAuthoredTerrainCradle(
      "Akinah_TerrainCradle_Island",
    ),
  },
  kholinar: {
    authoredSupportY: 0.67,
    hidesNode: hidesAuthoredTerrainCradle("Kholinar_TerrainCradle"),
  },
  "shattered-plains": {
    // This cylinder is an obsolete Blender presentation backdrop. The
    // selected Shattered Plains heightfield already supplies the chasm floor.
    authoredSupportY: 0,
    hidesNode: (nodeName) =>
      nodeName === "ShatteredPlains_Chasm_Floor",
  },
  shinovar: {
    authoredSupportY: 0.36,
    hidesNode: hidesAuthoredTerrainCradle(
      "Shinovar_TerrainCradle_Valley",
    ),
  },
  "thaylen-city": {
    // The circular coastal foundation was authored from Y 0.00–0.52, while
    // merchant-quarter foundations span roughly Y 0.45–0.55. Registering the
    // city to Y 0.50 leaves those real foundations slightly embedded in the
    // selected terrain instead of hovering above it.
    authoredSupportY: 0.5,
    hidesNode: (nodeName) =>
      nodeName === "ThaylenCity_CoastalFoundation",
  },
};

export function landmarkPresentationNodeIsHidden(
  locationId: string,
  nodeName: string,
) {
  return Boolean(authoredTerrainDatums[locationId]?.hidesNode(nodeName));
}

export function landmarkTerrainShift(locationId: string) {
  const datum = authoredTerrainDatums[locationId];
  return datum && datum.authoredSupportY !== 0
    ? -datum.authoredSupportY
    : 0;
}

/**
 * Returns the local vertical shift for a direct child of an authored landmark.
 *
 * Harbor assemblies are already registered independently to animated water;
 * applying the terrain shift to them as well would lower ships and docks twice.
 */
export function landmarkChildVerticalShift(
  locationId: string,
  nodeName: string,
  harborWaterShift: number,
) {
  return landmarkHarborNodeUsesWaterDatum(locationId, nodeName)
    ? harborWaterShift
    : landmarkTerrainShift(locationId);
}
