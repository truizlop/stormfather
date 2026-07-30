import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { LANDMARK_RUNTIME_KIT_URL } from "../assets/landmarkAssets";
import { locationById } from "../locations";
import { localCityPresenceId } from "../cities/progressiveLod";
import { LOCAL_UNITS_PER_METER } from "../scale";
import { localSurfaceY } from "../terrain/localSurface";
import { settlementWaterY } from "../terrain/locationSurface";
import { stormProximity, stormXAtTime } from "../weather/storm";
import {
  bridgeRunPose,
  cargoLiftHeight,
  fishingRaftPose,
  floatingWatercraftY,
} from "./activityMath";

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
  const { scene } = useGLTF(LANDMARK_RUNTIME_KIT_URL);
  const bridgeCrew = useMemo(
    () => cloneModelRoot(scene, "Prop_Bridge_Run"),
    [scene],
  );

  useFrame(() => {
    if (!group.current) return;
    const state = useAtlasStore.getState();
    const shattered = locationById.get("shattered-plains")!;
    const center = [
      shattered.coordinates.x,
      shattered.coordinates.z,
    ] as const;
    const proximity = stormProximity(
      stormXAtTime(state.simulationTime),
      center[0],
    );
    const pose = bridgeRunPose(state.simulationTime, proximity, center);
    group.current.position.set(
      pose.x,
      localSurfaceY("shattered-plains", pose.x, pose.z) +
        Math.sin(state.simulationTime * 0.82) * 0.008,
      pose.z,
    );
    group.current.rotation.y = pose.heading;
    group.current.rotation.z =
      Math.sin(state.simulationTime * 1.6) * 0.025 * (1 - proximity);
  });

  if (!bridgeCrew) return null;
  return (
    <group
      ref={group}
      name="animated bridge run"
      scale={LOCAL_UNITS_PER_METER}
    >
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
    const waterY =
      settlementWaterY("purelake", state.simulationTime) ?? 0;
    group.current.position.set(
      pose.x,
      floatingWatercraftY(waterY, state.simulationTime, index),
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
  const { scene } = useGLTF(LANDMARK_RUNTIME_KIT_URL);
  const craneModel = useMemo(
    () => cloneModelRoot(scene, "Module_Dock_Crane"),
    [scene],
  );
  const isKharbranth = locationId === "kharbranth";
  const position = useMemo(
    () => {
      const x = center[0] + (isKharbranth ? -3.8 : 3.1);
      const z = center[1] + (isKharbranth ? 2.65 : 2.4);
      return [x, localSurfaceY(locationId, x, z), z] as const;
    },
    [center, isKharbranth, locationId],
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
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const activeLocationId = localCityPresenceId(
    detailLevel,
    proximityLocationId,
  );
  const location = activeLocationId
    ? locationById.get(activeLocationId)
    : undefined;

  if (!location || !activeLocationId) {
    return null;
  }

  const center = [
    location.coordinates.x,
    location.coordinates.z,
  ] as const;

  return (
    <group name={`${location.name} daily activities`}>
      {activeLocationId === "shattered-plains" && <BridgeRun />}
      {activeLocationId === "purelake" && (
        <FishingActivity center={center} />
      )}
      {(activeLocationId === "kharbranth" ||
        activeLocationId === "thaylen-city") && (
        <HarborCargo center={center} locationId={activeLocationId} />
      )}
    </group>
  );
}
