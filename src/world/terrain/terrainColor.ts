import * as THREE from "three";
import { terrainSlopeAt } from "./terrainHeight";

const biomeColors = {
  crem: new THREE.Color("#81765f"),
  stormward: new THREE.Color("#6f664d"),
  shinovar: new THREE.Color("#748d54"),
  iri: new THREE.Color("#7d8050"),
  azir: new THREE.Color("#b1844b"),
  frostlands: new THREE.Color("#a49570"),
  aimia: new THREE.Color("#5f6a68"),
  rock: new THREE.Color("#5a5954"),
  summit: new THREE.Color("#aaa79b"),
} as const;

export function terrainColorAt(x: number, z: number, height: number) {
  const color = biomeColors.crem.clone();
  if (x < -47) {
    color.copy(biomeColors.aimia);
  } else if (x < -31) {
    color.copy(biomeColors.shinovar);
  } else if (x < -18 && z < -7) {
    color.copy(biomeColors.iri);
  } else if (x < 3 && z > 1) {
    color.copy(biomeColors.azir);
  } else if (z > 13 && x > 2) {
    color.copy(biomeColors.frostlands);
  } else if (x > 28) {
    color.copy(biomeColors.stormward);
  }

  const slope = terrainSlopeAt(x, z);
  const rockBlend = THREE.MathUtils.clamp(
    (height - 1.75) * 0.19 + slope * 0.23,
    0,
    0.78,
  );
  color.lerp(biomeColors.rock, rockBlend);
  color.lerp(
    biomeColors.summit,
    THREE.MathUtils.smoothstep(height, 5.4, 7.4) * 0.62,
  );
  const variation =
    Math.sin(x * 1.37 + z * 0.61) * 0.025 +
    Math.sin(x * 0.29 - z * 1.11) * 0.018;
  color.offsetHSL(variation * 0.16, variation * 0.35, variation);
  return color;
}
