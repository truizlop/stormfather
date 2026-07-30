import * as THREE from "three";

export const LANDMARK_SHADOW_CASTER_BUDGET = 48;

const nonStructuralShadowToken =
  /(glass|window|light|lantern|flame|water|spren|rope|cloth|banner|awning|sign|rune|glyph|mist|steam|foam)/i;

function visibleInHierarchy(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function isOpaqueStructuralMesh(mesh: THREE.Mesh) {
  if (!visibleInHierarchy(mesh) || nonStructuralShadowToken.test(mesh.name)) {
    return false;
  }
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  return materials.some(
    (material) =>
      material.visible &&
      material.opacity >= 0.98 &&
      !material.transparent,
  );
}

/**
 * Select the largest opaque structural meshes for the directional shadow
 * pass. Every landmark mesh still receives shadows, while small trim and
 * translucent details remain visible only in the color pass.
 */
export function selectLandmarkShadowCasters(
  root: THREE.Object3D,
  budget = LANDMARK_SHADOW_CASTER_BUDGET,
) {
  if (budget <= 0) return new Set<THREE.Mesh>();
  root.updateMatrixWorld(true);
  const worldScale = new THREE.Vector3();
  const candidates: {
    mesh: THREE.Mesh;
    score: number;
    order: number;
  }[] = [];
  let order = 0;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !isOpaqueStructuralMesh(mesh)) return;
    if (!mesh.geometry.boundingSphere) {
      mesh.geometry.computeBoundingSphere();
    }
    mesh.getWorldScale(worldScale);
    const radius = mesh.geometry.boundingSphere?.radius ?? 0;
    candidates.push({
      mesh,
      score:
        radius *
        Math.max(
          Math.abs(worldScale.x),
          Math.abs(worldScale.y),
          Math.abs(worldScale.z),
        ),
      order,
    });
    order += 1;
  });
  candidates.sort(
    (first, second) =>
      second.score - first.score ||
      first.mesh.name.localeCompare(second.mesh.name) ||
      first.order - second.order,
  );
  return new Set(
    candidates.slice(0, budget).map((candidate) => candidate.mesh),
  );
}
