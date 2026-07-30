import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  applyNearOpacity,
  registerNearFadeMaterials,
} from "./nearFadeMaterials";

describe("near-city fade material registration", () => {
  it("re-registers authored Suspense content at the current partial alpha", () => {
    const root = new THREE.Group();
    const fallbackMesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({
        depthWrite: true,
        opacity: 1,
        transparent: false,
      }),
    );
    root.add(fallbackMesh);

    const fallbackRegistration = registerNearFadeMaterials(root);
    applyNearOpacity(root, fallbackRegistration.entries, 0.4);
    const fadedFallback = fallbackMesh.material as THREE.MeshStandardMaterial;
    const disposeFallback = vi.spyOn(fadedFallback, "dispose");

    root.remove(fallbackMesh);
    const authoredMaterial = new THREE.MeshStandardMaterial({
      depthWrite: false,
      opacity: 0.65,
      transparent: true,
    });
    const disposeOriginal = vi.spyOn(authoredMaterial, "dispose");
    const authoredMesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      authoredMaterial,
    );
    root.add(authoredMesh);

    fallbackRegistration.dispose();
    expect(disposeFallback).toHaveBeenCalledTimes(1);

    const authoredRegistration = registerNearFadeMaterials(root);
    applyNearOpacity(root, authoredRegistration.entries, 0.4);
    const fadedAuthored = authoredMesh.material as THREE.MeshStandardMaterial;

    expect(fadedAuthored).not.toBe(authoredMaterial);
    expect(authoredRegistration.entries).toMatchObject([
      {
        baseOpacity: 0.65,
        depthWrite: false,
        transparent: true,
      },
    ]);
    expect(fadedAuthored.opacity).toBeCloseTo(0.26);
    expect(fadedAuthored.transparent).toBe(true);
    expect(fadedAuthored.depthWrite).toBe(false);

    const disposeAuthored = vi.spyOn(fadedAuthored, "dispose");
    authoredRegistration.dispose();
    authoredRegistration.dispose();
    expect(disposeAuthored).toHaveBeenCalledTimes(1);
    expect(disposeOriginal).not.toHaveBeenCalled();
  });
});
