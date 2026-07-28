import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { locations } from "./locations";
import { useAtlasStore } from "../store/useAtlasStore";

interface BuildingSeed {
  x: number;
  z: number;
  height: number;
  width: number;
  rotation: number;
  color: THREE.Color;
}

export function CityClusters() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const buildings = useMemo<BuildingSeed[]>(() => {
    const values: BuildingSeed[] = [];
    locations
      .filter((location) => location.id !== "roshar")
      .forEach((location, locationIndex) => {
        const count = location.kind === "city" ? 24 : 13;
        for (let index = 0; index < count; index += 1) {
          const angle = index * 2.39996 + locationIndex * 0.37;
          const radius = 1.3 + ((index * 29 + locationIndex * 7) % 42) / 10;
          values.push({
            x: location.coordinates.x + Math.cos(angle) * radius,
            z:
              location.coordinates.z +
              Math.sin(angle) * radius * (location.id === "kharbranth" ? 0.42 : 0.7),
            height: 0.28 + ((index * 17 + locationIndex) % 19) / 20,
            width: 0.18 + ((index * 13) % 8) / 35,
            rotation: angle + ((index % 3) - 1) * 0.16,
            color: new THREE.Color(
              index % 5 === 0
                ? location.regionColor
                : index % 7 === 0
                  ? "#9a5d3b"
                  : "#68645a",
            ),
          });
        }
      });
    return values;
  }, []);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    buildings.forEach((building, index) => {
      dummy.position.set(building.x, 1.25 + building.height / 2, building.z);
      dummy.rotation.y = building.rotation;
      dummy.scale.set(building.width, building.height, building.width * 0.85);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
      mesh.current!.setColorAt(index, building.color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [buildings]);

  if (detailLevel === "continent") return null;

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, buildings.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        vertexColors
        roughness={0.87}
        metalness={0.03}
      />
    </instancedMesh>
  );
}
