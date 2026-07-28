import { useGLTF, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import { useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import {
  STANDARD_DOOR_HEIGHT_METERS,
  STANDARD_DOOR_WIDTH_METERS,
  metersToLocal,
} from "../scale";
import { localSurfaceY } from "../terrain/localSurface";
import {
  createDistrictLayout,
  type BuildingSeed,
  type ModuleSeed,
} from "./districtLayout";
import {
  KHARBRANTH_LANDMARK_SCALE,
  kharbranthRoadOffset,
} from "./landmarkMetrics";
import { cityProfile, type CityProfile } from "./profiles";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

function configureTexture(texture: THREE.Texture, repeat: number) {
  const copy = texture.clone();
  copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
  copy.repeat.set(repeat, repeat);
  copy.colorSpace = THREE.SRGBColorSpace;
  copy.anisotropy = 8;
  copy.needsUpdate = true;
  return copy;
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
  const doors = useRef<THREE.InstancedMesh>(null);
  const cornices = useRef<THREE.InstancedMesh>(null);
  const balconies = useRef<THREE.InstancedMesh>(null);
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
    if (
      !bodies.current ||
      !roofs.current ||
      !windows.current ||
      !doors.current ||
      !cornices.current ||
      !balconies.current
    ) {
      return;
    }
    const dummy = new THREE.Object3D();
    const windowColor = new THREE.Color();
    seeds.forEach((seed, index) => {
      dummy.position.set(seed.x, seed.y + seed.height / 2, seed.z);
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(seed.width, seed.height, seed.depth);
      dummy.updateMatrix();
      bodies.current!.setMatrixAt(index, dummy.matrix);
      bodies.current!.setColorAt(index, new THREE.Color(seed.color));

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
      roofs.current!.setColorAt(index, new THREE.Color(seed.roofColor));

      const windowWidth = Math.min(metersToLocal(0.9), seed.width * 0.22);
      const windowHeight = Math.min(
        metersToLocal(1.15),
        seed.height * 0.18,
      );
      for (const side of [-1, 1] as const) {
        const lateral = side * seed.width * 0.23;
        dummy.position.set(
          seed.x +
            Math.cos(seed.rotation) * lateral +
            Math.sin(seed.rotation) * (seed.depth / 2 + 0.006),
          seed.y + seed.height * 0.64,
          seed.z -
            Math.sin(seed.rotation) * lateral +
            Math.cos(seed.rotation) * (seed.depth / 2 + 0.006),
        );
        dummy.rotation.set(0, seed.rotation, 0);
        dummy.scale.set(windowWidth, windowHeight, 0.012);
        dummy.updateMatrix();
        const windowIndex = index * 2 + (side === -1 ? 0 : 1);
        windows.current!.setMatrixAt(windowIndex, dummy.matrix);
        windowColor.set(seed.lit ? "#ffd284" : "#153e46");
        windows.current!.setColorAt(windowIndex, windowColor);
      }

      const doorHeight = Math.min(
        metersToLocal(STANDARD_DOOR_HEIGHT_METERS),
        seed.height * 0.72,
      );
      const doorWidth = Math.min(
        metersToLocal(STANDARD_DOOR_WIDTH_METERS),
        seed.width * 0.42,
      );
      dummy.position.set(
        seed.x + Math.sin(seed.rotation) * (seed.depth / 2 + 0.009),
        seed.y + doorHeight / 2,
        seed.z + Math.cos(seed.rotation) * (seed.depth / 2 + 0.009),
      );
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(doorWidth, doorHeight, 0.018);
      dummy.updateMatrix();
      doors.current!.setMatrixAt(index, dummy.matrix);
      doors.current!.setColorAt(index, new THREE.Color(seed.roofColor));

      dummy.position.set(seed.x, seed.y + seed.height * 0.94, seed.z);
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(seed.width * 1.07, 0.035, seed.depth * 1.07);
      dummy.updateMatrix();
      cornices.current!.setMatrixAt(index, dummy.matrix);
      cornices.current!.setColorAt(index, new THREE.Color(seed.roofColor));

      const hasBalcony = index % 3 === 0 && profile.roof !== "ruin";
      dummy.position.set(
        seed.x + Math.sin(seed.rotation) * (seed.depth / 2 + 0.07),
        seed.y + seed.height * 0.52,
        seed.z + Math.cos(seed.rotation) * (seed.depth / 2 + 0.07),
      );
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(
        hasBalcony ? seed.width * 0.42 : 0.0001,
        hasBalcony ? 0.028 : 0.0001,
        hasBalcony ? metersToLocal(1.15) : 0.0001,
      );
      dummy.updateMatrix();
      balconies.current!.setMatrixAt(index, dummy.matrix);
      balconies.current!.setColorAt(index, new THREE.Color(seed.roofColor));
    });
    for (const mesh of [
      bodies.current,
      roofs.current,
      windows.current,
      doors.current,
      cornices.current,
      balconies.current,
    ]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [profile.roof, seeds]);

  const buildingTexture =
    locationId === "kharbranth" ? plaster : stone;

  if (
    seeds.length === 0 ||
    [
      "kharbranth",
      "purelake",
      "shattered-plains",
      "urithiru",
      "aimia",
    ].includes(locationId)
  ) {
    return null;
  }

  return (
    <>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, seeds.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          bumpMap={buildingTexture}
          bumpScale={0.014}
          vertexColors
          emissive="#5a4432"
          emissiveIntensity={0.1}
          roughness={0.88}
          metalness={0.02}
        />
      </instancedMesh>
      <instancedMesh
        ref={roofs}
        args={[undefined, undefined, seeds.length]}
        castShadow
        receiveShadow
      >
        <RoofGeometry style={profile.roof} />
        <meshStandardMaterial
          bumpMap={stone}
          bumpScale={0.01}
          vertexColors
          emissive="#ad835b"
          emissiveIntensity={0.035}
          roughness={0.86}
          metalness={0.035}
        />
      </instancedMesh>
      <instancedMesh
        ref={windows}
        args={[undefined, undefined, seeds.length * 2]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={doors}
        args={[undefined, undefined, seeds.length]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          bumpMap={stone}
          bumpScale={0.008}
          vertexColors
          roughness={0.82}
        />
      </instancedMesh>
      <instancedMesh
        ref={cornices}
        args={[undefined, undefined, seeds.length]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          vertexColors
          roughness={0.8}
          metalness={0.05}
        />
      </instancedMesh>
      <instancedMesh
        ref={balconies}
        args={[undefined, undefined, seeds.length]}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          vertexColors
          roughness={0.86}
          metalness={0.04}
        />
      </instancedMesh>
    </>
  );
}

function DistrictGround({
  locationId,
  center,
  profile,
  street,
}: {
  locationId: string;
  center: readonly [number, number];
  profile: CityProfile;
  street: boolean;
}) {
  const pavingSource = useTexture(
    `${import.meta.env.BASE_URL}textures/shattered-paving-albedo.jpg`,
  );
  const paving = useMemo(
    () => configureTexture(pavingSource, 4.4),
    [pavingSource],
  );
  const y = localSurfaceY(locationId, center[0], center[1]) - 0.012;

  if (locationId === "shattered-plains") {
    if (!street) return null;
    const plateaus = [
      { x: -3.15, z: -1.8, sx: 2.4, sz: 1.65, sides: 9 },
      { x: 0.45, z: -0.15, sx: 2.1, sz: 1.55, sides: 8 },
      { x: 3.15, z: 1.35, sx: 1.55, sz: 1.2, sides: 7 },
    ] as const;
    return (
      <group name="Shattered Plains local chasm edge">
        {plateaus.map((plateau, index) => {
          const x = center[0] + plateau.x;
          const z = center[1] + plateau.z;
          const surface = localSurfaceY(locationId, x, z);
          return (
            <mesh
              key={index}
              position={[x, surface - 0.14, z]}
              scale={[plateau.sx, 1, plateau.sz]}
              receiveShadow
              castShadow
            >
              <cylinderGeometry args={[1, 1.08, 0.34, plateau.sides]} />
              <meshStandardMaterial
                bumpMap={paving}
                bumpScale={0.024}
                color={index === 1 ? "#827b69" : "#736d60"}
                roughness={0.91}
                metalness={0.025}
              />
            </mesh>
          );
        })}
        <mesh
          position={[center[0] - 1.2, y - 0.23, center[1] - 0.82]}
          rotation={[0, -0.48, 0]}
          receiveShadow
        >
          <boxGeometry args={[0.72, 0.09, 6.4]} />
          <meshStandardMaterial
            color="#111c21"
            roughness={0.98}
            metalness={0.02}
          />
        </mesh>
        <mesh
          position={[center[0] + 1.85, y - 0.2, center[1] + 0.75]}
          rotation={[0, -0.44, 0]}
          receiveShadow
        >
          <boxGeometry args={[0.5, 0.08, 4.2]} />
          <meshStandardMaterial
            color="#17252a"
            roughness={0.98}
            metalness={0.02}
          />
        </mesh>
      </group>
    );
  }

  if (locationId === "kharbranth") {
    return (
      <group name="Kharbranth stepped streets">
        {Array.from({ length: 6 }, (_, terrace) => {
          const roadZ = center[1] + kharbranthRoadOffset(terrace);
          return (
            <mesh
              key={terrace}
              position={[
                center[0],
                localSurfaceY(locationId, center[0], roadZ) - 0.012,
                roadZ,
              ]}
              receiveShadow
            >
              <boxGeometry
                args={[
                  (5.6 - terrace * 0.56) * KHARBRANTH_LANDMARK_SCALE,
                  0.028,
                  0.22,
                ]}
              />
              <meshStandardMaterial
                map={paving}
                color={terrace % 2 === 0 ? "#846d5d" : "#75645a"}
                roughness={0.9}
                metalness={0.02}
              />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (locationId !== "shinovar") {
    return null;
  }

  return (
    <mesh
      position={[center[0], y, center[1]]}
      rotation-x={-Math.PI / 2}
      receiveShadow
    >
      <circleGeometry args={[profile.radius * 0.94, 64]} />
      <meshStandardMaterial
        map={paving}
        color="#6d734f"
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
  seeds,
}: {
  seeds: readonly ModuleSeed[];
}) {
  return (
    <>
      {seeds.map((seed, index) => (
        <ModuleInstance
          key={`${seed.name}-${index}`}
          name={seed.name}
          position={[seed.x, seed.y + 0.01, seed.z]}
          rotation={seed.rotation}
          scale={seed.scale}
        />
      ))}
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
  const center = useMemo(
    () =>
      [
        location?.coordinates.x ?? 0,
        location?.coordinates.z ?? 0,
      ] as const,
    [location],
  );
  const layout = useMemo(
    () =>
      location
        ? createDistrictLayout(
            profile,
            location.id,
            center,
            detailLevel,
            width,
          )
        : { buildings: [], modules: [] },
    [center, detailLevel, location, profile, width],
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
        street={detailLevel === "street"}
      />
      <InstancedArchitecture
        seeds={layout.buildings}
        profile={profile}
        locationId={location.id}
      />
      <DistrictModules seeds={layout.modules} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
