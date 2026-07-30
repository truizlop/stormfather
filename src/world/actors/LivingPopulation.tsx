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
import {
  landmarkAssetUrl,
  LANDMARK_RUNTIME_KIT_URL,
} from "../assets/landmarkAssets";
import { locationById } from "../locations";
import { metersToLocal } from "../scale";
import { localSurfaceY } from "../terrain/localSurface";
import { detailedLocationSurface } from "../terrain/locationSurface";
import type { Culture, DetailLevel, WorldLocation } from "../types";
import { stormProximity, stormXAtTime } from "../weather/storm";
import { createDistrictLayout } from "../cities/districtLayout";
import { localCityPresenceId } from "../cities/progressiveLod";
import {
  kharbranthRoadOffset,
  landmarkLocalScale,
  landmarkRotationY,
} from "../cities/landmarkMetrics";
import { cityProfile } from "../cities/profiles";
import { detailedActorLocalScale } from "./humanScale";
import { occupationsFor, type Occupation } from "./occupations";
import {
  createCrowdSeparationWorkspace,
  createNavigationField,
  isNavigationPositionValid,
  landmarkNavigationObstacles,
  resolveCrowdSeparationInPlace,
  sampleNavigationRouteInto,
  type NavigationField,
  type NavigationPoint,
  type NavigationPose,
} from "./pedestrianNavigation";
import {
  createBalancedPopulationRouteAssignments,
  detailedPopulationLaneOffset,
  type PopulationRouteAssignment,
} from "./populationRoutes";
import {
  createResidentVariation,
  cultureDressProfiles,
  movementGaitMultiplier,
  movementSpeedMultiplier,
  residentMovementState,
  type ResidentMovementState,
} from "./residentVariation";

