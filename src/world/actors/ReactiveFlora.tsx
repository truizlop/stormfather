import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { isCompactViewport } from "../compactViewport";
import { locationById } from "../locations";
import { localSurfaceY } from "../terrain/localSurface";
import { stormProximity, stormXAtTime } from "../weather/storm";
import {
  createFloraSeeds,
  floraReactionAt,
  type FloraSeed,
} from "./flora";

function floraPosition(
  seed: FloraSeed,
  index: number,
  center: readonly [number, number],
) {
  return {
    x:
      center[0] +
      Math.cos(seed.angle) * seed.radius +
      Math.sin(index * 7.1) * 0.32,
    z: center[1] + Math.sin(seed.angle) * seed.radius * 0.68,
  };
}

function RockbudField({
  center,
  locationId,
  seeds,
}: {
  center: readonly [number, number];
  locationId: string;
  seeds: readonly FloraSeed[];
}) {
  const shells = useRef<THREE.InstancedMesh>(null);
  const seams = useRef<THREE.InstancedMesh>(null);
  const petals = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!shells.current || !seams.current || !petals.current) return;
    const state = useAtlasStore.getState();
    const storm = stormProximity(
      stormXAtTime(state.simulationTime),
      center[0],
    );
    const reaction = floraReactionAt("rockbud", storm, false);
    seeds.forEach((seed, index) => {
      const { x, z } = floraPosition(seed, index, center);
      const surface = localSurfaceY(locationId, x, z);
      const idle =
        1 + Math.sin(state.simulationTime * 0.48 + seed.phase) * 0.022;
      const bodyHalfHeight = seed.scale * 0.54 * reaction.height;

      dummy.position.set(x, surface + bodyHalfHeight, z);
      dummy.rotation.set(0, seed.angle, reaction.bend);
      dummy.scale.set(
        seed.scale * 0.86,
        bodyHalfHeight,
        seed.scale * 1.16,
      );
      dummy.updateMatrix();
      shells.current!.setMatrixAt(index, dummy.matrix);

      dummy.position.set(x, surface + bodyHalfHeight * 1.9, z);
      dummy.rotation.set(Math.PI / 2, seed.angle, 0);
      dummy.scale.set(
        seed.scale * 0.55,
        seed.scale * 0.55,
        seed.scale * 0.16,
      );
      dummy.updateMatrix();
      seams.current!.setMatrixAt(index, dummy.matrix);

      for (let petal = 0; petal < 4; petal += 1) {
        const petalAngle = seed.angle + (petal / 4) * Math.PI * 2;
        const spread = seed.scale * 0.5 * reaction.openness;
        dummy.position.set(
          x + Math.cos(petalAngle) * spread,
          surface +
            bodyHalfHeight * 2 +
            seed.scale * 0.19 * reaction.openness,
          z + Math.sin(petalAngle) * spread,
        );
        dummy.rotation.set(
          Math.PI / 2 - reaction.openness * 0.76,
          petalAngle,
          0,
        );
        dummy.scale.set(
          seed.scale * 0.5 * idle * reaction.openness,
          seed.scale * 0.92 * idle * reaction.openness,
          seed.scale * 0.22,
        );
        dummy.updateMatrix();
        petals.current!.setMatrixAt(index * 4 + petal, dummy.matrix);
      }
    });
    shells.current.instanceMatrix.needsUpdate = true;
    seams.current.instanceMatrix.needsUpdate = true;
    petals.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="Retractable rockbuds">
      <instancedMesh
        ref={shells}
        args={[undefined, undefined, seeds.length]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 9, 6]} />
        <meshStandardMaterial
          color="#76695b"
          roughness={0.88}
          metalness={0.025}
        />
      </instancedMesh>
      <instancedMesh
        ref={seams}
        args={[undefined, undefined, seeds.length]}
        castShadow
      >
        <torusGeometry args={[1, 0.13, 5, 12]} />
        <meshStandardMaterial color="#3b352f" roughness={0.94} />
      </instancedMesh>
      <instancedMesh
        ref={petals}
        args={[undefined, undefined, seeds.length * 4]}
        castShadow
      >
        <coneGeometry args={[0.7, 1.2, 5]} />
        <meshStandardMaterial
          color="#8b7766"
          roughness={0.84}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}

