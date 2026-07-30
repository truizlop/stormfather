import * as THREE from "three";
import { CITY_LOD_HIDDEN_WEIGHT } from "./progressiveLod";

export interface NearFadeMaterial {
  material: THREE.Material;
  baseOpacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

export interface NearFadeMaterialRegistration {
  entries: NearFadeMaterial[];
  dispose: () => void;
}

/**
 * Gives the currently mounted near-city meshes independent material clones
 * while retaining their authored alpha and depth settings for fades.
 */
export function registerNearFadeMaterials(
  root: THREE.Group,
): NearFadeMaterialRegistration {
  const ownedMaterials: THREE.Material[] = [];
  const entries: NearFadeMaterial[] = [];

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const sources = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    const clones = sources.map((source) => {
      // Suspense resolving or a detail-level change can remount this pass
      // while the previous clone is halfway through a fade. Carry the true
      // authored values forward instead of treating that transient opacity
      // as the new maximum.
      const baseOpacity =
        (source.userData.progressiveLodBaseOpacity as
          | number
          | undefined) ?? source.opacity;
      const baseTransparent =
        (source.userData.progressiveLodBaseTransparent as
          | boolean
          | undefined) ?? source.transparent;
      const baseDepthWrite =
        (source.userData.progressiveLodBaseDepthWrite as
          | boolean
          | undefined) ?? source.depthWrite;
      const material = source.clone();
      material.userData.progressiveLodBaseOpacity = baseOpacity;
      material.userData.progressiveLodBaseTransparent =
        baseTransparent;
      material.userData.progressiveLodBaseDepthWrite = baseDepthWrite;
      ownedMaterials.push(material);
      entries.push({
        material,
        baseOpacity,
        transparent: baseTransparent,
        depthWrite: baseDepthWrite,
      });
      material.alphaHash = false;
      material.needsUpdate = true;
      return material;
    });
    mesh.material = Array.isArray(mesh.material) ? clones : clones[0];
  });

  let disposed = false;
  return {
    entries,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const material of ownedMaterials) material.dispose();
    },
  };
}

export function applyNearOpacity(
  group: THREE.Group | null,
  entries: readonly NearFadeMaterial[],
  weight: number,
) {
  if (group) group.visible = weight > CITY_LOD_HIDDEN_WEIGHT;
  for (const entry of entries) {
    const wasTransparent = entry.material.transparent;
    entry.material.opacity = entry.baseOpacity * weight;
    entry.material.transparent =
      entry.transparent || weight < 0.999;
    entry.material.depthWrite =
      entry.depthWrite && weight >= 0.985;
    if (entry.material.transparent !== wasTransparent) {
      entry.material.needsUpdate = true;
    }
  }
}
