import { Line, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { locations } from "../locations";
import { useAtlasStore } from "../../store/useAtlasStore";
import {
  majorRoads,
  mountainChains,
  rosharOutline,
  shinovarOutline,
} from "./rosharOutline";

function shapeFromOutline(points: readonly (readonly number[])[]) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}

function configureTerrainTexture(texture: THREE.Texture, repeat: number) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function ContinentMesh() {
  const [stoneTexture, grassTexture] = useTexture([
    `${import.meta.env.BASE_URL}textures/crem-stone-albedo.jpg`,
    `${import.meta.env.BASE_URL}textures/shinovar-grass-albedo.jpg`,
  ]);

  const continentGeometry = useMemo(
    () =>
      new THREE.ExtrudeGeometry(shapeFromOutline(rosharOutline), {
        depth: 0.85,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.35,
        bevelThickness: 0.28,
        curveSegments: 1,
      }),
    [],
  );
  const shinovarGeometry = useMemo(
    () => new THREE.ShapeGeometry(shapeFromOutline(shinovarOutline)),
    [],
  );

  useMemo(() => {
    configureTerrainTexture(stoneTexture, 0.105);
    configureTerrainTexture(grassTexture, 0.12);
  }, [grassTexture, stoneTexture]);

  return (
    <>
      <mesh
        geometry={continentGeometry}
        rotation-x={-Math.PI / 2}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial
          map={stoneTexture}
          color="#8f8c80"
          roughness={0.93}
          metalness={0.03}
        />
      </mesh>
      <mesh
        geometry={shinovarGeometry}
        rotation-x={-Math.PI / 2}
        position-y={1.17}
        receiveShadow
      >
        <meshStandardMaterial
          map={grassTexture}
          color="#8ca66e"
          roughness={0.98}
        />
      </mesh>
    </>
  );
}

function SeasAndLakes() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.24} receiveShadow>
        <planeGeometry args={[148, 90, 1, 1]} />
        <meshPhysicalMaterial
          color="#082d40"
          roughness={0.28}
          metalness={0.26}
          clearcoat={0.32}
          clearcoatRoughness={0.35}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-12, 1.2, -9]}>
        <circleGeometry args={[5.2, 48]} />
        <meshPhysicalMaterial
          color="#1b8291"
          emissive="#073a43"
          emissiveIntensity={0.35}
          roughness={0.18}
          metalness={0.18}
          transparent
          opacity={0.88}
        />
      </mesh>
      {[
        [-48, 12, 4.4, 2.9],
        [-52, 8, 2.1, 1.4],
        [-47, 17, 1.4, 0.85],
      ].map(([x, z, sx, sz], index) => (
        <mesh
          key={index}
          rotation-x={-Math.PI / 2}
          position={[x, 0.1, z]}
          scale={[sx, sz, 1]}
          castShadow
          receiveShadow
        >
          <circleGeometry args={[1, 20]} />
          <meshStandardMaterial color="#394749" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

function MountainRanges() {
  const geometry = useMemo(() => new THREE.ConeGeometry(0.72, 2.8, 7), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4b4b45",
        roughness: 0.96,
        metalness: 0.01,
      }),
    [],
  );

  return (
    <group>
      {mountainChains.map((mountain, index) => (
        <mesh
          key={`${mountain.x}-${mountain.z}-${index}`}
          geometry={geometry}
          material={material}
          position={[mountain.x, 2.05 * mountain.scale, mountain.z]}
          scale={[
            mountain.scale,
            1.3 * mountain.scale,
            0.78 * mountain.scale,
          ]}
          rotation-y={(index * 1.618) % Math.PI}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

function CartographicLines() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const showRoads = detailLevel !== "continent";

  return (
    <group>
      {showRoads &&
        majorRoads.map((road, index) => (
          <Line
            key={index}
            points={road.map(([x, z]) => [x, 1.25, z])}
            color="#b79861"
            lineWidth={0.72}
            transparent
            opacity={0.72}
            dashed
            dashSize={0.38}
            gapSize={0.2}
          />
        ))}
      {locations
        .filter((location) => location.id !== "roshar")
        .map((location) => (
          <mesh
            key={location.id}
            position={[location.coordinates.x, 1.35, location.coordinates.z]}
          >
            <cylinderGeometry args={[0.15, 0.27, 0.6, 8]} />
            <meshStandardMaterial
              color={location.accentColor}
              emissive={location.accentColor}
              emissiveIntensity={0.85}
              toneMapped={false}
            />
          </mesh>
        ))}
    </group>
  );
}

function ReshiIsles() {
  return (
    <group>
      {Array.from({ length: 17 }, (_, index) => {
        const x = -29 + index * 3.2;
        const z = -21 + Math.sin(index * 0.84) * 2.2;
        const size = 0.55 + (index % 4) * 0.18;
        return (
          <mesh
            key={index}
            position={[x, 0.5, z]}
            scale={[size * 1.7, size * 0.6, size]}
            castShadow
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={index % 5 === 0 ? "#3f6545" : "#4e5949"}
              roughness={0.95}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function RosharTerrain() {
  return (
    <group>
      <SeasAndLakes />
      <ContinentMesh />
      <MountainRanges />
      <ReshiIsles />
      <CartographicLines />
    </group>
  );
}
