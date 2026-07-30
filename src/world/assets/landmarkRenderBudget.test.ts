import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  LANDMARK_SHADOW_CASTER_BUDGET,
  selectLandmarkShadowCasters,
} from "./landmarkRenderBudget";

function mesh(name: string, size: number, material?: THREE.Material) {
  const result = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    material ?? new THREE.MeshStandardMaterial(),
  );
  result.name = name;
  return result;
}

describe("landmark render budgets", () => {
  it("keeps only the largest opaque structural meshes in the shadow pass", () => {
    const root = new THREE.Group();
    const tower = mesh("Palace tower", 8);
    const hall = mesh("Market hall", 5);
    const kiosk = mesh("Small kiosk", 1);
    const window = mesh("Tower glass windows", 20);
    const translucent = mesh(
      "Harbor veil",
      30,
      new THREE.MeshStandardMaterial({
        transparent: true,
        opacity: 0.5,
      }),
    );
    root.add(kiosk, window, tower, translucent, hall);

    const selected = selectLandmarkShadowCasters(root, 2);

    expect([...selected].map((entry) => entry.name)).toEqual([
      "Palace tower",
      "Market hall",
    ]);
  });

  it("honors hidden hierarchy and the production budget", () => {
    const root = new THREE.Group();
    const hidden = new THREE.Group();
    hidden.visible = false;
    hidden.add(mesh("Hidden mountain", 100));
    root.add(hidden);
    for (let index = 0; index < 80; index += 1) {
      root.add(mesh(`Ward ${index}`, index + 1));
    }

    const selected = selectLandmarkShadowCasters(root);

    expect(selected.size).toBe(LANDMARK_SHADOW_CASTER_BUDGET);
    expect([...selected].some((entry) => entry.name === "Hidden mountain")).toBe(
      false,
    );
  });
});
