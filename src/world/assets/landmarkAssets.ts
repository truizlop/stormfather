const landmarkAssetDirectory = `${import.meta.env.BASE_URL}models/landmarks`;

export const LANDMARK_RUNTIME_KIT_URL =
  `${landmarkAssetDirectory}/runtime-kit.glb`;

const landmarkFileByRoot = {
  Landmark_Akinah: "akinah.glb",
  Landmark_Azimir: "azimir.glb",
  Landmark_Kharbranth: "kharbranth.glb",
  Landmark_Kholinar: "kholinar.glb",
  Landmark_Oathgate: "oathgate.glb",
  Landmark_Purelake: "purelake.glb",
  Landmark_Shattered_Plains: "shattered-plains.glb",
  Landmark_Shinovar: "shinovar.glb",
  Landmark_ThaylenCity: "thaylen-city.glb",
  Landmark_Urithiru: "urithiru.glb",
  Landmark_Vedenar: "vedenar.glb",
} as const;

export type LandmarkModelRoot = keyof typeof landmarkFileByRoot;

export function landmarkAssetUrl(modelRoot: string): string {
  const filename =
    landmarkFileByRoot[modelRoot as LandmarkModelRoot];
  if (!filename) {
    throw new Error(`No split landmark asset registered for ${modelRoot}`);
  }
  return `${landmarkAssetDirectory}/${filename}`;
}

export function hasLandmarkAsset(
  modelRoot: string | undefined,
): modelRoot is LandmarkModelRoot {
  return (
    modelRoot !== undefined &&
    Object.hasOwn(landmarkFileByRoot, modelRoot)
  );
}
