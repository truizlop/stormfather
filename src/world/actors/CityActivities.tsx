import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import { stormProximity, stormXAtTime } from "../weather/storm";
import {
  bridgeRunPose,
  cargoLiftHeight,
  fishingRaftPose,
} from "./activityMath";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

function cloneModelRoot(scene: THREE.Group, name: string) {
  const source = scene.getObjectByName(name);
  if (!source) return null;
  const copy = source.clone(true);
  copy.position.set(0, 0, 0);
  copy.rotation.set(0, 0, 0);
  copy.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return copy;
}

function BridgeRun() {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_URL);
  const bridgeCrew = useMemo(
    () => cloneModelRoot(scene, "Prop_Bridge_Run"),
    [scene],
  );

  useFrame(() => {
    if (!group.current) return;
    const state = useAtlasStore.getState();
    const proximity = stormProximity(
      stormXAtTime(state.simulationTime),
      39,
    );
    const pose = bridgeRunPose(state.simulationTime, proximity);
    group.current.position.set(
      pose.x,
      1.94 + Math.sin(state.simulationTime * 0.82) * 0.008,
      pose.z,
    );
    group.current.rotation.y = pose.heading;
    group.current.rotation.z =
      Math.sin(state.simulationTime * 1.6) * 0.025 * (1 - proximity);
  });

  if (!bridgeCrew) return null;
  return (
    <group ref={group} name="animated bridge run" scale={0.13}>
      <primitive object={bridgeCrew} />
    </group>
  );
}

function FishingRaft({
  index,
  center,
}: {
  index: number;
  center: readonly [number, number];
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!group.current) return;
    const state = useAtlasStore.getState();
    const proximity = stormProximity(
      stormXAtTime(state.simulationTime),
      center[0],
    );
    const pose = fishingRaftPose(
      state.simulationTime,
      index,
      proximity,
      center,
    );
    group.current.position.set(
      pose.x,
      1.445 + Math.sin(state.simulationTime * 0.4 + index) * 0.007,
      pose.z,
    );
    group.current.rotation.y = pose.heading;
    group.current.rotation.z =
      Math.sin(state.simulationTime * 0.31 + index) * 0.02;
  });

  return (
    <group ref={group} name={`working fishing raft ${index + 1}`}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.035, 0.18]} />
        <meshStandardMaterial color="#795d3b" roughness={0.9} />
      </mesh>
      <mesh position={[-0.13, 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.009, 0.012, 0.3, 7]} />
        <meshStandardMaterial color="#c29a58" roughness={0.75} />
      </mesh>
      <mesh position={[0.08, 0.09, 0]} castShadow>
        <coneGeometry args={[0.035, 0.12, 8]} />
        <meshStandardMaterial color="#246f77" roughness={0.86} />
      </mesh>
      <mesh
        position={[0.23, -0.025, 0]}
        rotation-z={Math.PI / 2}
        castShadow
      >
        <cylinderGeometry args={[0.006, 0.006, 0.42, 6]} />
        <meshStandardMaterial color="#b68a4c" roughness={0.8} />
      </mesh>
    </group>
  );
}

function FishingActivity({ center }: { center: readonly [number, number] }) {
  return (
    <group name="Purelake fishing activity">
      {[0, 1, 2].map((index) => (
        <FishingRaft key={index} index={index} center={center} />
      ))}
    </group>
  );
}

function HarborCargo({
  center,
  locationId,
}: {
  center: readonly [number, number];
  locationId: string;
}) {
  const crane = useRef<THREE.Group>(null);
  const crate = useRef<THREE.Mesh>(null);
  const { scene } = useGLTF(MODEL_URL);
  const craneModel = useMemo(
    () => cloneModelRoot(scene, "Module_Dock_Crane"),
    [scene],
  );
  const isKharbranth = locationId === "kharbranth";
  const position = useMemo(
    () =>
      [
        center[0] + (isKharbranth ? -3.8 : 3.1),
        isKharbranth ? 1.32 : 1.1,
        center[1] + (isKharbranth ? 2.65 : 2.4),
      ] as const,
    [center, isKharbranth],
  );

  useFrame(() => {
    if (!crane.current || !crate.current) return;
    const state = useAtlasStore.getState();
    const proximity = stormProximity(
      stormXAtTime(state.simulationTime),
      center[0],
    );
    crane.current.rotation.y =
      -0.35 + Math.sin(state.simulationTime * 0.09) * 0.24 * (1 - proximity);
    crate.current.position.y = cargoLiftHeight(
      state.simulationTime,
      proximity,
    );
  });

  if (!craneModel) return null;
  return (
    <group ref={crane} position={position} scale={0.15} name="working dock crane">
      <primitive object={craneModel} />
      <mesh ref={crate} position={[1.28, 0.45, 0]} castShadow>
        <boxGeometry args={[0.42, 0.34, 0.42]} />
        <meshStandardMaterial color="#7a4d2c" roughness={0.88} />
      </mesh>
    </group>
  );
}

export function CityActivities() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const location = locationById.get(selectedId);

  if (
    !location ||
    (detailLevel !== "city" && detailLevel !== "street")
  ) {
    return null;
  }

  const center = [
    location.coordinates.x,
    location.coordinates.z,
  ] as const;

  if (selectedId === "shattered-plains") return <BridgeRun />;
  if (selectedId === "purelake") return <FishingActivity center={center} />;
  if (selectedId === "kharbranth" || selectedId === "thaylen-city") {
    return <HarborCargo center={center} locationId={selectedId} />;
  }
  return null;
}

useGLTF.preload(MODEL_URL);
