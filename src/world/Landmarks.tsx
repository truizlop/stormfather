import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { locations } from "./locations";
import { useAtlasStore } from "../store/useAtlasStore";
import { landmarkSurfaceY } from "./terrain/localSurface";
import { landmarkLocalScale } from "./cities/landmarkMetrics";
import { cityProfile } from "./cities/profiles";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

function LandmarkInstance({
  rootName,
  position,
  scale,
}: {
  rootName: string;
  position: [number, number, number];
  scale: number;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const [stoneSource, plasterSource] = useTexture([
    `${import.meta.env.BASE_URL}textures/crem-stone-albedo.jpg`,
    `${import.meta.env.BASE_URL}textures/kharbranth-plaster-albedo.jpg`,
  ]);
  const [stone, plaster] = useMemo(() => {
    return [stoneSource, plasterSource].map((source, index) => {
      const texture = source.clone();
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(index === 0 ? 3.2 : 2.2, index === 0 ? 3.2 : 2.2);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      return texture;
    }) as [THREE.Texture, THREE.Texture];
  }, [plasterSource, stoneSource]);
  const clone = useMemo(() => {
    const source = scene.getObjectByName(rootName);
    if (!source) return null;
    const copy = source.clone(true);
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.traverse((object) => {
      if (
        object.name === "Shinovar_Grass_Valley" ||
        object.name === "Purelake_Water_Shelf" ||
        object.name.startsWith("Kharbranth_Mountain_")
      ) {
        object.visible = false;
      }
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const sourceMaterials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        const texturedMaterials = sourceMaterials.map((sourceMaterial) => {
          const material = sourceMaterial.clone() as THREE.MeshStandardMaterial;
          const lowerName = `${object.name} ${material.name}`.toLowerCase();
          const excludesTexture =
            lowerName.includes("glass") ||
            lowerName.includes("cyan") ||
            lowerName.includes("water") ||
            lowerName.includes("light");
          if (!excludesTexture && "roughness" in material) {
            const usePlaster =
              rootName === "Landmark_Kharbranth" &&
              (lowerName.includes("house") ||
                lowerName.includes("terrace") ||
                lowerName.includes("awning"));
            material.bumpMap = usePlaster ? plaster : stone;
            material.bumpScale = usePlaster ? 0.018 : 0.026;
            material.roughness = Math.max(material.roughness ?? 0.8, 0.78);
            material.metalness = Math.min(material.metalness ?? 0, 0.08);
            material.needsUpdate = true;
          }
          return material;
        });
        mesh.material = Array.isArray(mesh.material)
          ? texturedMaterials
          : texturedMaterials[0];
      }
    });
    return copy;
  }, [plaster, rootName, scene, stone]);

  if (!clone) return null;

  return (
    <group position={position} scale={scale}>
      <primitive object={clone} />
    </group>
  );
}

export function Landmarks() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const selectedId = useAtlasStore((state) => state.selectedId);
  if (detailLevel === "continent" || detailLevel === "region") return null;
  if (detailLevel === "street" && selectedId === "shattered-plains") {
    return null;
  }

  return (
    <group>
      {locations
        .filter(
          (location) =>
            location.modelRoot && location.id === selectedId,
        )
        .map((location) => {
          const elevation = landmarkSurfaceY(
            location.id,
            location.coordinates.x,
            location.coordinates.z,
          );
          const profile = cityProfile(location.id, location.culture);
          return (
            <LandmarkInstance
              key={location.id}
              rootName={location.modelRoot!}
              position={[
                location.coordinates.x,
                elevation,
                location.coordinates.z,
              ]}
              scale={landmarkLocalScale(location.modelRoot!, profile)}
            />
          );
        })}
    </group>
  );
}

useGLTF.preload(MODEL_URL);
