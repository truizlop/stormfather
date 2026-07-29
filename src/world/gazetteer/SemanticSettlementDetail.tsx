import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { metersToLocal } from "../scale";
import { terrainHeightAt } from "../terrain/terrainHeight";
import type { GazetteerPlace } from "./types";
import {
  createSemanticSettlementLayout,
  type SemanticBuildingSeed,
  type SemanticPavingSeed,
  type SemanticSettlementProfile,
  type SemanticSignatureMaterial,
  type SemanticSignaturePart,
} from "./semanticSettlements";

function configuredTexture(
  source: THREE.Texture,
  repeat: number,
  colorSpace: THREE.ColorSpace,
) {
  const texture = source.clone();
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function RoofGeometry({
  style,
}: {
  style: SemanticSettlementProfile["roof"];
}) {
  if (style === "dome") {
    return (
      <sphereGeometry
        args={[1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2]}
      />
    );
  }
  if (style === "flat") return <boxGeometry args={[1, 1, 1]} />;
  return <coneGeometry args={[1, 1, style === "pitched" ? 4 : 7]} />;
}

function roofDimensions(
  style: SemanticSettlementProfile["roof"],
  seed: SemanticBuildingSeed,
) {
  if (style === "flat") {
    return {
      height: 0.055,
      y: seed.y + seed.height + 0.0275,
      width: seed.width * 1.06,
      depth: seed.depth * 1.06,
    };
  }
  if (style === "dome") {
    return {
      height: seed.height * 0.25,
      y: seed.y + seed.height,
      width: seed.width * 0.62,
      depth: seed.depth * 0.62,
    };
  }
  const height = seed.height * (style === "carapace" ? 0.24 : 0.3);
  return {
    height,
    y: seed.y + seed.height + height / 2,
    width: seed.width * 0.7,
    depth: seed.depth * 0.7,
  };
}

function SettlementArchitecture({
  seeds,
  profile,
  masonryAlbedo,
  masonryBump,
  woodBump,
}: {
  seeds: readonly SemanticBuildingSeed[];
  profile: SemanticSettlementProfile;
  masonryAlbedo: THREE.Texture;
  masonryBump: THREE.Texture;
  woodBump: THREE.Texture;
}) {
  const foundations = useRef<THREE.InstancedMesh>(null);
  const bodies = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const doors = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (
      !foundations.current ||
      !bodies.current ||
      !roofs.current ||
      !windows.current ||
      !doors.current
    ) {
      return;
    }
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      dummy.position.set(
        seed.x,
        seed.y - seed.foundationDrop / 2 + 0.008,
        seed.z,
      );
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(
        seed.width * 1.06,
        seed.foundationDrop,
        seed.depth * 1.06,
      );
      dummy.updateMatrix();
      foundations.current.setMatrixAt(index, dummy.matrix);
      foundations.current.setColorAt(
        index,
        color.set(profile.foundationColor).multiplyScalar(0.78),
      );

      dummy.position.set(seed.x, seed.y + seed.height / 2, seed.z);
      dummy.scale.set(seed.width, seed.height, seed.depth);
      dummy.updateMatrix();
      bodies.current.setMatrixAt(index, dummy.matrix);
      bodies.current.setColorAt(index, color.set(seed.color));

      const roof = roofDimensions(profile.roof, seed);
      dummy.position.set(seed.x, roof.y, seed.z);
      dummy.rotation.set(
        0,
        seed.rotation + (profile.roof === "pitched" ? Math.PI / 4 : 0),
        0,
      );
      dummy.scale.set(roof.width, roof.height, roof.depth);
      dummy.updateMatrix();
      roofs.current.setMatrixAt(index, dummy.matrix);
      roofs.current.setColorAt(index, color.set(seed.roofColor));

      for (const side of [-1, 1] as const) {
        const lateral = side * seed.width * 0.24;
        dummy.position.set(
          seed.x +
            Math.cos(seed.rotation) * lateral +
            Math.sin(seed.rotation) * (seed.depth / 2 + 0.006),
          seed.y + seed.height * 0.62,
          seed.z -
            Math.sin(seed.rotation) * lateral +
            Math.cos(seed.rotation) * (seed.depth / 2 + 0.006),
        );
        dummy.rotation.set(0, seed.rotation, 0);
        dummy.scale.set(
          Math.min(0.07, seed.width * 0.2),
          Math.min(0.11, seed.height * 0.2),
          0.012,
        );
        dummy.updateMatrix();
        const windowIndex = index * 2 + (side === -1 ? 0 : 1);
        windows.current.setMatrixAt(windowIndex, dummy.matrix);
        windows.current.setColorAt(
          windowIndex,
          color.set(seed.lit ? "#ffd58a" : "#173f48"),
        );
      }

      const doorHeight = Math.min(
        metersToLocal(2.04),
        seed.height * 0.64,
      );
      dummy.position.set(
        seed.x + Math.sin(seed.rotation) * (seed.depth / 2 + 0.008),
        seed.y + doorHeight / 2,
        seed.z + Math.cos(seed.rotation) * (seed.depth / 2 + 0.008),
      );
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(
        Math.min(metersToLocal(0.92), seed.width * 0.34),
        doorHeight,
        0.016,
      );
      dummy.updateMatrix();
      doors.current.setMatrixAt(index, dummy.matrix);
      doors.current.setColorAt(index, color.set("#4d3428"));
    }

    for (const mesh of [
      foundations.current,
      bodies.current,
      roofs.current,
      windows.current,
      doors.current,
    ]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [profile, seeds]);

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
          bumpMap={masonryBump}
          bumpScale={0.012}
          roughness={0.96}
          metalness={0.01}
          emissive="#55483c"
          emissiveIntensity={0.26}
          vertexColors
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
          map={masonryAlbedo}
          bumpMap={masonryBump}
          bumpScale={0.009}
          roughness={0.89}
          metalness={0.02}
          emissive="#7d6754"
          emissiveIntensity={0.38}
          vertexColors
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
          bumpMap={woodBump}
          bumpScale={0.008}
          roughness={0.86}
          metalness={0.035}
          emissive="#72564e"
          emissiveIntensity={0.32}
          vertexColors
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
          bumpMap={woodBump}
          bumpScale={0.009}
          roughness={0.88}
          emissive="#4a3025"
          emissiveIntensity={0.18}
          vertexColors
        />
      </instancedMesh>
    </>
  );
}

