import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import type { Culture } from "../types";
import { stormProximity, stormXAtTime } from "../weather/storm";
import { occupationsFor, type Occupation } from "./occupations";

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
  lane: number;
  routeLength: number;
  speed: number;
  phase: number;
  stature: number;
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

function surfaceY(locationId: string) {
  if (locationId === "shattered-plains") return 1.93;
  if (locationId === "purelake") return 1.39;
  if (locationId === "aimia") return 0.56;
  return 1.32;
}

function routePosition(
  locationId: string,
  center: readonly [number, number],
  seed: ResidentSeed,
  elapsed: number,
  hurry: number,
) {
  const cycle = (elapsed * seed.speed * hurry + seed.phase) % 2;
  const pingPong = cycle < 1 ? cycle : 2 - cycle;
  let x = center[0] - seed.routeLength / 2 + pingPong * seed.routeLength;
  let z = center[1] + (seed.lane - 3.5) * 0.42;

  if (locationId === "kharbranth") {
    const terrace = seed.lane % 7;
    z = center[1] - 2.55 + terrace * 0.82;
    x = center[0] - seed.routeLength / 2 + pingPong * seed.routeLength;
  } else if (locationId === "purelake") {
    const angle = pingPong * Math.PI * 2 + seed.phase;
    const radius = 1.2 + (seed.lane % 6) * 0.52;
    x = center[0] + Math.cos(angle) * radius;
    z = center[1] + Math.sin(angle) * radius * 0.68;
  } else if (locationId === "shattered-plains") {
    x = center[0] - 4.1 + pingPong * Math.min(4.6, seed.routeLength);
    z = center[1] - 2.3 + (seed.lane % 7) * 0.58;
  } else {
    const bend = Math.sin(pingPong * Math.PI) * 0.5;
    z += bend * ((seed.lane % 2) * 2 - 1);
  }
  return { x, z, forward: cycle < 1 };
}

function propScale(occupation: Occupation) {
  switch (occupation) {
    case "porter":
      return [0.038, 0.032, 0.042] as const;
    case "guard":
    case "fisher":
      return [0.005, 0.105, 0.005] as const;
    case "scribe":
      return [0.028, 0.004, 0.038] as const;
    case "builder":
      return [0.016, 0.052, 0.009] as const;
    case "merchant":
    case "sailor":
      return [0.034, 0.027, 0.034] as const;
    case "surgeon":
      return [0.024, 0.012, 0.03] as const;
    case "farmer":
      return [0.007, 0.09, 0.007] as const;
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
}: {
  center: readonly [number, number];
  culture: Culture;
  count: number;
  locationId: string;
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
        lane: (index * 5 + locationId.length) % 8,
        routeLength: 1.6 + ((index * 37) % 45) / 10,
        speed: 0.07 + ((index * 17) % 17) / 90,
        phase: (index * 0.618 + locationId.length * 0.071) % 2,
        stature: 0.82 + ((index * 29) % 34) / 100,
        occupation: occupations[index % occupations.length],
        cloth: new THREE.Color(palette.cloth[index % palette.cloth.length]),
        skin: new THREE.Color(palette.skin[(index * 3 + 1) % palette.skin.length]),
        accent: new THREE.Color(
          palette.accent[(index * 5 + 2) % palette.accent.length],
        ),
      })),
    [count, locationId, occupations, palette],
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
    if (Object.values(refs).some((ref) => !ref.current)) return;
    const state = useAtlasStore.getState();
    const elapsed = state.simulationTime;
    const stormX = stormXAtTime(state.simulationTime);
    const proximity = stormProximity(stormX, center[0]);
    const hurry = 1 + proximity * 2.8;
    const shelter = THREE.MathUtils.smoothstep(proximity, 0.34, 0.94);
    const baseY = surfaceY(locationId);

    seeds.forEach((seed, index) => {
      const route = routePosition(
        locationId,
        center,
        seed,
        elapsed,
        hurry,
      );
      let x = route.x;
      let z = route.z;
      const shelterX = center[0] - 1.5 - (seed.lane % 3) * 0.18;
      const shelterZ = center[1] + ((seed.lane % 5) - 2) * 0.2;
      x = THREE.MathUtils.lerp(x, shelterX, shelter);
      z = THREE.MathUtils.lerp(z, shelterZ, shelter);
      const direction = route.forward ? 1 : -1;
      const facing = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
      const gait =
        Math.sin(elapsed * (7 + seed.speed * 18) * hurry + seed.phase * 8) *
        (seed.occupation === "scribe" || seed.occupation === "merchant" ? 0.35 : 1);
      const bob = Math.abs(gait) * 0.0035;
      const stature = seed.stature;
      const lean = shelter * 0.28;
      const feetY =
        baseY +
        (locationId === "kharbranth" ? (seed.lane % 7) * 0.11 : 0) +
        bob;

      setPart(
        torso.current!,
        dummy,
        index,
        [x, feetY + 0.098 * stature, z],
        [0.028 * stature, 0.044 * stature, 0.021 * stature],
        [lean, facing, 0],
      );
      setPart(
        heads.current!,
        dummy,
        index,
        [x, feetY + 0.158 * stature, z],
        [0.022 * stature, 0.025 * stature, 0.022 * stature],
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
          [x + side * 0.014 * stature, feetY + 0.035 * stature, z],
          [0.009 * stature, 0.036 * stature, 0.01 * stature],
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
          [x + side * 0.039 * stature, feetY + 0.103 * stature, z],
          [0.0075 * stature, 0.035 * stature, 0.008 * stature],
          [workGesture + lean, facing, side * 0.12],
        );
      }

      const pScale = propScale(seed.occupation);
      const propY =
        seed.occupation === "guard" ||
        seed.occupation === "fisher" ||
        seed.occupation === "farmer"
          ? feetY + 0.09
          : feetY + 0.105;
      setPart(
        props.current!,
        dummy,
        index,
        [x + 0.045 * direction, propY, z - 0.01],
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
        [x, feetY + 0.184 * stature, z],
        hasHat
          ? [0.032 * stature, 0.018 * stature, 0.032 * stature]
          : [0.0001, 0.0001, 0.0001],
        [0, facing, 0],
      );

      setPart(
        marbling.current!,
        dummy,
        index,
        [x, feetY + 0.101 * stature, z - 0.022 * stature],
        palette.marbling
          ? [0.006, 0.038 * stature, 0.022 * stature]
          : [0.0001, 0.0001, 0.0001],
        [lean, facing, (index % 3 - 1) * 0.2],
      );
    });

    Object.values(refs).forEach((ref) => {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    });
  });

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

export function LivingPopulation() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const viewportWidth = useThree((state) => state.size.width);
  const location = locationById.get(selectedId);
  if (
    !location ||
    location.id === "roshar" ||
    detailLevel === "continent" ||
    detailLevel === "region"
  ) {
    return null;
  }

  const desktopCount = detailLevel === "street" ? 118 : 72;
  const count = Math.round(desktopCount * (viewportWidth < 720 ? 0.62 : 1));
  return (
    <ArticulatedResidents
      key={`${location.id}-${count}`}
      center={[location.coordinates.x, location.coordinates.z]}
      culture={location.culture}
      count={count}
      locationId={location.id}
    />
  );
}
