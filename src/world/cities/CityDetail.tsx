import { useGLTF, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import { useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import { cityProfile, type CityProfile } from "./profiles";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

interface BuildingSeed {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  color: THREE.Color;
  roofColor: THREE.Color;
  lit: boolean;
}

function configureTexture(texture: THREE.Texture, repeat: number) {
  const copy = texture.clone();
  copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
  copy.repeat.set(repeat, repeat);
  copy.colorSpace = THREE.SRGBColorSpace;
  copy.anisotropy = 8;
  copy.needsUpdate = true;
  return copy;
}

function districtSurfaceY(locationId: string) {
  if (locationId === "shattered-plains") return 1.91;
  if (locationId === "purelake") return 1.37;
  if (locationId === "aimia") return 0.52;
  return 1.3;
}

function buildingSeeds(
  profile: CityProfile,
  locationId: string,
  center: readonly [number, number],
  count: number,
) {
  const [minHeight, maxHeight] = profile.height;
  const [minFootprint, maxFootprint] = profile.footprint;
  const baseY = districtSurfaceY(locationId);
  return Array.from({ length: count }, (_, index): BuildingSeed => {
    const angle = index * 2.399963 + (locationId.length % 9) * 0.17;
    const normalized = ((index * 41 + locationId.length * 13) % 101) / 100;
    const radius =
      0.72 + Math.sqrt(normalized) * (profile.radius - 0.72);
    const width =
      minFootprint +
      (((index * 17 + 3) % 23) / 22) * (maxFootprint - minFootprint);
    const depth =
      minFootprint +
      (((index * 11 + 7) % 19) / 18) * (maxFootprint - minFootprint);
    const height =
      minHeight +
      (((index * 29 + 5) % 31) / 30) * (maxHeight - minHeight);
    let x = center[0] + Math.cos(angle) * radius;
    let z = center[1] + Math.sin(angle) * radius * 0.72;
    let y = baseY;

    if (locationId === "kharbranth") {
      const terrace = index % 7;
      z = center[1] - 2.65 + terrace * 0.82 + ((index % 3) - 1) * 0.08;
      x = center[0] + Math.cos(angle) * (1.1 + (index % 8) * 0.52);
      y += terrace * 0.11;
    } else if (locationId === "purelake") {
      y += 0.1;
    } else if (locationId === "shattered-plains") {
      x = center[0] - 3.7 + (index % 8) * 0.52;
      z = center[1] - 2.4 + Math.floor(index / 8) * 0.56;
    }

    return {
      x,
      y,
      z,
      width,
      depth,
      height,
      rotation: angle + ((index % 5) - 2) * 0.06,
      color: new THREE.Color(profile.palette[index % profile.palette.length]),
      roofColor: new THREE.Color(
        profile.roofPalette[(index * 3 + 1) % profile.roofPalette.length],
      ),
      lit: index % 4 === 0 || index % 9 === 0,
    };
  });
}

function RoofGeometry({ style }: { style: CityProfile["roof"] }) {
  if (style === "dome") return <sphereGeometry args={[1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2]} />;
  if (style === "flat" || style === "ruin") return <boxGeometry args={[1, 1, 1]} />;
  return <coneGeometry args={[1, 1, style === "pitched" ? 4 : 7]} />;
}

function InstancedArchitecture({
  seeds,
  profile,
  locationId,
}: {
  seeds: readonly BuildingSeed[];
  profile: CityProfile;
  locationId: string;
}) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const [plasterSource, stoneSource] = useTexture([
    `${import.meta.env.BASE_URL}textures/kharbranth-plaster-albedo.jpg`,
    `${import.meta.env.BASE_URL}textures/crem-stone-albedo.jpg`,
  ]);
  const plaster = useMemo(
    () => configureTexture(plasterSource, 1.8),
    [plasterSource],
  );
  const stone = useMemo(
    () => configureTexture(stoneSource, 1.5),
    [stoneSource],
  );

  useLayoutEffect(() => {
    if (!bodies.current || !roofs.current || !windows.current) return;
    const dummy = new THREE.Object3D();
    const windowColor = new THREE.Color();
    seeds.forEach((seed, index) => {
      dummy.position.set(seed.x, seed.y + seed.height / 2, seed.z);
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(seed.width, seed.height, seed.depth);
      dummy.updateMatrix();
      bodies.current!.setMatrixAt(index, dummy.matrix);
      bodies.current!.setColorAt(index, seed.color);

      const roofHeight =
        profile.roof === "flat" || profile.roof === "ruin"
          ? 0.055
          : profile.roof === "dome"
            ? seed.height * 0.26
            : seed.height * 0.3;
      dummy.position.set(seed.x, seed.y + seed.height + roofHeight * 0.35, seed.z);
      dummy.rotation.set(0, seed.rotation + (profile.roof === "pitched" ? Math.PI / 4 : 0), 0);
      dummy.scale.set(
        seed.width * 0.64,
        roofHeight,
        seed.depth * 0.64,
      );
      dummy.updateMatrix();
      roofs.current!.setMatrixAt(index, dummy.matrix);
      roofs.current!.setColorAt(index, seed.roofColor);

      dummy.position.set(
        seed.x + Math.sin(seed.rotation) * (seed.depth / 2 + 0.006),
        seed.y + seed.height * 0.62,
        seed.z + Math.cos(seed.rotation) * (seed.depth / 2 + 0.006),
      );
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(seed.width * 0.22, seed.height * 0.16, 0.012);
      dummy.updateMatrix();
      windows.current!.setMatrixAt(index, dummy.matrix);
      windowColor.set(seed.lit ? "#ffd284" : "#153e46");
      windows.current!.setColorAt(index, windowColor);
    });
    for (const mesh of [bodies.current, roofs.current, windows.current]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [profile.roof, seeds]);

  const buildingTexture =
    locationId === "kharbranth" ? plaster : stone;

  return (
    <>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, seeds.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        {locationId === "kharbranth" ? (
          <meshStandardMaterial
            map={buildingTexture}
            bumpMap={buildingTexture}
            bumpScale={0.012}
            vertexColors
            roughness={0.88}
            metalness={0.02}
          />
        ) : (
          <meshLambertMaterial
            vertexColors
            emissive="#c9aa7b"
            emissiveIntensity={0.12}
            toneMapped={false}
          />
        )}
      </instancedMesh>
      <instancedMesh
        ref={roofs}
        args={[undefined, undefined, seeds.length]}
        castShadow
        receiveShadow
      >
        <RoofGeometry style={profile.roof} />
        <meshLambertMaterial
          vertexColors
          emissive="#ad835b"
          emissiveIntensity={0.11}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={windows}
        args={[undefined, undefined, seeds.length]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function DistrictGround({
  locationId,
  center,
  profile,
}: {
  locationId: string;
  center: readonly [number, number];
  profile: CityProfile;
}) {
  const pavingSource = useTexture(
    `${import.meta.env.BASE_URL}textures/shattered-paving-albedo.jpg`,
  );
  const paving = useMemo(
    () => configureTexture(pavingSource, 4.4),
    [pavingSource],
  );
  const y = districtSurfaceY(locationId) - 0.012;

  if (locationId === "kharbranth") {
    return (
      <group name="Kharbranth stepped streets">
        {Array.from({ length: 7 }, (_, terrace) => (
          <mesh
            key={terrace}
            position={[
              center[0],
              y + terrace * 0.11,
              center[1] - 2.65 + terrace * 0.82,
            ]}
            receiveShadow
          >
            <boxGeometry args={[profile.radius * 1.42, 0.028, 0.46]} />
            <meshStandardMaterial
              map={paving}
              color={terrace % 2 === 0 ? "#846d5d" : "#75645a"}
              roughness={0.9}
              metalness={0.02}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (locationId !== "shattered-plains" && locationId !== "shinovar") {
    return null;
  }

  return (
    <mesh
      position={[center[0], y, center[1]]}
      rotation-x={-Math.PI / 2}
      receiveShadow
    >
      {locationId === "shattered-plains" ? (
        <planeGeometry args={[profile.radius * 1.9, profile.radius * 1.25]} />
      ) : (
        <circleGeometry args={[profile.radius * 0.94, 64]} />
      )}
      <meshStandardMaterial
        map={paving}
        color={locationId === "shinovar" ? "#6d734f" : "#5f5c52"}
        roughness={0.86}
        metalness={0.04}
      />
    </mesh>
  );
}

function ModuleInstance({
  name,
  position,
  rotation,
  scale,
}: {
  name: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const clone = useMemo(() => {
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
  }, [name, scene]);
  if (!clone) return null;
  return (
    <group position={position} rotation-y={rotation} scale={scale}>
      <primitive object={clone} />
    </group>
  );
}

function DistrictModules({
  profile,
  center,
  locationId,
  count,
}: {
  profile: CityProfile;
  center: readonly [number, number];
  locationId: string;
  count: number;
}) {
  const baseY = districtSurfaceY(locationId);
  return (
    <>
      {Array.from({ length: count }, (_, index) => {
        const moduleName = profile.modules[index % profile.modules.length];
        const angle = index * 2.39996 + 0.6;
        const radius = 1.1 + ((index * 19) % 27) / 10;
        const x = center[0] + Math.cos(angle) * radius;
        const z = center[1] + Math.sin(angle) * radius * 0.68;
        return (
          <ModuleInstance
            key={`${moduleName}-${index}`}
            name={moduleName}
            position={[x, baseY + 0.01, z]}
            rotation={-angle + Math.PI / 2}
            scale={locationId === "purelake" ? 0.12 : 0.14}
          />
        );
      })}
    </>
  );
}

export function CityDetail() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const width = useThree((state) => state.size.width);
  const location = locationById.get(selectedId);

  const profile = useMemo(
    () =>
      location
        ? cityProfile(location.id, location.culture)
        : cityProfile("kholinar", "alethi"),
    [location],
  );
  const mobileFactor = width < 720 ? 0.62 : 1;
  const baseCount = detailLevel === "street" ? 86 : 58;
  const buildingCount = Math.round(
    baseCount * profile.density * mobileFactor,
  );
  const moduleCount = Math.max(
    3,
    Math.round((detailLevel === "street" ? 14 : 8) * mobileFactor),
  );
  const center = useMemo(
    () =>
      [
        location?.coordinates.x ?? 0,
        location?.coordinates.z ?? 0,
      ] as const,
    [location],
  );
  const seeds = useMemo(
    () =>
      location
        ? buildingSeeds(profile, location.id, center, buildingCount)
        : [],
    [buildingCount, center, location, profile],
  );

  if (
    !location ||
    location.id === "roshar" ||
    detailLevel === "continent" ||
    detailLevel === "region"
  ) {
    return null;
  }

  return (
    <group name={`${location.name} local district`}>
      <DistrictGround
        locationId={location.id}
        center={center}
        profile={profile}
      />
      <InstancedArchitecture
        seeds={seeds}
        profile={profile}
        locationId={location.id}
      />
      <DistrictModules
        profile={profile}
        center={center}
        locationId={location.id}
        count={moduleCount}
      />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