function SettlementPaving({
  seeds,
  profile,
  pavingTexture,
}: {
  seeds: readonly SemanticPavingSeed[];
  profile: SemanticSettlementProfile;
  pavingTexture: THREE.Texture;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      dummy.position.set(seed.x, seed.y, seed.z);
      dummy.rotation.set(0, seed.rotation, 0);
      dummy.scale.set(seed.width, 0.018, seed.length);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [seeds]);

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, seeds.length]}
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        map={pavingTexture}
        color={profile.pavingColor}
        roughness={0.94}
        metalness={0.015}
      />
    </instancedMesh>
  );
}

function SignatureGeometry({
  shape,
}: {
  shape: SemanticSignaturePart["shape"];
}) {
  switch (shape) {
    case "box":
      return <boxGeometry args={[1, 1, 1]} />;
    case "cylinder":
      return <cylinderGeometry args={[0.5, 0.5, 1, 12]} />;
    case "cone":
      return <coneGeometry args={[0.5, 1, 7]} />;
    case "dome":
      return (
        <sphereGeometry
          args={[0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
      );
    case "ring":
      return <ringGeometry args={[0.33, 0.5, 32]} />;
  }
}

function signatureColor(
  profile: SemanticSettlementProfile,
  material: SemanticSignatureMaterial,
) {
  switch (material) {
    case "primary":
      return profile.palette[0];
    case "secondary":
      return profile.palette[1];
    case "roof":
      return profile.roofPalette[0];
    case "accent":
      return profile.accentColor;
    case "wood":
      return "#65492f";
    case "water":
      return "#3e9bb0";
  }
}

function SignatureLandmark({
  parts,
  profile,
  masonryBump,
  woodBump,
}: {
  parts: readonly SemanticSignaturePart[];
  profile: SemanticSettlementProfile;
  masonryBump: THREE.Texture;
  woodBump: THREE.Texture;
}) {
  return (
    <group name={`${profile.id} signature ${profile.signature}`}>
      {parts.map((part, index) => (
        <mesh
          key={`${part.shape}-${index}`}
          position={part.position}
          rotation={part.rotation}
          scale={part.scale}
          castShadow={part.material !== "water"}
          receiveShadow
        >
          <SignatureGeometry shape={part.shape} />
          {part.material === "water" ? (
            <meshPhysicalMaterial
              color={signatureColor(profile, part.material)}
              transparent
              opacity={0.78}
              roughness={0.24}
              metalness={0.05}
            />
          ) : (
            <meshStandardMaterial
              color={signatureColor(profile, part.material)}
              bumpMap={part.material === "wood" ? woodBump : masonryBump}
              bumpScale={part.material === "wood" ? 0.009 : 0.006}
              roughness={part.material === "accent" ? 0.66 : 0.88}
              metalness={part.material === "accent" ? 0.16 : 0.025}
            />
          )}
        </mesh>
      ))}
    </group>
  );
}

function SettlementActivity({
  seeds,
  name,
}: {
  seeds: ReturnType<typeof createSemanticSettlementLayout>["activity"];
  name: string;
}) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const bodyHeight = metersToLocal(1.22);
  const headRadius = metersToLocal(0.14);

  useLayoutEffect(() => {
    if (!bodies.current) return;
    const color = new THREE.Color();
    for (let index = 0; index < seeds.length; index += 1) {
      bodies.current.setColorAt(index, color.set(seeds[index].color));
    }
    if (bodies.current.instanceColor) {
      bodies.current.instanceColor.needsUpdate = true;
    }
  }, [seeds]);

  useFrame((state) => {
    if (!bodies.current || !heads.current) return;
    const time = state.clock.elapsedTime;
    for (let index = 0; index < seeds.length; index += 1) {
      const seed = seeds[index];
      const cycle = (time * seed.speed + seed.phase) % 2;
      const progress = cycle <= 1 ? cycle : 2 - cycle;
      const x = THREE.MathUtils.lerp(seed.start[0], seed.end[0], progress);
      const y = THREE.MathUtils.lerp(seed.start[1], seed.end[1], progress);
      const z = THREE.MathUtils.lerp(seed.start[2], seed.end[2], progress);
      const heading = Math.atan2(
        seed.end[0] - seed.start[0],
        seed.end[2] - seed.start[2],
      );
      const bob = Math.sin((time * seed.speed + seed.phase) * Math.PI * 8) * 0.004;

      dummy.position.set(x, y + bodyHeight / 2 + bob, z);
      dummy.rotation.set(0, heading + (cycle > 1 ? Math.PI : 0), 0);
      dummy.scale.set(
        metersToLocal(0.42),
        bodyHeight,
        metersToLocal(0.34),
      );
      dummy.updateMatrix();
      bodies.current.setMatrixAt(index, dummy.matrix);

      dummy.position.set(
        x,
        y + bodyHeight + headRadius * 1.16 + bob,
        z,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(headRadius);
      dummy.updateMatrix();
      heads.current.setMatrixAt(index, dummy.matrix);
    }
    bodies.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name={`${name} animated inhabitants`}>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, seeds.length]}
        castShadow
        frustumCulled={false}
      >
        <cylinderGeometry args={[0.5, 0.42, 1, 7]} />
        <meshStandardMaterial vertexColors roughness={0.86} />
      </instancedMesh>
      <instancedMesh
        ref={heads}
        args={[undefined, undefined, seeds.length]}
        castShadow
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 7]} />
        <meshStandardMaterial color="#a7795d" roughness={0.76} />
      </instancedMesh>
    </group>
  );
}

