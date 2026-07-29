import { useFrame, useThree } from "@react-three/fiber";
import {
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import {
  cityLodConfig,
  createCityLodState,
  createCitySilhouette,
  type CityLodState,
  type CityLodTier,
  type CitySilhouette,
  updateCityLodState,
} from "./progressiveLod";
import type { CityProfile } from "./profiles";

const HIDDEN_WEIGHT = 0.001;

function RoofGeometry({ style }: { style: CityProfile["roof"] }) {
  if (style === "dome") {
    return (
      <sphereGeometry
        args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]}
      />
    );
  }
  if (style === "flat" || style === "ruin") {
    return <boxGeometry args={[1, 1, 1]} />;
  }
  return <coneGeometry args={[1, 1, style === "pitched" ? 4 : 7]} />;
}

function roofHeight(style: CityProfile["roof"], buildingHeight: number) {
  if (style === "flat" || style === "ruin") return 0.065;
  if (style === "dome") return buildingHeight * 0.24;
  return buildingHeight * 0.28;
}

function applyLayerOpacity(
  group: THREE.Group | null,
  materials: readonly (THREE.Material | null)[],
  weight: number,
) {
  if (group) group.visible = weight > HIDDEN_WEIGHT;
  for (const material of materials) {
    if (material) material.opacity = weight;
  }
}

function SilhouetteLayer({
  silhouette,
  lodState,
  tier,
}: {
  silhouette: CitySilhouette;
  lodState: CityLodState;
  tier: "far" | "mid";
}) {
  const group = useRef<THREE.Group>(null);
  const foundations = useRef<THREE.InstancedMesh>(null);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const foundationMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const bodyMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const roofMaterial = useRef<THREE.MeshStandardMaterial>(null);

  useLayoutEffect(() => {
    if (!foundations.current || !bodies.current || !roofs.current) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const [centerX, centerY, centerZ] = silhouette.center;
    const roofStyle = silhouette.profile.roof;

    silhouette.seeds.forEach((seed, index) => {
      const localX = seed.x - centerX;
      const localY = seed.y - centerY;
      const localZ = seed.z - centerZ;

      dummy.position.set(
        localX,
        localY - seed.foundationDrop / 2 + 0.012,
        localZ,
      );
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(
        seed.foundationWidth,
        seed.foundationDrop,
        seed.foundationDepth,
      );
      dummy.updateMatrix();
      foundations.current!.setMatrixAt(index, dummy.matrix);
      color.set(seed.color).multiplyScalar(0.44);
      foundations.current!.setColorAt(index, color);

      dummy.position.set(localX, localY + seed.height / 2, localZ);
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(seed.width, seed.height, seed.depth);
      dummy.updateMatrix();
      bodies.current!.setMatrixAt(index, dummy.matrix);
      bodies.current!.setColorAt(index, color.set(seed.color));

      const height = roofHeight(roofStyle, seed.height);
      const dome = roofStyle === "dome";
      dummy.position.set(
        localX,
        localY + seed.height + (dome ? 0 : height / 2),
        localZ,
      );
      dummy.rotation.set(
        0,
        seed.rotation + (roofStyle === "pitched" ? Math.PI / 4 : 0),
        0,
      );
      dummy.scale.set(
        seed.width * (dome ? 0.62 : 0.7),
        height,
        seed.depth * (dome ? 0.62 : 0.7),
      );
      dummy.updateMatrix();
      roofs.current!.setMatrixAt(index, dummy.matrix);
      roofs.current!.setColorAt(index, color.set(seed.roofColor));
    });

    for (const mesh of [
      foundations.current,
      bodies.current,
      roofs.current,
    ]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    applyLayerOpacity(
      group.current,
      [
        foundationMaterial.current,
        bodyMaterial.current,
        roofMaterial.current,
      ],
      lodState.weights[tier],
    );
  }, [lodState, silhouette, tier]);

  useFrame(() => {
    applyLayerOpacity(
      group.current,
      [
        foundationMaterial.current,
        bodyMaterial.current,
        roofMaterial.current,
      ],
      lodState.weights[tier],
    );
  });

  const castShadow = tier === "mid";
  const instanceCount = silhouette.seeds.length;
  return (
    <group
      ref={group}
      name={`${silhouette.locationId}-${tier}-city-silhouette`}
    >
      <instancedMesh
        ref={foundations}
        args={[undefined, undefined, instanceCount]}
        castShadow={castShadow}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={foundationMaterial}
          alphaHash
          vertexColors
          roughness={0.96}
          metalness={0.01}
        />
      </instancedMesh>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, instanceCount]}
        castShadow={castShadow}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={bodyMaterial}
          alphaHash
          vertexColors
          roughness={0.9}
          metalness={0.02}
        />
      </instancedMesh>
      <instancedMesh
        ref={roofs}
        args={[undefined, undefined, instanceCount]}
        castShadow={castShadow}
        receiveShadow
      >
        <RoofGeometry style={silhouette.profile.roof} />
        <meshStandardMaterial
          ref={roofMaterial}
          alphaHash
          vertexColors
          roughness={0.84}
          metalness={0.035}
        />
      </instancedMesh>
    </group>
  );
}

