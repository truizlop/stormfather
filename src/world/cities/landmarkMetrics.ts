import type { CityProfile } from "./profiles";

/**
 * Plan dimensions are measured from the authored Blender roots after excluding
 * presentation-only terrain/water shelves. The selected landmark is fitted to
 * the same district diameter used by buildings, people, and navigation.
 */
const landmarkPlanSize: Record<string, readonly [number, number]> = {
  Landmark_Urithiru: [11.784, 11.2],
  Landmark_Kharbranth: [10, 10.551],
  Landmark_Kholinar: [10.799, 10.4],
  Landmark_Azimir: [10.4, 10.4],
  Landmark_Purelake: [8.586, 6.23],
  Landmark_Shinovar: [8.797, 7.538],
  Landmark_Akinah: [10.2, 10.2],
  Landmark_Shattered_Plains: [12.14, 12],
  Landmark_Oathgate: [7.418, 7.757],
};

export const KHARBRANTH_LANDMARK_SCALE = (5.1 * 2) / 10.551;

export function kharbranthRoadOffset(tier: number) {
  return (-2.52 + tier * 1.02) * KHARBRANTH_LANDMARK_SCALE;
}

export function kharbranthRoadElevation(tier: number) {
  return (1.075 + tier * 0.52) * KHARBRANTH_LANDMARK_SCALE;
}

export function landmarkLocalScale(
  rootName: string,
  profile: Pick<CityProfile, "radius">,
) {
  const planSize = landmarkPlanSize[rootName];
  if (!planSize) return 0.56;
  return (profile.radius * 2) / Math.max(...planSize);
}

export function landmarkPlanDimensions(rootName: string) {
  return landmarkPlanSize[rootName];
}