function ShellFanField({
  center,
  locationId,
  seeds,
}: {
  center: readonly [number, number];
  locationId: string;
  seeds: readonly FloraSeed[];
}) {
  const stems = useRef<THREE.InstancedMesh>(null);
  const petals = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!stems.current || !petals.current) return;
    const state = useAtlasStore.getState();
    const storm = stormProximity(
      stormXAtTime(state.simulationTime),
      center[0],
    );
    const reaction = floraReactionAt("shell-fan", storm, false);
    seeds.forEach((seed, index) => {
      const { x, z } = floraPosition(seed, index, center);
      const surface = localSurfaceY(locationId, x, z);
      const height = seed.scale * 2.1 * reaction.height;
      const windwardLean = -reaction.bend * 0.48;

      dummy.position.set(x, surface + height * 0.5, z);
      dummy.rotation.set(0, seed.angle, windwardLean);
      dummy.scale.set(seed.scale * 0.13, height, seed.scale * 0.13);
      dummy.updateMatrix();
      stems.current!.setMatrixAt(index, dummy.matrix);

      for (let petal = 0; petal < 5; petal += 1) {
        const fan = (petal - 2) * 0.32 * reaction.openness;
        const sway =
          Math.sin(state.simulationTime * 0.62 + seed.phase + petal) *
          0.035 *
          reaction.openness;
        dummy.position.set(
          x + Math.sin(seed.angle) * height * -windwardLean * 0.44,
          surface + height,
          z + Math.cos(seed.angle) * height * windwardLean * 0.44,
        );
        dummy.rotation.set(
          Math.PI / 2 - 0.2 - reaction.openness * 0.32,
          seed.angle + fan,
          sway,
        );
        dummy.scale.set(
          seed.scale * (0.56 + Math.abs(petal - 2) * 0.05),
          seed.scale * 1.25,
          seed.scale * 0.2,
        );
        dummy.updateMatrix();
        petals.current!.setMatrixAt(index * 5 + petal, dummy.matrix);
      }
    });
    stems.current.instanceMatrix.needsUpdate = true;
    petals.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="Shell-petaled fan vines">
      <instancedMesh
        ref={stems}
        args={[undefined, undefined, seeds.length]}
        castShadow
      >
        <cylinderGeometry args={[1, 1.4, 1, 5]} />
        <meshStandardMaterial color="#3f5542" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={petals}
        args={[undefined, undefined, seeds.length * 5]}
        castShadow
      >
        <coneGeometry args={[0.9, 1.25, 6]} />
        <meshStandardMaterial
          color="#5e745b"
          roughness={0.86}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}

function ShinGrassField({
  center,
  locationId,
  seeds,
}: {
  center: readonly [number, number];
  locationId: string;
  seeds: readonly FloraSeed[];
}) {
  const blades = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!blades.current) return;
    const state = useAtlasStore.getState();
    const storm = stormProximity(
      stormXAtTime(state.simulationTime),
      center[0],
    );
    const reaction = floraReactionAt("grass", storm, true);
    seeds.forEach((seed, index) => {
      const anchor = floraPosition(seed, index, center);
      for (let blade = 0; blade < 4; blade += 1) {
        const bladeAngle = seed.angle + blade * 1.71;
        const offset = seed.scale * 0.28;
        const x = anchor.x + Math.cos(bladeAngle) * offset;
        const z = anchor.z + Math.sin(bladeAngle) * offset;
        const surface = localSurfaceY(locationId, x, z);
        const height =
          seed.scale *
          (0.82 + blade * 0.11) *
          reaction.height;
        const ripple =
          Math.sin(state.simulationTime * 1.2 + seed.phase + blade) * 0.07;
        dummy.position.set(x, surface + height * 0.5, z);
        dummy.rotation.set(
          0,
          bladeAngle,
          -reaction.bend + ripple,
        );
        dummy.scale.set(seed.scale * 0.13, height, seed.scale * 0.08);
        dummy.updateMatrix();
        blades.current!.setMatrixAt(index * 4 + blade, dummy.matrix);
      }
    });
    blades.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={blades}
      args={[undefined, undefined, seeds.length * 4]}
      castShadow
      name="Shinovar grass clumps"
    >
      <coneGeometry args={[0.6, 1, 4]} />
      <meshStandardMaterial color="#496e32" roughness={0.94} />
    </instancedMesh>
  );
}

export function ReactiveFlora() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const compactViewport = useThree((state) =>
    isCompactViewport(state.size.width, state.size.height),
  );
  const location = locationById.get(selectedId);
  const seeds = useMemo(
    () =>
      location
        ? createFloraSeeds(location.id, detailLevel, compactViewport)
        : [],
    [compactViewport, detailLevel, location],
  );
  const byKind = useMemo(
    () => ({
      rockbuds: seeds.filter((seed) => seed.kind === "rockbud"),
      fans: seeds.filter((seed) => seed.kind === "shell-fan"),
      grass: seeds.filter((seed) => seed.kind === "grass"),
    }),
    [seeds],
  );

  if (!location || seeds.length === 0) return null;
  const center = [location.coordinates.x, location.coordinates.z] as const;

  return (
    <group name={`Reactive flora of ${location.name}`}>
      {byKind.rockbuds.length > 0 && (
        <RockbudField
          center={center}
          locationId={location.id}
          seeds={byKind.rockbuds}
        />
      )}
      {byKind.fans.length > 0 && (
        <ShellFanField
          center={center}
          locationId={location.id}
          seeds={byKind.fans}
        />
      )}
      {byKind.grass.length > 0 && (
        <ShinGrassField
          center={center}
          locationId={location.id}
          seeds={byKind.grass}
        />
      )}
    </group>
  );
}
