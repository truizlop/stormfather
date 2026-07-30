import { useGLTF, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import { locationById } from "../locations";
import type { DetailLevel } from "../types";
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
import { isShatteredPlainsFootprintSupported } from "../terrain/shatteredPlainsTopology";
import {
  KHARBRANTH_LANDMARK_SCALE,
  kharbranthRoadOffset,
} from "./landmarkMetrics";
import { cityProfile, type CityProfile } from "./profiles";

const MODEL_URL = `${import.meta.env.BASE_URL}models/roshar-landmarks.glb`;

function configureTexture(
  texture: THREE.Texture,
  repeat: number,
  colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace,
) {
  const copy = texture.clone();
  copy.wrapS = copy.wrapT = THREE.RepeatWrapping;
  copy.repeat.set(repeat, repeat);
  copy.colorSpace = colorSpace;
  copy.anisotropy = 8;
  copy.needsUpdate = true;
  return copy;
}

function useConfiguredTextureClone(
  texture: THREE.Texture,
  repeat: number,
  colorSpace: THREE.ColorSpace = THREE.SRGBColorSpace,
) {
  const clone = useMemo(
    () => configureTexture(texture, repeat, colorSpace),
    [colorSpace, repeat, texture],
  );
  useEffect(() => () => clone.dispose(), [clone]);
  return clone;
}

function disposeOwnedMaterials(materials: Iterable<THREE.Material>) {
  for (const material of materials) material.dispose();
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
  const foundations = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const doors = useRef<THREE.InstancedMesh>(null);
  const cornices = useRef<THREE.InstancedMesh>(null);
  const balconies = useRef<THREE.InstancedMesh>(null);
  const [masonrySource, stormwoodSource] = useTexture([
    `${import.meta.env.BASE_URL}textures/rosharan-masonry-microheight-v2.jpg`,
    `${import.meta.env.BASE_URL}textures/rosharan-stormwood-microheight-v2.jpg`,
  ]);
  const masonry = useConfiguredTextureClone(
    masonrySource,
    5.6,
    THREE.NoColorSpace,
  );
  const stormwood = useConfiguredTextureClone(
    stormwoodSource,
    4.8,
    THREE.NoColorSpace,
  );

  useLayoutEffect(() => {
    if (
      !bodies.current ||
      !foundations.current ||
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
    const foundationColor = new THREE.Color();
    seeds.forEach((seed, index) => {
      dummy.position.set(
        seed.x,
        seed.y - seed.foundationDrop / 2 + 0.012,
        seed.z,
      );
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(
        seed.width * 1.08,
        seed.foundationDrop,
        seed.depth * 1.08,
      );
      dummy.updateMatrix();
      foundations.current!.setMatrixAt(index, dummy.matrix);
      foundationColor.set(seed.color).multiplyScalar(0.48);
      foundations.current!.setColorAt(index, foundationColor);

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
      foundations.current,
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
        ref={foundations}
        args={[undefined, undefined, seeds.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          bumpMap={masonry}
          bumpScale={0.012}
          vertexColors
          roughness={0.94}
          metalness={0.01}
        />
      </instancedMesh>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, seeds.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          bumpMap={masonry}
          bumpScale={locationId === "kharbranth" ? 0.007 : 0.009}
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
          bumpMap={masonry}
          bumpScale={0.007}
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
          bumpMap={stormwood}
          bumpScale={0.009}
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
          bumpMap={masonry}
          bumpScale={0.005}
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
          bumpMap={stormwood}
          bumpScale={0.008}
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
}: {
  locationId: string;
  center: readonly [number, number];
  profile: CityProfile;
}) {
  const pavingSource = useTexture(
    `${import.meta.env.BASE_URL}textures/shattered-paving-albedo.jpg`,
  );
  const paving = useConfiguredTextureClone(pavingSource, 4.4);
  const y = localSurfaceY(locationId, center[0], center[1]) - 0.012;

  // The Shattered Plains ground is the authored 37-plateau landmark over the
  // carved terrain patch. A second three-cylinder approximation here used to
  // replace that topology at Street detail and made camps appear to float.
  if (locationId === "shattered-plains") return null;

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
  foundationWidth,
  foundationDepth,
  foundationDrop,
  masonryMicro,
  stormwoodMicro,
}: {
  name: string;
  position: [number, number, number];
  rotation: number;
  scale: number;
  foundationWidth: number;
  foundationDepth: number;
  foundationDrop: number;
  masonryMicro: THREE.Texture;
  stormwoodMicro: THREE.Texture;
}) {
  const { scene } = useGLTF(MODEL_URL);
  const ownedClone = useMemo(() => {
    const source = scene.getObjectByName(name);
    if (!source) return null;
    const copy = source.clone(true);
    const ownedMaterials = new Set<THREE.Material>();
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, 0, 0);
    copy.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const sourceMaterials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        const materials = sourceMaterials.map((sourceMaterial) => {
          const material =
            sourceMaterial.clone() as THREE.MeshStandardMaterial;
          ownedMaterials.add(material);
          const lowerName =
            `${object.name} ${material.name}`.toLowerCase();
          const excludesMicroSurface =
            /(glass|water|cyan|light|emissive)/.test(lowerName);
          if (!excludesMicroSurface && "roughness" in material) {
            const isStormwood =
              /(wood|rope|timber|dock|balcony|shutter|door)/.test(
                lowerName,
              ) && !lowerName.includes("stone");
            material.bumpMap = isStormwood
              ? stormwoodMicro
              : masonryMicro;
            material.bumpScale = isStormwood ? 0.009 : 0.0055;
            material.roughness = Math.max(
              material.roughness ?? 0.8,
              isStormwood ? 0.8 : 0.86,
            );
            material.metalness = Math.min(
              material.metalness ?? 0,
              0.06,
            );
          }
          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace;
            material.map.anisotropy = 8;
          }
          material.needsUpdate = true;
          return material;
        });
        mesh.material = Array.isArray(mesh.material)
          ? materials
          : materials[0];
      }
    });
    return { materials: ownedMaterials, object: copy };
  }, [masonryMicro, name, scene, stormwoodMicro]);
  const clone = ownedClone?.object ?? null;
  useEffect(
    () => () => {
      if (ownedClone) disposeOwnedMaterials(ownedClone.materials);
    },
    [ownedClone],
  );
  if (!clone) return null;
  return (
    <group position={position} rotation-y={rotation}>
      <mesh
        position={[0, -foundationDrop / 2 + 0.01, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[foundationWidth, foundationDrop, foundationDepth]}
        />
        <meshStandardMaterial
          color="#4f4b42"
          roughness={0.96}
          metalness={0.01}
        />
      </mesh>
      <group scale={scale}>
        <primitive object={clone} />
      </group>
    </group>
  );
}

function DistrictModules({
  seeds,
}: {
  seeds: readonly ModuleSeed[];
}) {
  const [masonrySource, stormwoodSource] = useTexture([
    `${import.meta.env.BASE_URL}textures/rosharan-masonry-microheight-v2.jpg`,
    `${import.meta.env.BASE_URL}textures/rosharan-stormwood-microheight-v2.jpg`,
  ]);
  const masonryMicro = useConfiguredTextureClone(
    masonrySource,
    5.6,
    THREE.NoColorSpace,
  );
  const stormwoodMicro = useConfiguredTextureClone(
    stormwoodSource,
    4.8,
    THREE.NoColorSpace,
  );

  return (
    <>
      {seeds.map((seed, index) => (
        <ModuleInstance
          key={`${seed.name}-${index}`}
          name={seed.name}
          position={[seed.x, seed.y + 0.01, seed.z]}
          rotation={seed.rotation}
          scale={seed.scale}
          foundationWidth={seed.foundationWidth}
          foundationDepth={seed.foundationDepth}
          foundationDrop={seed.foundationDrop}
          masonryMicro={masonryMicro}
          stormwoodMicro={stormwoodMicro}
        />
      ))}
    </>
  );
}

export function CityDetail({
  detailLevel: detailLevelOverride,
  locationId,
}: {
  detailLevel?: DetailLevel;
  locationId?: string;
} = {}) {
  const activeLocationId = useAtlasStore(
    (state) => locationId ?? state.selectedId,
  );
  const storeDetailLevel = useAtlasStore((state) => state.detailLevel);
  const detailLevel = detailLevelOverride ?? storeDetailLevel;
  const width = useThree((state) => state.size.width);
  const location = locationById.get(activeLocationId);

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
  const supportedModules = useMemo(() => {
    if (location?.id !== "shattered-plains") return layout.modules;
    return layout.modules.filter((module) =>
      isShatteredPlainsFootprintSupported(
        module.x - center[0],
        module.z - center[1],
        module.foundationWidth / 2,
        module.foundationDepth / 2,
        module.rotation,
      ),
    );
  }, [center, layout.modules, location?.id]);

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
        seeds={layout.buildings}
        profile={profile}
        locationId={location.id}
      />
      <DistrictModules seeds={supportedModules} />
    </group>
  );
}
