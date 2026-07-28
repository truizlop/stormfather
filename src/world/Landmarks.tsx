import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type * as THREE from "three";
import { locations } from "./locations";
import { useAtlasStore } from "../store/useAtlasStore";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

const landmarkScale: Record<string, number> = {
  Landmark_Urithiru: 0.68,
  Landmark_Kharbranth: 0.5,
  Landmark_Kholinar: 0.58,
  Landmark_Azimir: 0.6,
  Landmark_Purelake: 0.62,
  Landmark_Shinovar: 0.62,
  Landmark_Akinah: 0.58,
  Landmark_Shattered_Plains: 0.72,
  Landmark_Oathgate: 0.58,
};

function LandmarkInstance({
  rootName,
  position,
  selected,
}: {
  rootName: string;
  position: [number, number, number];
  selected: boolean;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const clone = useMemo(() => {
    const source = scene.getObjectByName(rootName);
    if (!source) return null;
    const copy = source.clone(true);
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.traverse((object) => {
      if (object.name === "Shinovar_Grass_Valley") {
        object.visible = false;
      }
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return copy;
  }, [rootName, scene]);

  if (!clone) return null;

  const scale = (landmarkScale[rootName] ?? 0.56) * (selected ? 1.08 : 1);
  return (
    <group position={position} scale={scale}>
      <primitive object={clone} />
    </group>
  );
}

export function Landmarks() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const selectedId = useAtlasStore((state) => state.selectedId);
  if (detailLevel === "continent") return null;

  return (
    <group>
      {locations
        .filter((location) => location.modelRoot)
        .map((location) => {
          const elevation =
            location.id === "shinovar" || location.id === "purelake"
              ? 1.05
              : location.id === "aimia"
                ? 0.08
                : 0.76;
          return (
            <LandmarkInstance
              key={location.id}
              rootName={location.modelRoot!}
              position={[
                location.coordinates.x,
                elevation,
                location.coordinates.z,
              ]}
              selected={location.id === selectedId}
            />
          );
        })}
    </group>
  );
}

useGLTF.preload(MODEL_URL);
