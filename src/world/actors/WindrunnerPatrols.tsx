import { useFrame, useThree } from "@react-three/fiber";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import { LOCAL_UNITS_PER_METER } from "../scale";
import { localSurfaceY } from "../terrain/localSurface";
import { stormProximity, stormXAtTime } from "../weather/storm";
import {
  createWindrunnerFlightPose,
  createWindrunnerFlightWorkspace,
  createWindrunnerSeeds,
  writeWindrunnerFlightPoseAt,
  type WindrunnerRank,
  type WindrunnerSeed,
} from "./windrunnerFlight";

const TRAIL_SEGMENTS = 11;
const MOTES_PER_KNIGHT = 3;
const FORMATION_MESH_COUNT = 13;
const SIDES = [-1, 1] as const;

const platePalette: Record<
  WindrunnerRank,
  {
    plate: string;
    secondary: string;
    cape: string;
    stormlight: string;
  }
> = {
  captain: {
    plate: "#78b8c9",
    secondary: "#315f7d",
    cape: "#102e55",
    stormlight: "#f2ffff",
  },
  knight: {
    plate: "#6f9eae",
    secondary: "#386d88",
    cape: "#174a7a",
    stormlight: "#bdf8ff",
  },
  squire: {
    plate: "#7799a6",
    secondary: "#426f86",
    cape: "#284965",
    stormlight: "#75eaf7",
  },
};

interface FormationMeshes {
  cuirasses: React.RefObject<THREE.InstancedMesh | null>;
  waists: React.RefObject<THREE.InstancedMesh | null>;
  helmets: React.RefObject<THREE.InstancedMesh | null>;
  visors: React.RefObject<THREE.InstancedMesh | null>;
  pauldrons: React.RefObject<THREE.InstancedMesh | null>;
  arms: React.RefObject<THREE.InstancedMesh | null>;
  gauntlets: React.RefObject<THREE.InstancedMesh | null>;
  legs: React.RefObject<THREE.InstancedMesh | null>;
  boots: React.RefObject<THREE.InstancedMesh | null>;
  capes: React.RefObject<THREE.InstancedMesh | null>;
  stormlights: React.RefObject<THREE.InstancedMesh | null>;
  shardblades: React.RefObject<THREE.InstancedMesh | null>;
  motes: React.RefObject<THREE.InstancedMesh | null>;
}

function setPart(
  mesh: THREE.InstancedMesh,
  part: THREE.Object3D,
  combined: THREE.Matrix4,
  rootMatrix: THREE.Matrix4,
  index: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  rotationX = 0,
  rotationY = 0,
  rotationZ = 0,
) {
  part.position.set(positionX, positionY, positionZ);
  part.scale.set(scaleX, scaleY, scaleZ);
  part.rotation.set(rotationX, rotationY, rotationZ);
  part.updateMatrix();
  combined.multiplyMatrices(rootMatrix, part.matrix);
  mesh.setMatrixAt(index, combined);
}

