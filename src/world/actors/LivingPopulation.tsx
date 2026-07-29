import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import { metersToLocal } from "../scale";
import { localSurfaceY } from "../terrain/localSurface";
import type { Culture, DetailLevel, WorldLocation } from "../types";
import { stormProximity, stormXAtTime } from "../weather/storm";
import { createDistrictLayout } from "../cities/districtLayout";
import {
  kharbranthRoadOffset,
  landmarkLocalScale,
  landmarkRotationY,
} from "../cities/landmarkMetrics";
import { cityProfile } from "../cities/profiles";
import { detailedActorLocalScale } from "./humanScale";
import { occupationsFor, type Occupation } from "./occupations";
import {
  createNavigationField,
  landmarkNavigationObstacles,
  resolveCrowdSeparation,
  sampleNavigationRoute,
  type NavigationField,
} from "./pedestrianNavigation";
import {
  createResidentVariation,
  cultureDressProfiles,
  movementGaitMultiplier,
  movementSpeedMultiplier,
  residentMovementState,
} from "./residentVariation";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

interface ResidentSeed {
  routeIndex: number;
  speedMetersPerSecond: number;
  phase: number;
  heightUnits: number;
  shoulderScale: number;
  torsoDepthScale: number;
  limbScale: number;
  legLengthScale: number;
  headScale: number;
  garmentLength: number;
  garmentWidth: number;
  garmentDepth: number;
  occupation: Occupation;
  propScale: readonly [number, number, number];
  cloth: THREE.Color;
  skin: THREE.Color;
  accent: THREE.Color;
}

interface CrowdRefs {
  torso: RefObject<THREE.InstancedMesh | null>;
  heads: RefObject<THREE.InstancedMesh | null>;
  leftArms: RefObject<THREE.InstancedMesh | null>;
  rightArms: RefObject<THREE.InstancedMesh | null>;
  leftLegs: RefObject<THREE.InstancedMesh | null>;
  rightLegs: RefObject<THREE.InstancedMesh | null>;
  props: RefObject<THREE.InstancedMesh | null>;
  hats: RefObject<THREE.InstancedMesh | null>;
  outerwear: RefObject<THREE.InstancedMesh | null>;
  marbling: RefObject<THREE.InstancedMesh | null>;
}