interface FadeMaterial {
  material: THREE.Material;
  baseOpacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

function applyNearOpacity(
  group: THREE.Group | null,
  entries: readonly FadeMaterial[],
  weight: number,
) {
  if (group) group.visible = weight > HIDDEN_WEIGHT;
  for (const entry of entries) {
    entry.material.opacity = entry.baseOpacity * weight;
    entry.material.transparent = entry.transparent;
    entry.material.depthWrite = entry.depthWrite;
  }
}

function FadingNearLayer({
  children,
  lodState,
  position,
}: {
  children: ReactNode;
  lodState: CityLodState;
  position?: readonly [number, number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const fadeMaterials = useRef<FadeMaterial[]>([]);

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    const ownedMaterials: THREE.Material[] = [];
    const entries: FadeMaterial[] = [];

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const sources = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      const clones = sources.map((source) => {
        const material = source.clone();
        ownedMaterials.push(material);
        entries.push({
          material,
          baseOpacity: source.opacity,
          transparent: source.transparent,
          depthWrite: source.depthWrite,
        });
        if (!source.transparent) {
          material.alphaHash = true;
        }
        material.needsUpdate = true;
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? clones : clones[0];
    });
    fadeMaterials.current = entries;
    applyNearOpacity(root, entries, lodState.weights.near);

    return () => {
      fadeMaterials.current = [];
      for (const material of ownedMaterials) material.dispose();
    };
  }, [children, lodState]);

  useFrame(() => {
    applyNearOpacity(
      group.current,
      fadeMaterials.current,
      lodState.weights.near,
    );
  });

  return (
    <group
      ref={group}
      name="near-city-detail"
      position={position as [number, number, number] | undefined}
    >
      {children}
    </group>
  );
}

export interface ProgressiveCityLodProps {
  locationId: string;
  /**
   * Detailed authored or procedural city content in city-local coordinates.
   * The component places it at the canonical location and terrain elevation.
   */
  near: ReactNode;
  /**
   * Existing scene components already emit world-space coordinates. This
   * option cancels the LOD root transform so they can fade in without a
   * second placement offset.
   */
  nearWorldSpace?: boolean;
}

/**
 * Three-tier city renderer: one-draw-family far and mid silhouettes crossfade
 * into the detailed local city. Alpha hashing avoids transparent sorting pops.
 */
export function ProgressiveCityLod({
  locationId,
  near,
  nearWorldSpace = false,
}: ProgressiveCityLodProps) {
  const camera = useThree((state) => state.camera);
  const far = useMemo(
    () => createCitySilhouette(locationId, "far"),
    [locationId],
  );
  const mid = useMemo(
    () => createCitySilhouette(locationId, "mid"),
    [locationId],
  );
  const config = useMemo(() => cityLodConfig(far.profile), [far.profile]);
  const center = useMemo(
    () => new THREE.Vector3(...far.center),
    [far.center],
  );
  const cameraPosition = useRef(new THREE.Vector3());
  const nearOffset = useMemo(
    () =>
      nearWorldSpace
        ? ([-far.center[0], -far.center[1], -far.center[2]] as const)
        : undefined,
    [far.center, nearWorldSpace],
  );
  const lodState = useMemo(
    () =>
      createCityLodState(
        camera.position.distanceTo(center),
        config,
      ),
    [camera, center, config],
  );

  useFrame(({ camera: activeCamera }, delta) => {
    activeCamera.getWorldPosition(cameraPosition.current);
    updateCityLodState(
      lodState,
      cameraPosition.current.distanceTo(center),
      delta,
      config,
    );
  });

  return (
    <group
      name={`${locationId}-progressive-city-lod`}
      position={far.center}
    >
      <SilhouetteLayer
        silhouette={far}
        lodState={lodState}
        tier="far"
      />
      <SilhouetteLayer
        silhouette={mid}
        lodState={lodState}
        tier="mid"
      />
      <FadingNearLayer
        lodState={lodState}
        position={nearOffset}
      >
        {near}
      </FadingNearLayer>
    </group>
  );
}

export type { CityLodTier };
