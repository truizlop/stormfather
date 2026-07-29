import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { locations } from "./locations";
import { useAtlasStore } from "../store/useAtlasStore";
import { landmarkSurfaceY } from "./terrain/localSurface";
import { landmarkLocalScale } from "./cities/landmarkMetrics";
import { cityProfile } from "./cities/profiles";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

const kharbranthMaterialTints = [
  ["plaster_red", "#955746"],
  ["plaster_ochre", "#a6814c"],
  ["plaster_teal", "#417777"],
  ["plaster_ivory", "#bdb29c"],
  ["wet_stone", "#62696a"],
  ["stormcut_cliff", "#3b4345"],
  ["dark_stormglass", "#17383d"],
  ["storm_wood", "#4f3424"],
  ["cloth_indigo", "#30475b"],
  ["cloth_maroon", "#713b45"],
  ["patinated_copper", "#567c75"],
  ["terracotta", "#805044"],
  ["blue_slate", "#465761"],
  ["windward_stone", "#77736c"],
  ["aged_brass", "#9b7947"],
  ["braided_rope", "#74634b"],
] as const;

function kharbranthMaterialTint(materialName: string) {
  const normalized = materialName.toLowerCase();
  return kharbranthMaterialTints.find(([token]) =>
    normalized.includes(token),
  )?.[1];
}

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
  const [
    plasterSource,
    kharbranthFacadeSource,
    masonryMicroSource,
    stormwoodMicroSource,
  ] = useTexture([
    `${import.meta.env.BASE_URL}textures/kharbranth-plaster-subtle.jpg`,
    `${import.meta.env.BASE_URL}textures/kharbranth-facade-realistic.jpg`,
    `${import.meta.env.BASE_URL}textures/rosharan-masonry-microheight-v2.jpg`,
    `${import.meta.env.BASE_URL}textures/rosharan-stormwood-microheight-v2.jpg`,
  ]);
  const [plaster, kharbranthFacade, masonryMicro, stormwoodMicro] =
    useMemo(() => {
      return [
        plasterSource,
        kharbranthFacadeSource,
        masonryMicroSource,
        stormwoodMicroSource,
      ].map((source, index) => {
        const texture = source.clone();
        texture.wrapS = texture.wrapT =
          index === 1 ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
        const repeat = index === 0 ? 2.4 : index === 1 ? 1 : index === 2 ? 6.4 : 5.2;
        texture.repeat.set(repeat, repeat);
        texture.colorSpace =
          index < 2 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        return texture;
      }) as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];
    }, [
      kharbranthFacadeSource,
      masonryMicroSource,
      plasterSource,
      stormwoodMicroSource,
    ]);
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
        object.name === "ThaylenCity_HarborBasin" ||
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
          if (rootName === "Landmark_Kharbranth") {
            const tint = kharbranthMaterialTint(material.name);
            if (tint) {
              material.color.set(tint);
              // Keep the generated scan in the micro-surface channels. Baking
              // a high-contrast scan into albedo made every facade read as
              // chipped paint. The subtle neutral scan preserves the dye.
              const isPlaster = material.name
                .toLowerCase()
                .includes("plaster");
              const isFacade =
                isPlaster &&
                object.name.toLowerCase().includes("facadeatlas");
              material.map = isFacade
                ? kharbranthFacade
                : isPlaster
                  ? plaster
                  : null;
              material.normalMap = null;
            }
            if (object.name.toLowerCase().includes("kharbranth_cliff")) {
              material.color.set("#3a4447");
              material.map = null;
              material.roughness = 0.94;
              material.flatShading = true;
            }
          }
          const excludesTexture =
            lowerName.includes("glass") ||
            lowerName.includes("cyan") ||
            lowerName.includes("water") ||
            lowerName.includes("light");
          if (!excludesTexture && "roughness" in material) {
            const isStormwood =
              /(wood|rope|timber|dock|balcony|shutter|door)/.test(lowerName) &&
              !lowerName.includes("stone");
            const microSurface = isStormwood
              ? stormwoodMicro
              : masonryMicro;
            const isAuthoredCitySurface =
              material.name.toLowerCase().includes("sf_city_");
            if (isAuthoredCitySurface && material.map) {
              // Blender-authored atlases stay in the color channel. Original
              // grayscale scans supply only sub-centimeter relief so a wall
              // remains a wall instead of reading like a projected image.
              material.map.colorSpace = THREE.SRGBColorSpace;
              material.map.anisotropy = 8;
              material.bumpMap = microSurface;
              material.roughnessMap = null;
              material.bumpScale = isStormwood ? 0.009 : 0.0055;
              material.roughness = Math.max(
                material.roughness ?? 0.8,
                isStormwood ? 0.8 : 0.86,
              );
              material.metalness = Math.min(
                material.metalness ?? 0,
                0.04,
              );
            } else {
              material.bumpMap = microSurface;
              material.roughnessMap = null;
              material.bumpScale = isStormwood ? 0.009 : 0.0055;
              material.roughness = Math.max(
                material.roughness ?? 0.8,
                isStormwood ? 0.8 : 0.86,
              );
              material.metalness = Math.min(
                material.metalness ?? 0,
                0.08,
              );
            }
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
  }, [
    kharbranthFacade,
    masonryMicro,
    plaster,
    rootName,
    scene,
    stormwoodMicro,
  ]);

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
