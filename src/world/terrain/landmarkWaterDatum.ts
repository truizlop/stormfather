import { settlementWaterY } from "./locationSurface";

interface AuthoredHarborDatum {
  authoredWaterline: number;
  matchesNode: (nodeName: string) => boolean;
}

const authoredHarborDatums: Partial<
  Record<string, AuthoredHarborDatum>
> = {
  kharbranth: {
    // Boats were authored around Z 0.16 and the timber deck around Z 0.22.
    // Treat Z 0.10 as the calm-water plane so both keep a believable
    // freeboard after the whole working-harbor assembly is translated.
    authoredWaterline: 0.1,
    matchesNode: (nodeName) =>
      /^Kharbranth_(?:Harbor|Dock|Quay|Mooring)/.test(nodeName),
  },
  "thaylen-city": {
    // The hidden Blender harbor basin is centered at Z 0.49. Docks and hulls
    // were composed relative to that plane, so it is the authored datum.
    authoredWaterline: 0.49,
    matchesNode: (nodeName) =>
      /^ThaylenCity_(?:Harbor|Dock|MerchantShip)/.test(nodeName),
  },
};

export function landmarkHarborNodeUsesWaterDatum(
  locationId: string,
  nodeName: string,
) {
  return Boolean(
    authoredHarborDatums[locationId]?.matchesNode(nodeName),
  );
}

/**
 * Returns the local Three.js Y translation that registers an authored harbor
 * assembly with the same world-space water plane used by WaterSystem.
 */
export function landmarkHarborWaterShift(
  locationId: string,
  landmarkBaseY: number,
  landmarkScale: number,
  simulationTime = 0,
) {
  const datum = authoredHarborDatums[locationId];
  const waterY = settlementWaterY(locationId, simulationTime);
  if (!datum || waterY === null || landmarkScale <= 0) return 0;
  const runtimeWaterline = (waterY - landmarkBaseY) / landmarkScale;
  return runtimeWaterline - datum.authoredWaterline;
}
