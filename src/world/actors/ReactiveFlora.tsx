import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import { localSurfaceY } from "../terrain/localSurface";
import { stormProximity, stormXAtTime } from "../weather/storm";

export function ReactiveFlora() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const location = locationById.get(selectedId);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const floraCount = detailLevel === "street" ? 38 : 54;
  const seeds = useMemo(
    () =>
      Array.from({ length: floraCount }, (_, index) => ({
        angle: (index * 2.39996) % (Math.PI * 2),
        radius: 3.2 + ((index * 43) % 75) / 10,
        scale: 0.3 + ((index * 31) % 42) / 100,
      })),
    [floraCount],
  );

  useFrame(({ clock }) => {
    if (!mesh.current || !location) return;
    const state = useAtlasStore.getState();
    const proximity = stormProximity(
      stormXAtTime(state.simulationTime),
      location.coordinates.x,
    );
    const protectedFlora = location.id === "shinovar";
    const open = protectedFlora ? 1 : Math.max(0.12, 1 - proximity * 0.92);
    seeds.forEach((seed, index) => {
      const x =
        location.coordinates.x +
        Math.cos(seed.angle) * seed.radius +
        Math.sin(index * 7.1) * 0.45;
      const z =
        location.coordinates.z +
        Math.sin(seed.angle) * seed.radius * 0.68;
      const idle = 1 + Math.sin(clock.elapsedTime * 0.7 + index) * 0.035;
      dummy.position.set(x, localSurfaceY(location.id, x, z) + 0.05, z);
      dummy.rotation.set(0, seed.angle, 0);
      dummy.scale.set(
        seed.scale * idle,
        seed.scale * open,
        seed.scale * idle,
      );
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  if (!location || detailLevel === "continent") return null;

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, seeds.length]} castShadow>
      <dodecahedronGeometry args={[0.26, 0]} />
      <meshStandardMaterial
        color={location.id === "shinovar" ? "#315c28" : "#6b4266"}
        roughness={0.92}
      />
    </instancedMesh>
  );
}
