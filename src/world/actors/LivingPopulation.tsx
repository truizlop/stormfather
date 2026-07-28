import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import { metersToLocal } from "../scale";
import { localSurfaceY } from "../terrain/localSurface";
import type { Culture } from "../types";
import { stormProximity, stormXAtTime } from "../weather/storm";
import { createDistrictLayout } from "../cities/districtLayout";
import { landmarkLocalScale } from "../cities/landmarkMetrics";
import { cityProfile } from "../cities/profiles";
import {
  detailedActorLocalScale,
  residentHeightMeters,
} from "./humanScale";
import { occupationsFor, type Occupation } from "./occupations";
import {
  createNavigationField,
  landmarkNavigationObstacles,
  resolveCrowdSeparation,
  sampleNavigationRoute,
  type NavigationField,
} from "./pedestrianNavigation";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

interface CulturePalette {
  cloth: readonly string[];
  skin: readonly string[];
  accent: readonly string[];
  marbling?: string;
}

const culturePalette: Record<Culture, CulturePalette> = {
  alethi: {
    cloth: ["#173d73", "#284f75", "#6d3f30", "#8d713d", "#27353b"],
    skin: ["#5b321f", "#704026", "#8a5536", "#9d6744"],
    accent: ["#d1a24d", "#91b8bd", "#be7658"],
  },
  azish: {
    cloth: ["#6b214f", "#4b2b69", "#7e542c", "#173f51", "#d0b887"],
    skin: ["#28130d", "#3a1b12", "#542a1a", "#6a3924"],
    accent: ["#d6b25c", "#a779a4", "#6fb0ac"],
  },
  shin: {
    cloth: ["#d3c3a2", "#846b4d", "#718052", "#9b6b54"],
    skin: ["#b98263", "#d1a889", "#e0bd9d"],
    accent: ["#8fae62", "#b97d4e", "#725e46"],
  },
  veden: {
    cloth: ["#7e2f2f", "#5c343c", "#3b4f68", "#92724e"],
    skin: ["#704129", "#8a4f33", "#9d6645"],
    accent: ["#d39c62", "#6fa0a2", "#c4a45c"],
  },
  singer: {
    cloth: ["#762a22", "#3a302b", "#8a593e", "#253c41"],
    skin: ["#be3b2a", "#e4d0be", "#8f2e25"],
    accent: ["#1d1716", "#d4b8a1", "#70463b"],
    marbling: "#241818",
  },
  thaylen: {
    cloth: ["#46545a", "#2e6267", "#76533d", "#8a785c"],
    skin: ["#7e4c34", "#9b6342", "#b17651"],
    accent: ["#d8d3c7", "#b69a64", "#6d9492"],
  },
  purelaker: {
    cloth: ["#16737b", "#2f8990", "#a15a36", "#c49a44", "#424e43"],
    skin: ["#7f472c", "#9c603a", "#b87950"],
    accent: ["#e0bb57", "#7ec5b9", "#cf694b"],
  },
  aimian: {
    cloth: ["#44666d", "#4c596b", "#6a6655"],
    skin: ["#668aa6", "#78a2ba", "#53758f"],
    accent: ["#8bd3dc", "#c0b482", "#6b8d93"],
    marbling: "#23434f",
  },
  reshi: {
    cloth: ["#596836", "#3d6f62", "#8c6038", "#a88a48"],
    skin: ["#75472f", "#936047", "#ad7958"],
    accent: ["#9bb66a", "#d8ad52", "#72aaa1"],
  },
};

interface ResidentSeed {
  routeIndex: number;
  speedMetersPerSecond: number;
  phase: number;
  heightUnits: number;
  occupation: Occupation;
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
  marbling: RefObject<THREE.InstancedMesh | null>;
}

