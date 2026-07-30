import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../store/useAtlasStore";
import { stormProximity, stormXAtTime } from "./weather/storm";

interface TrafficSeed {
  start: THREE.Vector3;
  end: THREE.Vector3;
  phase: number;
  speed: number;
}

function MovingTraffic({
  seeds,
  color,
  water = false,
}: {
  seeds: readonly TrafficSeed[];
  color: string;
  water?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const simulationTime = useAtlasStore.getState().simulationTime;
    const stormX = stormXAtTime(simulationTime);
    seeds.forEach((seed, index) => {
      const t = (seed.phase + clock.elapsedTime * seed.speed) % 1;
      dummy.position.lerpVectors(seed.start, seed.end, t);
      const proximity = stormProximity(stormX, dummy.position.x);
      const retreat = 1 - proximity * 0.75;
      dummy.scale.set(
        water ? 0.34 : 0.18,
        water ? 0.12 : 0.18,
        (water ? 0.72 : 0.38) * retreat,
      );
      dummy.lookAt(seed.end);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, seeds.length]} castShadow>
      {water ? (
        <coneGeometry args={[1, 2.2, 3]} />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.28}
        roughness={0.72}
      />
    </instancedMesh>
  );
}

export function WorldTraffic() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const caravans = useMemo<TrafficSeed[]>(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        start: new THREE.Vector3(-33 + (index % 3), 1.47, 3 + (index % 4)),
        end: new THREE.Vector3(38, 1.47, 8 + ((index * 3) % 6) - 3),
        phase: (index * 0.071) % 1,
        speed: 0.006 + (index % 5) * 0.0012,
      })),
    [],
  );
  const ships = useMemo<TrafficSeed[]>(
    () =>
      Array.from({ length: 13 }, (_, index) => ({
        start: new THREE.Vector3(-55, 0.25, 15 + (index % 4) * 2),
        end: new THREE.Vector3(46, 0.25, 25 - (index % 5) * 2),
        phase: (index * 0.117) % 1,
        speed: 0.004 + (index % 3) * 0.001,
      })),
    [],
  );

  if (detailLevel === "continent" || proximityLocationId !== null) return null;
  return (
    <>
      <MovingTraffic seeds={caravans} color="#d2a25d" />
      <MovingTraffic seeds={ships} color="#7ccbd3" water />
    </>
  );
}