function setPart(
  mesh: THREE.InstancedMesh,
  dummy: THREE.Object3D,
  index: number,
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  rotation: readonly [number, number, number],
) {
  dummy.position.set(...position);
  dummy.scale.set(...scale);
  dummy.rotation.set(...rotation);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function ArticulatedResidents({
  center,
  culture,
  count,
  locationId,
  navigation,
}: {
  center: readonly [number, number];
  culture: Culture;
  count: number;
  locationId: string;
  navigation: NavigationField;
}) {
  const torso = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const leftArms = useRef<THREE.InstancedMesh>(null);
  const rightArms = useRef<THREE.InstancedMesh>(null);
  const leftLegs = useRef<THREE.InstancedMesh>(null);
  const rightLegs = useRef<THREE.InstancedMesh>(null);
  const props = useRef<THREE.InstancedMesh>(null);
  const hats = useRef<THREE.InstancedMesh>(null);
  const outerwear = useRef<THREE.InstancedMesh>(null);
  const marbling = useRef<THREE.InstancedMesh>(null);
  const clothSource = useTexture(
    `${import.meta.env.BASE_URL}textures/rosharan-cloth-albedo.jpg`,
  );
  const clothTexture = useMemo(() => {
    const copy = clothSource.clone();
    copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
    copy.repeat.set(3.8, 3.8);
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.anisotropy = 8;
    copy.needsUpdate = true;
    return copy;
  }, [clothSource]);
  const dress = cultureDressProfiles[culture];
  const occupations = useMemo(
    () => occupationsFor(locationId, culture),
    [culture, locationId],
  );
  const seeds = useMemo<ResidentSeed[]>(
    () =>
      Array.from({ length: count }, (_, index) => {
        const occupation = occupations[index % occupations.length];
        const variation = createResidentVariation(
          culture,
          locationId,
          index,
          occupation,
        );
        return {
          routeIndex: (index * 5 + locationId.length) % 10,
          speedMetersPerSecond: 1.05 + ((index * 17) % 31) / 50,
          phase: (index * 0.618 + locationId.length * 0.071) % 2,
          heightUnits: metersToLocal(variation.heightMeters),
          shoulderScale: variation.shoulderScale,
          torsoDepthScale: variation.torsoDepthScale,
          limbScale: variation.limbScale,
          legLengthScale: variation.legLengthScale,
          headScale: variation.headScale,
          garmentLength: variation.garmentLength,
          garmentWidth: variation.garmentWidth,
          garmentDepth: variation.garmentDepth,
          occupation,
          propScale: [
            metersToLocal(variation.propMeters[0]),
            metersToLocal(variation.propMeters[1]),
            metersToLocal(variation.propMeters[2]),
          ],
          cloth: new THREE.Color(variation.cloth),
          skin: new THREE.Color(variation.skin),
          accent: new THREE.Color(variation.accent),
        };
      }),
    [count, culture, locationId, occupations],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const refs = useMemo<CrowdRefs>(
    () => ({
      torso,
      heads,
      leftArms,
      rightArms,
      leftLegs,
      rightLegs,
      props,
      hats,
      outerwear,
      marbling,
    }),
    [],
  );

  useLayoutEffect(() => {
    const meshes = Object.values(refs)
      .map((ref) => ref.current)
      .filter((mesh): mesh is THREE.InstancedMesh => Boolean(mesh));
    if (meshes.length !== Object.keys(refs).length) return;
    const darkMarble = new THREE.Color(dress.marbling ?? "#2a1b18");
    seeds.forEach((seed, index) => {
      torso.current!.setColorAt(index, seed.cloth);
      outerwear.current!.setColorAt(index, seed.accent);
      leftArms.current!.setColorAt(index, seed.cloth);
      rightArms.current!.setColorAt(index, seed.cloth);
      leftLegs.current!.setColorAt(index, seed.accent);
      rightLegs.current!.setColorAt(index, seed.accent);
      heads.current!.setColorAt(index, seed.skin);
      props.current!.setColorAt(index, seed.accent);
      hats.current!.setColorAt(index, seed.accent);
      marbling.current!.setColorAt(index, darkMarble);
    });
    meshes.forEach((mesh) => {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [dress.marbling, refs, seeds]);

  useFrame(() => {
    if (
      Object.values(refs).some((ref) => !ref.current) ||
      navigation.routes.length === 0
    ) {
      return;
    }
    const state = useAtlasStore.getState();
    const elapsed = state.simulationTime;
    const stormX = stormXAtTime(state.simulationTime);
    const proximity = stormProximity(stormX, center[0]);
    const hurry = 1 + proximity * 2.8;
    const shelter = THREE.MathUtils.smoothstep(proximity, 0.34, 0.94);
    const motion = seeds.map((seed, index) => {
      const route =
        navigation.routes[seed.routeIndex % navigation.routes.length];
      const movement = residentMovementState(
        locationId,
        seed.occupation,
        index,
        proximity,
      );
      const routeSpeed =
        (metersToLocal(seed.speedMetersPerSecond) *
          movementSpeedMultiplier(movement)) /
        route.length;
      const cycle = (elapsed * routeSpeed * hurry + seed.phase) % 2;
      const pingPong = cycle < 1 ? cycle : 2 - cycle;
      const workingInPlace =
        movement === "working" || movement === "conversing";
      const anchor = 0.13 + (seed.routeIndex % 6) * 0.14;
      const activeProgress = workingInPlace
        ? THREE.MathUtils.clamp(
            anchor +
              Math.sin(elapsed * 0.42 + seed.phase * 7) *
                (movement === "working" ? 0.022 : 0.012),
            0.03,
            0.97,
          )
        : pingPong;
      const routeProgress = THREE.MathUtils.lerp(
        activeProgress,
        0.035 + (seed.routeIndex % 3) * 0.012,
        shelter,
      );
      const routePose = sampleNavigationRoute(route, routeProgress);
      return { routePose, cycle, movement };
    });
    const separated = resolveCrowdSeparation(
      motion.map(({ routePose }) => ({
        x: routePose.x,
        z: routePose.z,
      })),
      navigation,
    );
    seeds.forEach((seed, index) => {
      const { routePose, cycle, movement } = motion[index];
      const x = separated[index].x;
      const z = separated[index].z;
      let facing = routePose.heading + (cycle < 1 ? 0 : Math.PI);
      if (movement === "conversing" && separated.length > 1) {
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (let other = 0; other < separated.length; other += 1) {
          if (other === index) continue;
          const dx = separated[other].x - x;
          const dz = separated[other].z - z;
          const distance = dx * dx + dz * dz;
          if (distance < nearestDistance) {
            nearestDistance = distance;
            facing = Math.atan2(dx, dz);
          }
        }
      }
      const forwardX = Math.sin(facing);
      const forwardZ = Math.cos(facing);
      const rightX = Math.cos(facing);
      const rightZ = -Math.sin(facing);
      const gait =
        Math.sin(
          elapsed * (6.5 + seed.speedMetersPerSecond * 2.2) * hurry +
            seed.phase * 8,
        ) * movementGaitMultiplier(movement);
      const humanHeight = seed.heightUnits;
      const bob = Math.abs(gait) * humanHeight * 0.018;
      const lean = shelter * 0.28;
      const feetY =
        localSurfaceY(locationId, x, z) +
        bob;

      setPart(
        torso.current!,
        dummy,
        index,
        [x, feetY + humanHeight * 0.6, z],
        [
          humanHeight * 0.14 * seed.shoulderScale,
          humanHeight * 0.2,
          humanHeight * 0.095 * seed.torsoDepthScale,
        ],
        [lean, facing, 0],
      );
      setPart(
        outerwear.current!,
        dummy,
        index,
        [
          x,
          feetY + humanHeight * (0.12 + seed.garmentLength / 2),
          z,
        ],
        [
          humanHeight * seed.garmentWidth,
          humanHeight * seed.garmentLength,
          humanHeight * seed.garmentDepth,
        ],
        [lean, facing, 0],
      );
      setPart(
        heads.current!,
        dummy,
        index,
        [x, feetY + humanHeight * 0.89, z],
        [
          humanHeight * 0.105 * seed.headScale,
          humanHeight * 0.11 * seed.headScale,
          humanHeight * 0.105 * seed.headScale,
        ],
        [lean, facing, 0],
      );
      for (const [side, mesh] of [
        [-1, leftLegs.current!],
        [1, rightLegs.current!],
      ] as const) {
        setPart(
          mesh,
          dummy,
          index,
          [
            x + side * rightX * humanHeight * 0.064,
            feetY + humanHeight * 0.21 * seed.legLengthScale,
            z + side * rightZ * humanHeight * 0.064,
          ],
          [
            humanHeight * 0.045 * seed.limbScale,
            humanHeight * 0.21 * seed.legLengthScale,
            humanHeight * 0.052 * seed.limbScale,
          ],
          [side * gait * 0.46, facing, 0],
        );
      }
      for (const [side, mesh] of [
        [-1, leftArms.current!],
        [1, rightArms.current!],
      ] as const) {
        let workGesture = -side * gait * 0.42;
        if (movement === "working") {
          workGesture =
            Math.sin(elapsed * 2.6 + seed.phase * 7) * 0.55;
        } else if (movement === "conversing") {
          workGesture =
            side *
            (0.22 + Math.sin(elapsed * 1.8 + seed.phase * 5) * 0.24);
        } else if (movement === "carrying") {
          workGesture = side * 0.42;
        }
        setPart(
          mesh,
          dummy,
          index,
          [
            x + side * rightX * humanHeight * 0.18,
            feetY + humanHeight * 0.6,
            z + side * rightZ * humanHeight * 0.18,
          ],
          [
            humanHeight * 0.035 * seed.limbScale,
            humanHeight * 0.19,
            humanHeight * 0.042 * seed.limbScale,
          ],
          [workGesture + lean, facing, side * 0.12],
        );
      }

      const staffLike = seed.propScale[1] > seed.propScale[0] * 3;
      const propY = staffLike
        ? feetY + humanHeight * 0.48
        : feetY + humanHeight * 0.56;
      const propForward =
        movement === "carrying" ? humanHeight * 0.18 : humanHeight * 0.24;
      setPart(
        props.current!,
        dummy,
        index,
        [
          x + forwardX * propForward,
          propY,
          z + forwardZ * propForward,
        ],
        seed.propScale,
        [movement === "working" ? gait * 0.7 : 0, facing, 0],
      );

      const hasHat =
        culture === "purelaker" ||
        culture === "azish" ||
        culture === "thaylen" ||
        seed.occupation === "surgeon" ||
        seed.occupation === "herder";
      const hatWidth =
        culture === "azish"
          ? 0.2
          : culture === "purelaker"
            ? 0.18
            : 0.145;
      setPart(
        hats.current!,
        dummy,
        index,
        [x, feetY + humanHeight * 1.01, z],
        hasHat
          ? [
              humanHeight * hatWidth,
              humanHeight * 0.085,
              humanHeight * hatWidth,
            ]
          : [0.0001, 0.0001, 0.0001],
        [0, facing, 0],
      );

      setPart(
        marbling.current!,
        dummy,
        index,
        [
          x - forwardX * humanHeight * 0.1,
          feetY + humanHeight * 0.6,
          z - forwardZ * humanHeight * 0.1,
        ],
        dress.marbling
          ? [
              humanHeight * 0.025,
              humanHeight * 0.18,
              humanHeight * 0.095,
            ]
          : [0.0001, 0.0001, 0.0001],
        [lean, facing, (index % 3 - 1) * 0.2],
      );
    });

    Object.values(refs).forEach((ref) => {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    });
  });

  if (navigation.routes.length === 0) return null;

  return (
    <group name={`${culture} articulated residents`}>
      <instancedMesh ref={torso} args={[undefined, undefined, count]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          bumpMap={clothTexture}
          bumpScale={0.006}
          vertexColors
          emissive="#171a1b"
          emissiveIntensity={0.28}
          toneMapped={false}
          roughness={0.84}
        />
      </instancedMesh>
      <instancedMesh
        ref={outerwear}
        args={[undefined, undefined, count]}
        castShadow
      >
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial
          bumpMap={clothTexture}
          bumpScale={0.006}
          vertexColors
          emissive="#171a1b"
          emissiveIntensity={0.2}
          toneMapped={false}
          roughness={0.88}
        />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, count]} castShadow>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial
          vertexColors
          emissive="#2a1710"
          emissiveIntensity={0.24}
          toneMapped={false}
          roughness={0.88}
        />
      </instancedMesh>
      <instancedMesh
        ref={leftArms}
        args={[undefined, undefined, count]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          bumpMap={clothTexture}
          bumpScale={0.006}
          vertexColors
          emissive="#171a1b"
          emissiveIntensity={0.28}
          toneMapped={false}
          roughness={0.87}
        />
      </instancedMesh>
      <instancedMesh
        ref={rightArms}
        args={[undefined, undefined, count]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          bumpMap={clothTexture}
          bumpScale={0.006}
          vertexColors
          emissive="#171a1b"
          emissiveIntensity={0.28}
          toneMapped={false}
          roughness={0.87}
        />
      </instancedMesh>
      <instancedMesh
        ref={leftLegs}
        args={[undefined, undefined, count]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          vertexColors
          emissive="#111619"
          emissiveIntensity={0.22}
          toneMapped={false}
          roughness={0.87}
        />
      </instancedMesh>
      <instancedMesh
        ref={rightLegs}
        args={[undefined, undefined, count]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          vertexColors
          emissive="#111619"
          emissiveIntensity={0.22}
          toneMapped={false}
          roughness={0.87}
        />
      </instancedMesh>
      <instancedMesh ref={props} args={[undefined, undefined, count]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          vertexColors
          emissive="#201b14"
          emissiveIntensity={0.18}
          toneMapped={false}
          roughness={0.8}
        />
      </instancedMesh>
      <instancedMesh ref={hats} args={[undefined, undefined, count]} castShadow>
        <coneGeometry args={[1, 0.65, 9]} />
        <meshStandardMaterial
          vertexColors
          emissive="#201b14"
          emissiveIntensity={0.18}
          toneMapped={false}
          roughness={0.86}
        />
      </instancedMesh>
      <instancedMesh ref={marbling} args={[undefined, undefined, count]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

const detailedActorRoot: Record<Culture, string> = {
  alethi: "Actor_Alethi",
  azish: "Actor_Azish",
  shin: "Actor_Shin",
  veden: "Actor_Veden",
  singer: "Actor_Singer",
  thaylen: "Actor_Thaylen",
  purelaker: "Actor_Purelaker",
  aimian: "Actor_Aimian",
  reshi: "Actor_Reshi",
};

const kharbranthDetailedActorRoots = [
  "Actor_Kharbranth_Porter_HD",
  "Actor_Kharbranth_Surgeon_HD",
  "Actor_Kharbranth_Scholar_HD",
  "Actor_Kharbranth_Dockworker_HD",
  "Actor_Kharbranth_Thaylen_Sailor_HD",
] as const;

function refineKharbranthActorMesh(
  mesh: THREE.Mesh,
  clothSurface: THREE.Texture,
  skinSurface: THREE.Texture,
) {
  if (mesh.name.includes("InnerCollar")) {
    // The small inset swatch is useful in Blender's contact sheet but covers
    // the fitted neckline when the browser camera is at portrait distance.
    mesh.visible = false;
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const sourceMaterials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  const materials = sourceMaterials.map((sourceMaterial) => {
    const material = sourceMaterial.clone() as THREE.MeshStandardMaterial;
    const materialName = material.name.toLowerCase();
    const meshName = mesh.name.toLowerCase();
    if (materialName.includes("skin_azish")) {
      material.color.set("#6f402f");
    } else if (materialName.includes("skin_alethi")) {
      material.color.set("#a36f59");
    } else if (materialName.includes("skin_purelaker")) {
      material.color.set("#8f5d48");
    }
    if (materialName.includes("skin_")) {
      material.bumpMap = skinSurface;
      material.bumpScale = 0.00022;
      material.roughnessMap = skinSurface;
      material.roughness = 0.61;
      material.metalness = 0;
      material.emissive.set("#2a100b");
      material.emissiveIntensity = 0.025;
    }
    const isFabric =
      /(cloth|tailored|thaylen_grey|kharbranth_)/.test(materialName) &&
      !/(skin|eye|hair|brass|glass|wood|leather|rope)/.test(materialName) &&
      !/(eye|hair|vial|satchel|ledger|cargo|rope|sandal)/.test(meshName);
    if (isFabric) {
      material.bumpMap = clothSurface;
      material.bumpScale = 0.0011;
      material.roughnessMap = clothSurface;
      material.roughness = Math.max(material.roughness ?? 0.78, 0.8);
    }
    material.needsUpdate = true;
    return material;
  });
  mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
}

function useKharbranthClothSurface() {
  const clothSource = useTexture(
    `${import.meta.env.BASE_URL}textures/rosharan-cloth-realistic.jpg`,
  );
  return useMemo(() => {
    const texture = clothSource.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.5, 5.5);
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [clothSource]);
}

function useKharbranthSkinSurface() {
  const skinSource = useTexture(
    `${import.meta.env.BASE_URL}textures/rosharan-skin-microdetail.png`,
  );
  return useMemo(() => {
    const texture = skinSource.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [skinSource]);
}

function KharbranthStreetCastMember({
  center,
  index,
  rootName,
}: {
  center: readonly [number, number];
  index: number;
  rootName: (typeof kharbranthDetailedActorRoots)[number];
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_URL);
  const clothSurface = useKharbranthClothSurface();
  const skinSurface = useKharbranthSkinSurface();
  const actor = useMemo(() => {
    const source = scene.getObjectByName(rootName);
    if (!source) return null;
    const copy = source.clone(true);
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        refineKharbranthActorMesh(mesh, clothSurface, skinSurface);
      }
    });
    return copy;
  }, [clothSurface, rootName, scene, skinSurface]);
  const lowerRoadZ = center[1] + kharbranthRoadOffset(0);
  const baseY = localSurfaceY("kharbranth", center[0], lowerRoadZ);
  const xOffset = [-0.22, 0, 0.22][index];
  const zOffset = [1.1, 1.105, 1.1][index];

  useFrame(() => {
    if (!group.current) return;
    const elapsed = useAtlasStore.getState().simulationTime;
    const pace = Math.sin(elapsed * (1.4 + index * 0.07) + index * 1.31);
    group.current.position.y = baseY + Math.abs(pace) * 0.0025;
    group.current.rotation.z = pace * 0.012;
  });

  if (!actor) return null;
  return (
    <group
      ref={group}
      position={[center[0] + xOffset, baseY, lowerRoadZ + zOffset]}
      rotation-y={-0.08 + index * 0.055}
      scale={detailedActorLocalScale("alethi", index, 11)}
      name={`Kharbranth street role ${index + 1}`}
    >
      <primitive object={actor} />
    </group>
  );
}

function KharbranthStreetCast({
  center,
}: {
  center: readonly [number, number];
}) {
  const lowerRoadZ = center[1] + kharbranthRoadOffset(0);
  const baseY = localSurfaceY("kharbranth", center[0], lowerRoadZ);
  return (
    <group name="Kharbranth close inspection cast">
      <mesh
        name="Kharbranth portrait cyclorama"
        position={[center[0], baseY + 0.155, lowerRoadZ + 1.015]}
        receiveShadow
        renderOrder={-1}
      >
        <boxGeometry args={[0.92, 0.38, 0.025]} />
        <meshStandardMaterial
          color="#202629"
          roughness={0.86}
          metalness={0}
        />
      </mesh>
      <pointLight
        position={[center[0] - 0.34, baseY + 0.38, lowerRoadZ + 1.42]}
        color="#ffd4aa"
        intensity={0.78}
        distance={1.8}
        decay={2}
      />
      <pointLight
        position={[center[0] + 0.34, baseY + 0.3, lowerRoadZ + 1.22]}
        color="#8fc8d0"
        intensity={0.42}
        distance={1.6}
        decay={2}
      />
      <mesh
        name="Kharbranth lower quay inspection promenade"
        position={[center[0], baseY - 0.018, lowerRoadZ + 1.17]}
        receiveShadow
      >
        <boxGeometry args={[0.92, 0.035, 0.32]} />
        <meshStandardMaterial
          color="#373c3c"
          roughness={0.93}
          metalness={0.015}
        />
      </mesh>
      {kharbranthDetailedActorRoots.slice(0, 3).map((rootName, index) => (
        <KharbranthStreetCastMember
          key={rootName}
          center={center}
          index={index}
          rootName={rootName}
        />
      ))}
    </group>
  );
}

function detailedActorRootName(
  culture: Culture,
  locationId: string,
  index: number,
) {
  if (locationId === "kharbranth") {
    return kharbranthDetailedActorRoots[
      index % kharbranthDetailedActorRoots.length
    ];
  }
  return detailedActorRoot[culture];
}

function DetailedResident({
  center,
  culture,
  index,
  locationId,
  navigation,
}: {
  center: readonly [number, number];
  culture: Culture;
  index: number;
  locationId: string;
  navigation: NavigationField;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_URL);
  const clothSurface = useKharbranthClothSurface();
  const skinSurface = useKharbranthSkinSurface();
  const resident = useMemo(() => {
    const source = scene.getObjectByName(
      detailedActorRootName(culture, locationId, index),
    );
    if (!source) return null;
    const copy = source.clone(true);
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        if (locationId === "kharbranth") {
          refineKharbranthActorMesh(mesh, clothSurface, skinSurface);
        } else {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    });
    return copy;
  }, [clothSurface, culture, index, locationId, scene, skinSurface]);

  useFrame(() => {
    if (!group.current) return;
    const state = useAtlasStore.getState();
    const proximity = stormProximity(
      stormXAtTime(state.simulationTime),
      center[0],
    );
    const route =
      navigation.routes[(index * 3 + 2) % navigation.routes.length];
    if (!route) return;
    const walkingSpeed = 1.08 + (index % 4) * 0.12;
    const routeSpeed = metersToLocal(walkingSpeed) / route.length;
    const hurry = 1 + proximity * 2.8;
    const cycle =
      (state.simulationTime * routeSpeed * hurry + index * 0.173) % 2;
    const progress = cycle < 1 ? cycle : 2 - cycle;
    const shelter = THREE.MathUtils.smoothstep(proximity, 0.34, 0.94);
    const routeProgress = THREE.MathUtils.lerp(
      progress,
      0.04 + (index % 3) * 0.015,
      shelter,
    );
    const routePose = sampleNavigationRoute(route, routeProgress);
    const gait = Math.sin(state.simulationTime * 7.2 + index * 1.7);
    group.current.position.set(
      routePose.x,
      localSurfaceY(locationId, routePose.x, routePose.z) +
        Math.abs(gait) * 0.003,
      routePose.z,
    );
    group.current.rotation.y =
      routePose.heading + (cycle < 1 ? 0 : Math.PI);
    group.current.rotation.z = shelter * -0.19 + gait * 0.018;
  });

  if (!resident) return null;
  const scale = detailedActorLocalScale(culture, index, locationId.length);
  return (
    <group ref={group} scale={scale} name={`${culture} detailed resident`}>
      <primitive object={resident} />
    </group>
  );
}

function DetailedResidents({
  center,
  culture,
  count,
  locationId,
  navigation,
}: {
  center: readonly [number, number];
  culture: Culture;
  count: number;
  locationId: string;
  navigation: NavigationField;
}) {
  return (
    <group name={`${culture} close-detail residents`}>
      {Array.from({ length: count }, (_, index) => (
        <DetailedResident
          key={index}
          center={center}
          culture={culture}
          index={index}
          locationId={locationId}
          navigation={navigation}
        />
      ))}
    </group>
  );
}

function ActiveLivingPopulation({
  location,
  detailLevel,
  viewportWidth,
}: {
  location: WorldLocation;
  detailLevel: DetailLevel;
  viewportWidth: number;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const [portraitInspection, setPortraitInspection] = useState(false);
  useEffect(() => {
    const startPortrait = () => setPortraitInspection(true);
    const endPortrait = () => setPortraitInspection(false);
    window.addEventListener("atlas:inspect-residents", startPortrait);
    window.addEventListener("atlas:inspect-city", endPortrait);
    window.addEventListener("atlas:end-inspection", endPortrait);
    return () => {
      window.removeEventListener("atlas:inspect-residents", startPortrait);
      window.removeEventListener("atlas:inspect-city", endPortrait);
      window.removeEventListener("atlas:end-inspection", endPortrait);
    };
  }, []);
  const fallbackLocation = location;
  const closeDetail = true;
  const center = useMemo(
    () =>
      [
        fallbackLocation.coordinates.x,
        fallbackLocation.coordinates.z,
      ] as const,
    [fallbackLocation],
  );
  const profile = useMemo(
    () => cityProfile(fallbackLocation.id, fallbackLocation.culture),
    [fallbackLocation],
  );
  const layout = useMemo(
    () =>
      closeDetail
        ? createDistrictLayout(
            profile,
            fallbackLocation.id,
            center,
            detailLevel,
            viewportWidth,
          )
        : { buildings: [], modules: [] },
    [
      center,
      closeDetail,
      detailLevel,
      fallbackLocation.id,
      profile,
      viewportWidth,
    ],
  );
  const landmarkObstacles = useMemo(() => {
    if (
      !closeDetail ||
      !fallbackLocation.modelRoot ||
      (fallbackLocation.id === "shattered-plains" &&
        detailLevel === "street")
    ) {
      return [];
    }
    return landmarkNavigationObstacles(
      scene,
      fallbackLocation.modelRoot,
      center,
      landmarkLocalScale(fallbackLocation.modelRoot, profile),
      landmarkRotationY(fallbackLocation.id),
    );
  }, [
    center,
    closeDetail,
    detailLevel,
    fallbackLocation.id,
    fallbackLocation.modelRoot,
    profile,
    scene,
  ]);
  const navigation = useMemo(
    () =>
      createNavigationField(
        fallbackLocation.id,
        profile,
        center,
        layout,
        landmarkObstacles,
      ),
    [center, fallbackLocation.id, landmarkObstacles, layout, profile],
  );

  const streetCast =
    location.id === "kharbranth" &&
    detailLevel === "street" &&
    portraitInspection ? (
      <KharbranthStreetCast center={center} />
    ) : null;

  if (navigation.routes.length === 0) return streetCast;

  const desktopCount = detailLevel === "street" ? 118 : 72;
  const count = Math.round(desktopCount * (viewportWidth < 720 ? 0.62 : 1));
  const detailedCount =
    detailLevel === "street"
      ? viewportWidth < 720
        ? 5
        : 10
      : viewportWidth < 720
        ? 3
        : 6;
  return (
    <>
      {!portraitInspection && (
        <>
          <ArticulatedResidents
            key={`${location.id}-${count}`}
            center={center}
            culture={location.culture}
            count={count}
            locationId={location.id}
            navigation={navigation}
          />
          <DetailedResidents
            center={center}
            culture={location.culture}
            count={detailedCount}
            locationId={location.id}
            navigation={navigation}
          />
        </>
      )}
      {streetCast}
    </>
  );
}

export function LivingPopulation() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const viewportWidth = useThree((state) => state.size.width);
  const location = locationById.get(selectedId);

  if (
    !location ||
    location.id === "roshar" ||
    (detailLevel !== "city" && detailLevel !== "street")
  ) {
    return null;
  }

  return (
    <ActiveLivingPopulation
      location={location}
      detailLevel={detailLevel}
      viewportWidth={viewportWidth}
    />
  );
}