function propScale(occupation: Occupation) {
  switch (occupation) {
    case "porter":
      return [
        metersToLocal(0.46),
        metersToLocal(0.38),
        metersToLocal(0.5),
      ] as const;
    case "guard":
    case "fisher":
      return [
        metersToLocal(0.045),
        metersToLocal(1.5),
        metersToLocal(0.045),
      ] as const;
    case "scribe":
      return [
        metersToLocal(0.34),
        metersToLocal(0.045),
        metersToLocal(0.46),
      ] as const;
    case "builder":
      return [
        metersToLocal(0.18),
        metersToLocal(0.62),
        metersToLocal(0.1),
      ] as const;
    case "merchant":
    case "sailor":
      return [
        metersToLocal(0.4),
        metersToLocal(0.32),
        metersToLocal(0.4),
      ] as const;
    case "surgeon":
      return [
        metersToLocal(0.29),
        metersToLocal(0.14),
        metersToLocal(0.36),
      ] as const;
    case "farmer":
      return [
        metersToLocal(0.07),
        metersToLocal(1.28),
        metersToLocal(0.07),
      ] as const;
    default:
      return [0.0001, 0.0001, 0.0001] as const;
  }
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
  const palette = culturePalette[culture];
  const occupations = useMemo(
    () => occupationsFor(locationId, culture),
    [culture, locationId],
  );
  const seeds = useMemo<ResidentSeed[]>(
    () =>
      Array.from({ length: count }, (_, index) => ({
        routeIndex: (index * 5 + locationId.length) % 10,
        speedMetersPerSecond: 1.05 + ((index * 17) % 31) / 50,
        phase: (index * 0.618 + locationId.length * 0.071) % 2,
        heightUnits: metersToLocal(
          residentHeightMeters(culture, index, locationId.length),
        ),
        occupation: occupations[index % occupations.length],
        cloth: new THREE.Color(palette.cloth[index % palette.cloth.length]),
        skin: new THREE.Color(palette.skin[(index * 3 + 1) % palette.skin.length]),
        accent: new THREE.Color(
          palette.accent[(index * 5 + 2) % palette.accent.length],
        ),
      })),
    [count, culture, locationId, occupations, palette],
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
      marbling,
    }),
    [],
  );

  useLayoutEffect(() => {
    const meshes = Object.values(refs)
      .map((ref) => ref.current)
      .filter((mesh): mesh is THREE.InstancedMesh => Boolean(mesh));
    if (meshes.length !== Object.keys(refs).length) return;
    const darkMarble = new THREE.Color(palette.marbling ?? "#2a1b18");
    seeds.forEach((seed, index) => {
      torso.current!.setColorAt(index, seed.cloth);
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
  }, [palette.marbling, refs, seeds]);

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
    const motion = seeds.map((seed) => {
      const route =
        navigation.routes[seed.routeIndex % navigation.routes.length];
      const routeSpeed =
        metersToLocal(seed.speedMetersPerSecond) / route.length;
      const cycle = (elapsed * routeSpeed * hurry + seed.phase) % 2;
      const pingPong = cycle < 1 ? cycle : 2 - cycle;
      const routeProgress = THREE.MathUtils.lerp(
        pingPong,
        0.035 + (seed.routeIndex % 3) * 0.012,
        shelter,
      );
      const routePose = sampleNavigationRoute(route, routeProgress);
      return { routePose, cycle };
    });
    const separated = resolveCrowdSeparation(
      motion.map(({ routePose }) => ({
        x: routePose.x,
        z: routePose.z,
      })),
      navigation,
    );
    seeds.forEach((seed, index) => {
      const { routePose, cycle } = motion[index];
      const x = separated[index].x;
      const z = separated[index].z;
      const facing =
        routePose.heading + (cycle < 1 ? 0 : Math.PI);
      const forwardX = Math.sin(facing);
      const forwardZ = Math.cos(facing);
      const rightX = Math.cos(facing);
      const rightZ = -Math.sin(facing);
      const gait =
        Math.sin(
          elapsed * (6.5 + seed.speedMetersPerSecond * 2.2) * hurry +
            seed.phase * 8,
        ) *
        (seed.occupation === "scribe" || seed.occupation === "merchant" ? 0.35 : 1);
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
        [humanHeight * 0.14, humanHeight * 0.2, humanHeight * 0.095],
        [lean, facing, 0],
      );
      setPart(
        heads.current!,
        dummy,
        index,
        [x, feetY + humanHeight * 0.89, z],
        [humanHeight * 0.105, humanHeight * 0.11, humanHeight * 0.105],
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
            feetY + humanHeight * 0.21,
            z + side * rightZ * humanHeight * 0.064,
          ],
          [humanHeight * 0.045, humanHeight * 0.21, humanHeight * 0.052],
          [side * gait * 0.46, facing, 0],
        );
      }
      for (const [side, mesh] of [
        [-1, leftArms.current!],
        [1, rightArms.current!],
      ] as const) {
        const workGesture =
          seed.occupation === "builder" ||
          seed.occupation === "fisher" ||
          seed.occupation === "farmer"
            ? Math.sin(elapsed * 2.6 + seed.phase * 7) * 0.55
            : -side * gait * 0.42;
        setPart(
          mesh,
          dummy,
          index,
          [
            x + side * rightX * humanHeight * 0.18,
            feetY + humanHeight * 0.6,
            z + side * rightZ * humanHeight * 0.18,
          ],
          [humanHeight * 0.035, humanHeight * 0.19, humanHeight * 0.042],
          [workGesture + lean, facing, side * 0.12],
        );
      }

      const pScale = propScale(seed.occupation);
      const propY =
        seed.occupation === "guard" ||
        seed.occupation === "fisher" ||
        seed.occupation === "farmer"
          ? feetY + humanHeight * 0.48
          : feetY + humanHeight * 0.56;
      setPart(
        props.current!,
        dummy,
        index,
        [
          x + forwardX * humanHeight * 0.24,
          propY,
          z + forwardZ * humanHeight * 0.24,
        ],
        pScale,
        [seed.occupation === "builder" ? gait * 0.7 : 0, facing, 0],
      );

      const hasHat =
        culture === "purelaker" ||
        culture === "azish" ||
        culture === "thaylen" ||
        seed.occupation === "surgeon";
      setPart(
        hats.current!,
        dummy,
        index,
        [x, feetY + humanHeight * 1.01, z],
        hasHat
          ? [
              humanHeight * 0.17,
              humanHeight * 0.085,
              humanHeight * 0.17,
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
        palette.marbling
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
  const resident = useMemo(() => {
    const source = scene.getObjectByName(detailedActorRoot[culture]);
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
  }, [culture, scene]);

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

export function LivingPopulation() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const viewportWidth = useThree((state) => state.size.width);
  const { scene } = useGLTF(MODEL_URL);
  const location = locationById.get(selectedId);
  const fallbackLocation = location ?? locationById.get("kholinar")!;
  const closeDetail =
    Boolean(location) &&
    fallbackLocation.id !== "roshar" &&
    (detailLevel === "city" || detailLevel === "street");
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

  if (!closeDetail || !location || navigation.routes.length === 0) return null;

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
  );
}

useGLTF.preload(MODEL_URL);
