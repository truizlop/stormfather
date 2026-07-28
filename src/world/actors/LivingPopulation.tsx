import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import type { Culture } from "../types";
import { stormProximity, stormXAtTime } from "../weather/storm";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

const culturePalette: Record<
  Culture,
  { cloth: string; skin: string; actor: string }
> = {
  alethi: { cloth: "#173d73", skin: "#704026", actor: "Actor_Alethi" },
  azish: { cloth: "#6b214f", skin: "#3a1b12", actor: "Actor_Azish" },
  shin: { cloth: "#d3c3a2", skin: "#d1a889", actor: "Actor_Shin" },
  veden: { cloth: "#7e2f2f", skin: "#8a4f33", actor: "Actor_Alethi" },
  singer: { cloth: "#762a22", skin: "#be3b2a", actor: "Actor_Singer" },
  thaylen: { cloth: "#46545a", skin: "#9b6342", actor: "Actor_Thaylen" },
  purelaker: {
    cloth: "#16737b",
    skin: "#9c603a",
    actor: "Actor_Purelaker",
  },
  aimian: { cloth: "#44666d", skin: "#668aa6", actor: "Actor_Singer" },
  reshi: { cloth: "#596836", skin: "#936047", actor: "Actor_Purelaker" },
};

interface WalkerSeed {
  angle: number;
  radius: number;
  speed: number;
  phase: number;
  scale: number;
}

function Walkers({
  center,
  culture,
  count,
}: {
  center: [number, number];
  culture: Culture;
  count: number;
}) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo<WalkerSeed[]>(
    () =>
      Array.from({ length: count }, (_, index) => ({
        angle: ((index * 2.39996) % (Math.PI * 2)) + (index % 5) * 0.13,
        radius: 1.4 + ((index * 41) % 55) / 10,
        speed: 0.09 + ((index * 17) % 13) / 80,
        phase: index * 0.618,
        scale: 0.75 + ((index * 29) % 30) / 100,
      })),
    [count],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const palette = culturePalette[culture];

  useFrame(({ clock }) => {
    if (!bodies.current || !heads.current) return;
    const state = useAtlasStore.getState();
    const stormX = stormXAtTime(state.simulationTime);
    const proximity = stormProximity(stormX, center[0]);
    const hurry = 1 + proximity * 3.4;
    const shelter = 1 - proximity * 0.72;
    seeds.forEach((seed, index) => {
      const angle = seed.angle + clock.elapsedTime * seed.speed * hurry;
      const radius = seed.radius * shelter;
      const x = center[0] + Math.cos(angle) * radius;
      const z = center[1] + Math.sin(angle * 1.17) * radius * 0.7;
      const bob = Math.abs(Math.sin(clock.elapsedTime * 4.4 * hurry + seed.phase));
      dummy.position.set(x, 1.48 + bob * 0.055, z);
      dummy.rotation.y = -angle + Math.PI / 2;
      dummy.scale.setScalar(seed.scale);
      dummy.updateMatrix();
      bodies.current!.setMatrixAt(index, dummy.matrix);

      dummy.position.y = 1.86 + bob * 0.055;
      dummy.scale.setScalar(seed.scale * (culture === "singer" ? 1.08 : 1));
      dummy.updateMatrix();
      heads.current!.setMatrixAt(index, dummy.matrix);
    });
    bodies.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[0.13, 0.09, 0.42, 6]} />
        <meshStandardMaterial color={palette.cloth} roughness={0.82} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, count]} castShadow>
        <sphereGeometry args={[0.105, 8, 6]} />
        <meshStandardMaterial color={palette.skin} roughness={0.88} />
      </instancedMesh>
    </group>
  );
}

function CulturalRepresentative({
  center,
  culture,
}: {
  center: [number, number];
  culture: Culture;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const actor = useMemo(() => {
    const source = scene.getObjectByName(culturePalette[culture].actor);
    if (!source) return null;
    const clone = source.clone(true);
    clone.position.set(0, 0, 0);
    return clone;
  }, [culture, scene]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.y =
      1.15 + Math.abs(Math.sin(clock.elapsedTime * 2.1)) * 0.035;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.32) * 0.18;
  });

  if (!actor) return null;
  return (
    <group
      ref={group}
      position={[center[0] + 2.2, 1.15, center[1] + 2]}
      scale={0.42}
    >
      <primitive object={actor} />
    </group>
  );
}

export function LivingPopulation() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const location = locationById.get(selectedId);
  if (!location || detailLevel === "continent") return null;

  const count =
    detailLevel === "street" ? 88 : detailLevel === "city" ? 52 : 24;

  return (
    <>
      <Walkers
        key={`${location.id}-${count}`}
        center={[location.coordinates.x, location.coordinates.z]}
        culture={location.culture}
        count={count}
      />
      {detailLevel === "street" && (
        <CulturalRepresentative
          center={[location.coordinates.x, location.coordinates.z]}
          culture={location.culture}
        />
      )}
    </>
  );
}