interface ResidentSeed extends PopulationRouteAssignment {
  speedMetersPerSecond: number;
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

interface ResidentMotion {
  routePose: NavigationPose;
  cycle: number;
  movement: ResidentMovementState;
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
  assignments,
  center,
  culture,
  locationId,
  navigation,
}: {
  assignments: readonly PopulationRouteAssignment[];
  center: readonly [number, number];
  culture: Culture;
  locationId: string;
  navigation: NavigationField;
}) {
  const count = assignments.length;
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
  useEffect(() => () => clothTexture.dispose(), [clothTexture]);
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
          ...assignments[index],
          speedMetersPerSecond: 1.05 + ((index * 17) % 31) / 50,
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
    [assignments, count, culture, locationId, occupations],
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
  const refList = useMemo(
    () => [
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
    ],
    [],
  );
  const motionRef = useRef<ResidentMotion[]>(
    Array.from({ length: count }, () => ({
      routePose: { x: 0, z: 0, heading: 0 },
      cycle: 0,
      movement: "walking",
    })),
  );
  const separatedRef = useRef<NavigationPoint[]>(
    Array.from({ length: count }, () => ({ x: 0, z: 0 })),
  );
  const separationWorkspaceRef = useRef(
    createCrowdSeparationWorkspace(count),
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
      refList.some((ref) => !ref.current) ||
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
    const motion = motionRef.current;
    const separated = separatedRef.current;
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      const route =
        navigation.routes[seed.routeIndex];
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
      const activeProgress = workingInPlace
        ? THREE.MathUtils.clamp(
            seed.activityProgress +
              Math.sin(elapsed * 0.42 + seed.phase * 7) *
                (movement === "working" ? 0.022 : 0.012),
            0.03,
            0.97,
          )
        : pingPong;
      const routeProgress = THREE.MathUtils.lerp(
        activeProgress,
        seed.shelterProgress,
        shelter,
      );
      const residentMotion = motion[index];
      sampleNavigationRouteInto(
        route,
        routeProgress,
        residentMotion.routePose,
      );
      residentMotion.cycle = cycle;
      residentMotion.movement = movement;
      separated[index].x = residentMotion.routePose.x;
      separated[index].z = residentMotion.routePose.z;
    }
    resolveCrowdSeparationInPlace(
      separated,
      navigation,
      separationWorkspaceRef.current,
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

    refList.forEach((ref) => {
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
    material.userData.kharbranthResidentOwned = true;
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
  const texture = useMemo(() => {
    const texture = clothSource.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5.5, 5.5);
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [clothSource]);
  useEffect(
    () => () => {
      if (texture !== clothSource) texture.dispose();
    },
    [clothSource, texture],
  );
  return texture;
}

function useKharbranthSkinSurface() {
  const skinSource = useTexture(
    `${import.meta.env.BASE_URL}textures/rosharan-skin-microdetail.png`,
  );
  const texture = useMemo(() => {
    const texture = skinSource.clone();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [skinSource]);
  useEffect(
    () => () => {
      if (texture !== skinSource) texture.dispose();
    },
    [skinSource, texture],
  );
  return texture;
}

function disposeKharbranthActorMaterials(actor: THREE.Object3D | null) {
  actor?.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const material of materials) {
      if (material.userData.kharbranthResidentOwned) material.dispose();
    }
  });
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
  const { scene } = useGLTF(LANDMARK_RUNTIME_KIT_URL);
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
  useEffect(
    () => () => disposeKharbranthActorMaterials(actor),
    [actor],
  );
  const lowerRoadZ = center[1] + kharbranthRoadOffset(0);
  const baseY = localSurfaceY("kharbranth", center[0], lowerRoadZ);
  const standingY = baseY + 0.04;
  const xOffset = [-0.22, 0, 0.22][index];
  const zOffset = [1.1, 1.105, 1.1][index];

  useFrame(() => {
    if (!group.current) return;
    const elapsed = useAtlasStore.getState().simulationTime;
    const pace = Math.sin(elapsed * (1.4 + index * 0.07) + index * 1.31);
    group.current.position.y = standingY + Math.abs(pace) * 0.0025;
    group.current.rotation.z = pace * 0.012;
  });

  if (!actor) return null;
  return (
    <group
      ref={group}
      position={[center[0] + xOffset, standingY, lowerRoadZ + zOffset]}
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
  const [plasterSource, stoneSource] = useTexture([
    `${import.meta.env.BASE_URL}textures/kharbranth-plaster-realistic.jpg`,
    `${import.meta.env.BASE_URL}textures/kharbranth-stone-realistic.jpg`,
  ]);
  const [plaster, stone] = useMemo(
    () =>
      [plasterSource, stoneSource].map((source, index) => {
        const texture = source.clone();
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(index === 0 ? 2.2 : 3.4, index === 0 ? 1.5 : 2.2);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        texture.needsUpdate = true;
        return texture;
      }) as [THREE.Texture, THREE.Texture],
    [plasterSource, stoneSource],
  );
  useEffect(
    () => () => {
      plaster.dispose();
      stone.dispose();
    },
    [plaster, stone],
  );
  const lowerRoadZ = center[1] + kharbranthRoadOffset(0);
  const baseY = localSurfaceY("kharbranth", center[0], lowerRoadZ);
  return (
    <group name="Kharbranth close inspection cast">
      <mesh
        name="Kharbranth lower-market retaining wall"
        position={[center[0], baseY + 0.155, lowerRoadZ + 0.96]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[1.38, 0.34, 0.18]} />
        <meshStandardMaterial
          map={plaster}
          color="#918576"
          roughness={0.94}
          metalness={0}
        />
      </mesh>
      <mesh
        name="Kharbranth market wall footing"
        position={[center[0], baseY + 0.005, lowerRoadZ + 1.02]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[1.48, 0.1, 0.28]} />
        <meshStandardMaterial
          map={stone}
          color="#686966"
          roughness={0.97}
          metalness={0.01}
        />
      </mesh>
      {[-0.62, 0.62].map((xOffset) => (
        <mesh
          key={`market-buttress-${xOffset}`}
          name="Kharbranth market wall storm buttress"
          position={[
            center[0] + xOffset,
            baseY + 0.17,
            lowerRoadZ + 1.08,
          ]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[0.12, 0.36, 0.22]} />
          <meshStandardMaterial
            map={stone}
            color="#6e706d"
            roughness={0.96}
            metalness={0.01}
          />
        </mesh>
      ))}
      <mesh
        name="Kharbranth market wall cornice"
        position={[center[0], baseY + 0.32, lowerRoadZ + 1.08]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[1.48, 0.065, 0.24]} />
        <meshStandardMaterial
          map={stone}
          color="#74736d"
          roughness={0.94}
          metalness={0.015}
        />
      </mesh>
      {[-0.4, 0.4].map((xOffset) => (
        <mesh
          key={`market-shutter-${xOffset}`}
          name="Kharbranth stormwood market shutter"
          position={[
            center[0] + xOffset,
            baseY + 0.19,
            lowerRoadZ + 1.058,
          ]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[0.2, 0.16, 0.035]} />
          <meshStandardMaterial
            color="#4f3728"
            roughness={0.88}
            metalness={0.015}
          />
        </mesh>
      ))}
      <pointLight
        position={[center[0] - 0.34, baseY + 0.29, lowerRoadZ + 1.38]}
        color="#ffd4aa"
        intensity={0.78}
        distance={1.8}
        decay={2}
      />
      <pointLight
        position={[center[0] + 0.34, baseY + 0.25, lowerRoadZ + 1.22]}
        color="#8fc8d0"
        intensity={0.42}
        distance={1.6}
        decay={2}
      />
      <mesh
        name="Kharbranth lower quay market foundation"
        position={[center[0], baseY - 0.09, lowerRoadZ + 1.28]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[1.42, 0.2, 0.62]} />
        <meshStandardMaterial
          map={stone}
          color="#626765"
          roughness={0.97}
          metalness={0.01}
        />
      </mesh>
      <mesh
        name="Kharbranth lower quay inspection promenade"
        position={[center[0], baseY + 0.018, lowerRoadZ + 1.28]}
        receiveShadow
      >
        <boxGeometry args={[1.36, 0.035, 0.58]} />
        <meshStandardMaterial
          map={stone}
          color="#777a75"
          roughness={0.95}
          metalness={0.01}
        />
      </mesh>
      <mesh
        name="Kharbranth market awning"
        position={[center[0], baseY + 0.38, lowerRoadZ + 1.13]}
        rotation-x={-0.08}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[1.04, 0.015, 0.18]} />
        <meshStandardMaterial
          color="#7d4b42"
          roughness={0.9}
          metalness={0}
        />
      </mesh>
      {[-0.56, 0.56].map((xOffset) => (
        <mesh
          key={`awning-post-${xOffset}`}
          name="Kharbranth market awning post"
          position={[
            center[0] + xOffset,
            baseY + 0.19,
            lowerRoadZ + 1.2,
          ]}
          castShadow
        >
          <cylinderGeometry args={[0.014, 0.019, 0.38, 8]} />
          <meshStandardMaterial
            color="#4c3528"
            roughness={0.87}
            metalness={0.02}
          />
        </mesh>
      ))}
      <mesh
        name="Kharbranth quay parapet"
        position={[center[0], baseY + 0.022, lowerRoadZ + 1.57]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[1.42, 0.055, 0.08]} />
        <meshStandardMaterial
          map={stone}
          color="#666b69"
          roughness={0.96}
          metalness={0.01}
        />
      </mesh>
      {[-0.48, 0.48].map((xOffset, index) => (
        <group
          key={`market-cargo-${xOffset}`}
          position={[
            center[0] + xOffset,
            baseY + 0.075,
            lowerRoadZ + 1.25 + index * 0.06,
          ]}
          rotation-y={index === 0 ? 0.16 : -0.13}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.15, 0.075, 0.14]} />
            <meshStandardMaterial
              color={index === 0 ? "#59412f" : "#7a6244"}
              roughness={0.9}
              metalness={0.01}
            />
          </mesh>
          <mesh position={[0, 0.048, 0]} castShadow>
            <torusGeometry args={[0.038, 0.008, 8, 16]} />
            <meshStandardMaterial
              color="#a17a43"
              roughness={0.68}
              metalness={0.48}
            />
          </mesh>
        </group>
      ))}
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
  assignment,
  center,
  clothSurface,
  culture,
  index,
  locationId,
  navigation,
  skinSurface,
}: {
  assignment: PopulationRouteAssignment;
  center: readonly [number, number];
  clothSurface?: THREE.Texture;
  culture: Culture;
  index: number;
  locationId: string;
  navigation: NavigationField;
  skinSurface?: THREE.Texture;
}) {
  const group = useRef<THREE.Group>(null);
  const routePoseRef = useRef<NavigationPose>({
    x: 0,
    z: 0,
    heading: 0,
  });
  const lanePoseRef = useRef<NavigationPoint>({ x: 0, z: 0 });
  const { scene } = useGLTF(LANDMARK_RUNTIME_KIT_URL);
  const kharbranthResident = locationId === "kharbranth";
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
        if (kharbranthResident && clothSurface && skinSurface) {
          refineKharbranthActorMesh(mesh, clothSurface, skinSurface);
        } else {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    });
    return copy;
  }, [
    clothSurface,
    culture,
    index,
    kharbranthResident,
    locationId,
    scene,
    skinSurface,
  ]);
  useEffect(
    () => () => {
      if (kharbranthResident) {
        disposeKharbranthActorMaterials(resident);
      }
    },
    [kharbranthResident, resident],
  );

  useFrame(() => {
    if (!group.current) return;
    const state = useAtlasStore.getState();
    const proximity = stormProximity(
      stormXAtTime(state.simulationTime),
      center[0],
    );
    const route = navigation.routes[assignment.routeIndex];
    if (!route) return;
    const walkingSpeed = 1.08 + (index % 4) * 0.12;
    const routeSpeed = metersToLocal(walkingSpeed) / route.length;
    const hurry = 1 + proximity * 2.8;
    const cycle =
      (state.simulationTime * routeSpeed * hurry + assignment.phase) % 2;
    const progress = cycle < 1 ? cycle : 2 - cycle;
    const shelter = THREE.MathUtils.smoothstep(proximity, 0.34, 0.94);
    const routeProgress = THREE.MathUtils.lerp(
      progress,
      assignment.shelterProgress,
      shelter,
    );
    const routePose = routePoseRef.current;
    const lanePose = lanePoseRef.current;
    sampleNavigationRouteInto(route, routeProgress, routePose);
    const laneOffset = detailedPopulationLaneOffset(
      assignment.routeSlot,
    );
    lanePose.x = routePose.x + Math.cos(routePose.heading) * laneOffset;
    lanePose.z = routePose.z - Math.sin(routePose.heading) * laneOffset;
    let laneIsValid = isNavigationPositionValid(navigation, lanePose);
    if (!laneIsValid) {
      lanePose.x = routePose.x - Math.cos(routePose.heading) * laneOffset;
      lanePose.z = routePose.z + Math.sin(routePose.heading) * laneOffset;
      laneIsValid = isNavigationPositionValid(navigation, lanePose);
    }
    const placement = laneIsValid ? lanePose : routePose;
    const gait = Math.sin(state.simulationTime * 7.2 + index * 1.7);
    group.current.position.set(
      placement.x,
      localSurfaceY(locationId, placement.x, placement.z) +
        Math.abs(gait) * 0.003,
      placement.z,
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

function KharbranthDetailedResident(
  props: Omit<
    Parameters<typeof DetailedResident>[0],
    "clothSurface" | "skinSurface"
  >,
) {
  const clothSurface = useKharbranthClothSurface();
  const skinSurface = useKharbranthSkinSurface();
  return (
    <DetailedResident
      {...props}
      clothSurface={clothSurface}
      skinSurface={skinSurface}
    />
  );
}

function DetailedResidents({
  assignments,
  center,
  culture,
  locationId,
  navigation,
}: {
  assignments: readonly PopulationRouteAssignment[];
  center: readonly [number, number];
  culture: Culture;
  locationId: string;
  navigation: NavigationField;
}) {
  return (
    <group name={`${culture} close-detail residents`}>
      {assignments.map((assignment, index) => {
        const props = {
          assignment,
          center,
          culture,
          index,
          locationId,
          navigation,
        };
        return locationId === "kharbranth" ? (
          <KharbranthDetailedResident key={index} {...props} />
        ) : (
          <DetailedResident key={index} {...props} />
        );
      })}
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
  const { scene } = useGLTF(landmarkAssetUrl(location.modelRoot!));
  const [portraitInspection, setPortraitInspection] = useState(
    () => location.id === "kharbranth" && detailLevel === "street",
  );
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
      !fallbackLocation.modelRoot
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
    fallbackLocation.id,
    fallbackLocation.modelRoot,
    profile,
    scene,
  ]);
  const navigationSurface = useMemo(() => {
    const surface = detailedLocationSurface(fallbackLocation.id);
    if (!surface) return undefined;
    return {
      isWalkable: ({ x, z }: { x: number; z: number }) =>
        surface.containsWalkablePoint(x, z, "pedestrian"),
      heightAt: ({ x, z }: { x: number; z: number }) =>
        surface.walkableY(x, z, "pedestrian"),
      maximumStepHeight: surface.maximumStepHeight,
      maximumSlope: surface.maximumWalkSlope,
    };
  }, [fallbackLocation.id]);
  const navigation = useMemo(
    () =>
      createNavigationField(
        fallbackLocation.id,
        profile,
        center,
        layout,
        landmarkObstacles,
        navigationSurface,
      ),
    [
      center,
      fallbackLocation.id,
      landmarkObstacles,
      layout,
      navigationSurface,
      profile,
    ],
  );
  const desktopCount = detailLevel === "street" ? 118 : 72;
  const populationCount = Math.round(
    desktopCount * (viewportWidth < 720 ? 0.62 : 1),
  );
  const detailedCount =
    detailLevel === "street"
      ? viewportWidth < 720
        ? 5
        : 10
      : viewportWidth < 720
        ? 3
        : 6;
  const articulatedCount = Math.max(0, populationCount - detailedCount);
  const populationAssignments = useMemo(
    () =>
      createBalancedPopulationRouteAssignments(
        populationCount,
        navigation.routes.length,
        fallbackLocation.id,
      ),
    [fallbackLocation.id, navigation.routes.length, populationCount],
  );
  const articulatedAssignments = useMemo(
    () => populationAssignments.slice(0, articulatedCount),
    [articulatedCount, populationAssignments],
  );
  const detailedAssignments = useMemo(
    () => populationAssignments.slice(articulatedCount),
    [articulatedCount, populationAssignments],
  );

  const streetCast =
    location.id === "kharbranth" &&
    detailLevel === "street" &&
    portraitInspection ? (
      <KharbranthStreetCast center={center} />
    ) : null;

  if (navigation.routes.length === 0) return streetCast;

  return (
    <>
      {!portraitInspection && (
        <>
          <ArticulatedResidents
            key={`${location.id}-${articulatedAssignments.length}`}
            assignments={articulatedAssignments}
            center={center}
            culture={location.culture}
            locationId={location.id}
            navigation={navigation}
          />
          <DetailedResidents
            assignments={detailedAssignments}
            center={center}
            culture={location.culture}
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
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const viewportWidth = useThree((state) => state.size.width);
  const activeLocationId = localCityPresenceId(
    detailLevel,
    proximityLocationId,
  );
  const location = activeLocationId
    ? locationById.get(activeLocationId)
    : undefined;

  if (!location) {
    return null;
  }

  return (
    <ActiveLivingPopulation
      key={`${location.id}-${detailLevel === "street" ? "street" : "city"}`}
      location={location}
      detailLevel={detailLevel}
      viewportWidth={viewportWidth}
    />
  );
}