function setWorldMote(
  mesh: THREE.InstancedMesh,
  dummy: THREE.Object3D,
  index: number,
  positionX: number,
  positionY: number,
  positionZ: number,
  scale: number,
) {
  dummy.position.set(positionX, positionY, positionZ);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function makeTrailGeometry(count: number) {
  const vertexCount = count * TRAIL_SEGMENTS * 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices: number[] = [];
  const head = new THREE.Color("#a9f5ff");
  const tail = new THREE.Color("#087cae");
  const mixed = new THREE.Color();

  for (let actor = 0; actor < count; actor += 1) {
    for (let segment = 0; segment < TRAIL_SEGMENTS; segment += 1) {
      const progress = segment / (TRAIL_SEGMENTS - 1);
      mixed.copy(head).lerp(tail, progress);
      for (let side = 0; side < 2; side += 1) {
        const vertex = (actor * TRAIL_SEGMENTS + segment) * 2 + side;
        colors[vertex * 3] = mixed.r;
        colors[vertex * 3 + 1] = mixed.g;
        colors[vertex * 3 + 2] = mixed.b;
      }
      if (segment < TRAIL_SEGMENTS - 1) {
        const row = (actor * TRAIL_SEGMENTS + segment) * 2;
        indices.push(
          row,
          row + 1,
          row + 2,
          row + 1,
          row + 3,
          row + 2,
        );
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

function Formation({
  baseY,
  center,
  nightMode,
  seeds,
}: {
  baseY: number;
  center: readonly [number, number];
  nightMode: boolean;
  seeds: readonly WindrunnerSeed[];
}) {
  const cuirasses = useRef<THREE.InstancedMesh>(null);
  const waists = useRef<THREE.InstancedMesh>(null);
  const helmets = useRef<THREE.InstancedMesh>(null);
  const visors = useRef<THREE.InstancedMesh>(null);
  const pauldrons = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  const gauntlets = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  const boots = useRef<THREE.InstancedMesh>(null);
  const capes = useRef<THREE.InstancedMesh>(null);
  const stormlights = useRef<THREE.InstancedMesh>(null);
  const shardblades = useRef<THREE.InstancedMesh>(null);
  const motes = useRef<THREE.InstancedMesh>(null);
  const armorMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const secondaryMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const stormlightMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const trailMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const trailMesh = useRef<THREE.Mesh>(null);
  const flightRuntime = useRef({
    pose: createWindrunnerFlightPose(),
    sample: createWindrunnerFlightPose(),
    neighbor: createWindrunnerFlightPose(),
    mote: createWindrunnerFlightPose(),
    workspace: createWindrunnerFlightWorkspace(),
  });
  const root = useMemo(() => new THREE.Object3D(), []);
  const part = useMemo(() => new THREE.Object3D(), []);
  const mote = useMemo(() => new THREE.Object3D(), []);
  const combined = useMemo(() => new THREE.Matrix4(), []);
  const [trailGeometry] = useState(() =>
    makeTrailGeometry(seeds.length),
  );
  const meshes = useMemo<FormationMeshes>(
    () => ({
      cuirasses,
      waists,
      helmets,
      visors,
      pauldrons,
      arms,
      gauntlets,
      legs,
      boots,
      capes,
      stormlights,
      shardblades,
      motes,
    }),
    [],
  );

  useLayoutEffect(() => {
    const resolved = Object.values(meshes)
      .map((ref) => ref.current)
      .filter((mesh): mesh is THREE.InstancedMesh => Boolean(mesh));
    if (resolved.length !== FORMATION_MESH_COUNT) return;

    resolved.forEach((mesh) => {
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    });
    seeds.forEach((seed, index) => {
      const palette = platePalette[seed.rank];
      const plate = new THREE.Color(palette.plate);
      const secondary = new THREE.Color(palette.secondary);
      const cape = new THREE.Color(palette.cape);
      const light = new THREE.Color(palette.stormlight);
      for (const ref of [cuirasses, helmets]) {
        ref.current!.setColorAt(index, plate);
      }
      waists.current!.setColorAt(index, secondary);
      visors.current!.setColorAt(index, light);
      capes.current!.setColorAt(index, cape);
      shardblades.current!.setColorAt(index, light);
      for (let side = 0; side < 2; side += 1) {
        const doubled = index * 2 + side;
        pauldrons.current!.setColorAt(doubled, plate);
        arms.current!.setColorAt(doubled, secondary);
        gauntlets.current!.setColorAt(doubled, plate);
        legs.current!.setColorAt(doubled, secondary);
        boots.current!.setColorAt(doubled, plate);
      }
      for (let lightIndex = 0; lightIndex < 3; lightIndex += 1) {
        stormlights.current!.setColorAt(index * 3 + lightIndex, light);
      }
      for (let moteIndex = 0; moteIndex < MOTES_PER_KNIGHT; moteIndex += 1) {
        motes.current!.setColorAt(
          index * MOTES_PER_KNIGHT + moteIndex,
          light,
        );
      }
    });

    resolved.forEach((mesh) => {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [meshes, seeds]);

  useFrame(() => {
    if (
      !cuirasses.current ||
      !waists.current ||
      !helmets.current ||
      !visors.current ||
      !pauldrons.current ||
      !arms.current ||
      !gauntlets.current ||
      !legs.current ||
      !boots.current ||
      !capes.current ||
      !stormlights.current ||
      !shardblades.current ||
      !motes.current ||
      !trailMesh.current
    ) {
      return;
    }
    const state = useAtlasStore.getState();
    const time = state.simulationTime;
    const storm = stormProximity(stormXAtTime(time), center[0]);
    const runtime = flightRuntime.current;
    const trailPositionAttribute =
      trailMesh.current.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
    const trailPositions =
      trailPositionAttribute.array as Float32Array;

    seeds.forEach((seed, index) => {
      const pose = writeWindrunnerFlightPoseAt(
        seed,
        time,
        storm,
        runtime.pose,
        runtime.workspace,
      );
      const isLaunch = pose.mode === "launch";
      const isDive = pose.mode === "dive";
      root.position.set(
        center[0] + pose.x,
        baseY + pose.y,
        center[1] + pose.z,
      );
      root.rotation.order = "YXZ";
      root.rotation.set(
        Math.PI / 2 - pose.pitch,
        pose.heading,
        pose.bank,
      );
      root.scale.setScalar(LOCAL_UNITS_PER_METER * seed.bodyScale);
      root.updateMatrix();

      setPart(
        cuirasses.current!,
        part,
        combined,
        root.matrix,
        index,
        0,
        0.22,
        0,
        0.34,
        0.54,
        0.23,
      );
      setPart(
        waists.current!,
        part,
        combined,
        root.matrix,
        index,
        0,
        -0.16,
        0,
        0.25,
        0.22,
        0.19,
      );
      setPart(
        helmets.current!,
        part,
        combined,
        root.matrix,
        index,
        0,
        0.79,
        0,
        0.24,
        0.29,
        0.23,
      );
      setPart(
        visors.current!,
        part,
        combined,
        root.matrix,
        index,
        0,
        1.03,
        0.02,
        0.22,
        0.035,
        0.17,
      );
      setPart(
        capes.current!,
        part,
        combined,
        root.matrix,
        index,
        0,
        -0.25,
        -0.24,
        0.31,
        0.45 + (isDive ? 0.08 : 0),
        0.025,
        0.12 + (isLaunch ? 0.1 : 0),
      );

      for (const side of SIDES) {
        const doubled = index * 2 + (side === -1 ? 0 : 1);
        const asymmetricReach =
          side === 1 ? 0.58 : isDive ? 0.44 : 0.27;
        setPart(
          pauldrons.current!,
          part,
          combined,
          root.matrix,
          doubled,
          side * 0.34,
          0.36,
          0,
          0.2,
          0.18,
          0.21,
        );
        setPart(
          arms.current!,
          part,
          combined,
          root.matrix,
          doubled,
          side * 0.38,
          asymmetricReach,
          0,
          0.09,
          0.37,
          0.09,
          0,
          0,
          side * (side === 1 ? -0.12 : 0.28),
        );
        setPart(
          gauntlets.current!,
          part,
          combined,
          root.matrix,
          doubled,
          side * 0.4,
          asymmetricReach + 0.34,
          0,
          0.115,
          0.16,
          0.115,
        );
        setPart(
          legs.current!,
          part,
          combined,
          root.matrix,
          doubled,
          side * 0.13,
          -0.55 - (side === -1 ? 0.04 : 0),
          0,
          0.115,
          0.42,
          0.13,
          0,
          0,
          side * 0.035,
        );
        setPart(
          boots.current!,
          part,
          combined,
          root.matrix,
          doubled,
          side * 0.13,
          -0.96 - (side === -1 ? 0.04 : 0),
          0.03,
          0.14,
          0.19,
          0.18,
        );
      }

      const chestLightScale = 0.07 * pose.stormlight;
      setPart(
        stormlights.current!,
        part,
        combined,
        root.matrix,
        index * 3,
        0,
        0.33,
        0.235,
        chestLightScale,
        chestLightScale,
        chestLightScale,
      );
      const gauntletLightScale = 0.048 * pose.stormlight;
      setPart(
        stormlights.current!,
        part,
        combined,
        root.matrix,
        index * 3 + 1,
        -0.4,
        isDive ? 0.78 : 0.62,
        0,
        gauntletLightScale,
        gauntletLightScale,
        gauntletLightScale,
      );
      setPart(
        stormlights.current!,
        part,
        combined,
        root.matrix,
        index * 3 + 2,
        0.4,
        0.92,
        0,
        gauntletLightScale,
        gauntletLightScale,
        gauntletLightScale,
      );

      const carriesBlade =
        seed.rank === "captain" || seed.rank === "knight";
      setPart(
        shardblades.current!,
        part,
        combined,
        root.matrix,
        index,
        0.62,
        0.48,
        0.02,
        carriesBlade ? 0.055 : 0.0001,
        carriesBlade ? 1.18 : 0.0001,
        carriesBlade ? 0.018 : 0.0001,
        0,
        0,
        -0.16,
      );

      const trailStride = 0.087 + seed.index * 0.0015;
      for (let segment = 0; segment < TRAIL_SEGMENTS; segment += 1) {
        const sample = writeWindrunnerFlightPoseAt(
          seed,
          time - segment * trailStride,
          storm,
          runtime.sample,
          runtime.workspace,
        );
        const neighbor = writeWindrunnerFlightPoseAt(
          seed,
          time - (segment + 1) * trailStride,
          storm,
          runtime.neighbor,
          runtime.workspace,
        );
        const tangentX = sample.x - neighbor.x;
        const tangentZ = sample.z - neighbor.z;
        const tangentLength = Math.max(
          0.0001,
          Math.hypot(tangentX, tangentZ),
        );
        const sideX = -tangentZ / tangentLength;
        const sideZ = tangentX / tangentLength;
        const progress = segment / (TRAIL_SEGMENTS - 1);
        const width =
          (0.068 * (1 - progress) + 0.004) *
          (1 + storm * 0.34);
        for (let side = 0; side < 2; side += 1) {
          const sign = side === 0 ? -1 : 1;
          const vertex =
            ((index * TRAIL_SEGMENTS + segment) * 2 + side) * 3;
          trailPositions[vertex] =
            center[0] + sample.x + sideX * width * sign;
          trailPositions[vertex + 1] =
            baseY +
            sample.y +
            Math.sin(seed.phase + segment * 0.7) *
              0.012 *
              progress;
          trailPositions[vertex + 2] =
            center[1] + sample.z + sideZ * width * sign;
        }
      }

      for (let moteIndex = 0; moteIndex < MOTES_PER_KNIGHT; moteIndex += 1) {
        const sample = writeWindrunnerFlightPoseAt(
          seed,
          time - (moteIndex + 1) * 0.29,
          storm,
          runtime.mote,
          runtime.workspace,
        );
        const shimmer =
          Math.sin(time * 4.2 + seed.phase + moteIndex * 2.1) *
          0.026;
        const scale =
          (0.028 - moteIndex * 0.005) *
          (0.9 + pose.stormlight * 0.24);
        setWorldMote(
          motes.current!,
          mote,
          index * MOTES_PER_KNIGHT + moteIndex,
          center[0] + sample.x + shimmer,
          baseY + sample.y - shimmer * 0.4,
          center[1] + sample.z - shimmer,
          scale,
        );
      }
    });

    trailPositionAttribute.needsUpdate = true;
    cuirasses.current.instanceMatrix.needsUpdate = true;
    waists.current.instanceMatrix.needsUpdate = true;
    helmets.current.instanceMatrix.needsUpdate = true;
    visors.current.instanceMatrix.needsUpdate = true;
    pauldrons.current.instanceMatrix.needsUpdate = true;
    arms.current.instanceMatrix.needsUpdate = true;
    gauntlets.current.instanceMatrix.needsUpdate = true;
    legs.current.instanceMatrix.needsUpdate = true;
    boots.current.instanceMatrix.needsUpdate = true;
    capes.current.instanceMatrix.needsUpdate = true;
    stormlights.current.instanceMatrix.needsUpdate = true;
    shardblades.current.instanceMatrix.needsUpdate = true;
    motes.current.instanceMatrix.needsUpdate = true;
    if (armorMaterial.current) {
      armorMaterial.current.emissiveIntensity =
        0.22 + storm * 0.24 + (nightMode ? 0.14 : 0);
    }
    if (secondaryMaterial.current) {
      secondaryMaterial.current.emissiveIntensity =
        0.15 + storm * 0.18 + (nightMode ? 0.1 : 0);
    }
    if (stormlightMaterial.current) {
      stormlightMaterial.current.opacity =
        0.82 + storm * 0.16;
    }
    if (trailMaterial.current) {
      trailMaterial.current.opacity =
        0.5 + storm * 0.2 + (nightMode ? 0.08 : 0);
    }
  });

  const count = seeds.length;
  const doubled = count * 2;
  const stormlightCount = count * 3;
  const moteCount = count * MOTES_PER_KNIGHT;

  return (
    <group name="Windrunner Knights Radiant aerial formation">
      <instancedMesh
        ref={cuirasses}
        args={[undefined, undefined, count]}
        castShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 0.82, 1, 8]} />
        <meshStandardMaterial
          ref={armorMaterial}
          vertexColors
          color="#ffffff"
          emissive="#5fd8eb"
          roughness={0.24}
          metalness={0.78}
        />
      </instancedMesh>
      <instancedMesh
        ref={waists}
        args={[undefined, undefined, count]}
        castShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 0.8, 1, 8]} />
        <meshStandardMaterial
          ref={secondaryMaterial}
          vertexColors
          color="#ffffff"
          emissive="#2c8baa"
          roughness={0.3}
          metalness={0.7}
        />
      </instancedMesh>
      <instancedMesh
        ref={helmets}
        args={[undefined, undefined, count]}
        castShadow
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 7]} />
        <meshStandardMaterial
          vertexColors
          color="#ffffff"
          emissive="#52bdd0"
          emissiveIntensity={0.1}
          roughness={0.2}
          metalness={0.82}
        />
      </instancedMesh>
      <instancedMesh
        ref={visors}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial
          vertexColors
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
      <instancedMesh
        ref={pauldrons}
        args={[undefined, undefined, doubled]}
        castShadow
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 5]} />
        <meshStandardMaterial
          vertexColors
          color="#ffffff"
          emissive="#397f91"
          emissiveIntensity={0.11}
          roughness={0.22}
          metalness={0.8}
        />
      </instancedMesh>
      <instancedMesh
        ref={arms}
        args={[undefined, undefined, doubled]}
        castShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 0.8, 2, 7]} />
        <meshStandardMaterial
          vertexColors
          color="#ffffff"
          emissive="#286f87"
          emissiveIntensity={0.13}
          roughness={0.28}
          metalness={0.72}
        />
      </instancedMesh>
      <instancedMesh
        ref={gauntlets}
        args={[undefined, undefined, doubled]}
        castShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[1, 0.72, 2, 7]} />
        <meshStandardMaterial
          vertexColors
          color="#ffffff"
          emissive="#3b8fa1"
          emissiveIntensity={0.14}
          roughness={0.2}
          metalness={0.82}
        />
      </instancedMesh>
      <instancedMesh
        ref={legs}
        args={[undefined, undefined, doubled]}
        castShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.82, 1, 2, 7]} />
        <meshStandardMaterial
          vertexColors
          color="#ffffff"
          emissive="#245f77"
          emissiveIntensity={0.12}
          roughness={0.3}
          metalness={0.7}
        />
      </instancedMesh>
      <instancedMesh
        ref={boots}
        args={[undefined, undefined, doubled]}
        castShadow
        frustumCulled={false}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial
          vertexColors
          color="#ffffff"
          emissive="#397f91"
          emissiveIntensity={0.11}
          roughness={0.22}
          metalness={0.78}
        />
      </instancedMesh>
      <instancedMesh
        ref={capes}
        args={[undefined, undefined, count]}
        castShadow
        frustumCulled={false}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial
          vertexColors
          color="#ffffff"
          side={THREE.DoubleSide}
          roughness={0.82}
          metalness={0.02}
        />
      </instancedMesh>
      <instancedMesh
        ref={stormlights}
        args={[undefined, undefined, stormlightCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 5]} />
        <meshBasicMaterial
          ref={stormlightMaterial}
          vertexColors
          transparent
          opacity={0.86}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
      <instancedMesh
        ref={shardblades}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.68}
          toneMapped={false}
          depthWrite={false}
        />
      </instancedMesh>
      <mesh
        ref={trailMesh}
        geometry={trailGeometry}
        frustumCulled={false}
        name="Windrunner blue-white Stormlight ribbons"
      >
        <meshBasicMaterial
          ref={trailMaterial}
          vertexColors
          transparent
          opacity={0.5}
          toneMapped={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <instancedMesh
        ref={motes}
        args={[undefined, undefined, moteCount]}
        frustumCulled={false}
        name="Windrunner leaking Stormlight"
      >
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.74}
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
      <pointLight
        position={[center[0], baseY + 6.4, center[1]]}
        color="#8deffa"
        intensity={nightMode ? 1.05 : 0.42}
        distance={13}
        decay={2}
      />
    </group>
  );
}

/**
 * Selected-location activity layer for Urithiru. Human proportions remain at
 * the shared local meter scale; only Stormlight ribbons carry visual weight at
 * the broader city camera.
 */
export function WindrunnerPatrols() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const nightMode = useAtlasStore((state) => state.nightMode);
  const compactViewport = useThree((state) => state.size.width < 760);
  const location = locationById.get("urithiru")!;
  const seeds = useMemo(
    () => createWindrunnerSeeds(detailLevel, compactViewport),
    [compactViewport, detailLevel],
  );

  if (selectedId !== "urithiru" || seeds.length === 0) return null;

  const center = [
    location.coordinates.x,
    location.coordinates.z,
  ] as const;
  const baseY = localSurfaceY("urithiru", center[0], center[1]);
  return (
    <Formation
      key={`${detailLevel}-${compactViewport ? "compact" : "full"}`}
      baseY={baseY}
      center={center}
      nightMode={nightMode}
      seeds={seeds}
    />
  );
}