export function SemanticSettlementDetail({
  place,
  markerWorld,
  detailLevel,
  profile,
}: {
  place: GazetteerPlace;
  markerWorld: readonly [number, number];
  detailLevel: "city" | "street";
  profile: SemanticSettlementProfile;
}) {
  const compactViewport = useThree((state) => state.size.width < 720);
  const [masonrySource, masonryBumpSource, woodBumpSource, pavingSource] =
    useTexture([
      // The dark crem-stone scan is excellent ground cover but multiplies
      // authored wall colors almost to black. A neutral plaster scan keeps
      // each settlement's cultural palette legible while the microheight
      // texture supplies the masonry relief.
      `${import.meta.env.BASE_URL}textures/kharbranth-plaster-subtle.jpg`,
      `${import.meta.env.BASE_URL}textures/rosharan-masonry-microheight-v2.jpg`,
      `${import.meta.env.BASE_URL}textures/rosharan-stormwood-microheight-v2.jpg`,
      `${import.meta.env.BASE_URL}textures/shattered-paving-albedo.jpg`,
    ]);
  const masonryAlbedo = useMemo(
    () =>
      configuredTexture(masonrySource, 5.2, THREE.SRGBColorSpace),
    [masonrySource],
  );
  const masonryBump = useMemo(
    () =>
      configuredTexture(masonryBumpSource, 5.6, THREE.NoColorSpace),
    [masonryBumpSource],
  );
  const woodBump = useMemo(
    () =>
      configuredTexture(woodBumpSource, 4.8, THREE.NoColorSpace),
    [woodBumpSource],
  );
  const pavingTexture = useMemo(
    () => configuredTexture(pavingSource, 4.4, THREE.SRGBColorSpace),
    [pavingSource],
  );
  useEffect(
    () => () => {
      masonryAlbedo.dispose();
      masonryBump.dispose();
      woodBump.dispose();
      pavingTexture.dispose();
    },
    [masonryAlbedo, masonryBump, pavingTexture, woodBump],
  );
  const layout = useMemo(
    () =>
      createSemanticSettlementLayout(
        profile,
        markerWorld,
        detailLevel,
        compactViewport,
        terrainHeightAt,
      ),
    [compactViewport, detailLevel, markerWorld, profile],
  );

  return (
    <group
      name={`${place.canonicalName} selected semantic district`}
      position={[markerWorld[0], 0, markerWorld[1]]}
      userData={{
        gazetteerId: place.id,
        semanticDistrict: true,
        architecture: profile.layout,
        activity: profile.activity,
      }}
    >
      <SettlementPaving
        seeds={layout.paving}
        profile={profile}
        pavingTexture={pavingTexture}
      />
      <SettlementArchitecture
        seeds={layout.buildings}
        profile={profile}
        masonryAlbedo={masonryAlbedo}
        masonryBump={masonryBump}
        woodBump={woodBump}
      />
      <SignatureLandmark
        parts={layout.signature}
        profile={profile}
        masonryBump={masonryBump}
        woodBump={woodBump}
      />
      <SettlementActivity
        seeds={layout.activity}
        name={place.canonicalName}
      />
    </group>
  );
}
