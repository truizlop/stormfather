import { lazy, Suspense, useMemo } from "react";
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from "three";
import { useAtlasStore } from "../../store/useAtlasStore";
import type { DetailLevel } from "../types";
import { placeableGazetteer } from "./catalog";
import {
  gazetteerMarkerY,
  isGazetteerPlaceVisibleAtLod,
  isWithinGazetteerFocus,
  layoutGazetteerMarkerWorlds,
} from "./markerLayout";
import {
  markerArchetypeForVisualization,
  type MarkerArchetype,
} from "./markerArchetypes";
import {
  isSemanticSettlementDetailEligible,
  semanticSettlementProfile,
} from "./semanticSettlements";
import type { GazetteerKind, GazetteerPlace } from "./types";

const SemanticSettlementDetail = lazy(() =>
  import("./SemanticSettlementDetail").then((module) => ({
    default: module.SemanticSettlementDetail,
  })),
);

const markerColor: Record<GazetteerKind, string> = {
  nation: "#c5a76c",
  region: "#b79f70",
  city: "#e4c47c",
  town: "#d9b970",
  village: "#c9aa68",
  ruin: "#a8896a",
  institution: "#f2d993",
  "mountain-range": "#9d9180",
  hills: "#9f956b",
  plains: "#aea36f",
  valley: "#83956f",
  lake: "#5fb6c2",
  river: "#6cc5d0",
  sea: "#468fa7",
  ocean: "#326d8b",
  strait: "#4b9eb2",
  island: "#78966f",
  "island-chain": "#78966f",
  caves: "#8c7b70",
  landmark: "#c6a271",
};

function standardMaterial(color: string, roughness = 0.8) {
  return new MeshStandardMaterial({ color, roughness });
}

const markerMaterial: Record<GazetteerKind, MeshStandardMaterial> = {
  nation: standardMaterial(markerColor.nation, 0.7),
  region: standardMaterial(markerColor.region, 0.84),
  city: standardMaterial(markerColor.city, 0.76),
  town: standardMaterial(markerColor.town, 0.8),
  village: standardMaterial(markerColor.village, 0.85),
  ruin: standardMaterial(markerColor.ruin, 0.96),
  institution: standardMaterial(markerColor.institution, 0.72),
  "mountain-range": standardMaterial(markerColor["mountain-range"], 0.94),
  hills: standardMaterial(markerColor.hills, 0.94),
  plains: standardMaterial(markerColor.plains, 0.9),
  valley: standardMaterial(markerColor.valley, 0.92),
  lake: standardMaterial(markerColor.lake, 0.5),
  river: standardMaterial(markerColor.river, 0.48),
  sea: standardMaterial(markerColor.sea, 0.46),
  ocean: standardMaterial(markerColor.ocean, 0.42),
  strait: standardMaterial(markerColor.strait, 0.48),
  island: standardMaterial(markerColor.island, 0.9),
  "island-chain": standardMaterial(markerColor["island-chain"], 0.9),
  caves: standardMaterial(markerColor.caves, 0.98),
  landmark: standardMaterial(markerColor.landmark, 0.82),
};

const geometry = {
  box: new BoxGeometry(1, 1, 1),
  cylinder8: new CylinderGeometry(0.5, 0.5, 1, 8),
  cylinder16: new CylinderGeometry(0.5, 0.5, 1, 16),
  taperedCylinder: new CylinderGeometry(0.36, 0.5, 1, 10),
  cone4: new ConeGeometry(0.5, 1, 4),
  cone7: new ConeGeometry(0.5, 1, 7),
  cone12: new ConeGeometry(0.5, 1, 12),
  sphere: new SphereGeometry(0.5, 12, 8),
  rock: new DodecahedronGeometry(0.5, 0),
  plane: new PlaneGeometry(1, 1),
  ring: new RingGeometry(0.58, 0.88, 28),
  gateRing: new RingGeometry(0.11, 0.18, 18),
  selectedRing: new RingGeometry(0.26, 0.3, 28),
  wave: new TorusGeometry(0.5, 0.045, 5, 18, Math.PI * 1.18),
} as const satisfies Record<string, BufferGeometry>;

const material = {
  darkStone: standardMaterial("#4e4840", 0.96),
  stone: standardMaterial("#9f907b", 0.92),
  paleStone: standardMaterial("#d3c6a8", 0.84),
  roof: standardMaterial("#6d4e39", 0.9),
  canvas: standardMaterial("#d6c49a", 0.94),
  brass: new MeshStandardMaterial({
    color: "#c8a95c",
    metalness: 0.3,
    roughness: 0.55,
  }),
  vegetation: standardMaterial("#60795c", 0.94),
  road: standardMaterial("#7b6c58", 0.98),
  water: new MeshBasicMaterial({
    color: "#55b7ca",
    transparent: true,
    opacity: 0.78,
    side: DoubleSide,
  }),
  deepWater: new MeshBasicMaterial({
    color: "#2f7797",
    transparent: true,
    opacity: 0.8,
    side: DoubleSide,
  }),
  void: new MeshBasicMaterial({ color: "#16191a", side: DoubleSide }),
  lens: new MeshStandardMaterial({
    color: "#84eef0",
    emissive: "#24696d",
    emissiveIntensity: 0.9,
    roughness: 0.35,
  }),
  banner: new MeshStandardMaterial({
    color: "#d4b764",
    roughness: 0.68,
    side: DoubleSide,
  }),
  selection: new MeshBasicMaterial({
    color: "#6fe7ef",
    transparent: true,
    opacity: 0.92,
    side: DoubleSide,
  }),
} as const;

type Vec3 = [number, number, number];

interface PartProps {
  geometry: BufferGeometry;
  material: Material;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
}

function Part({
  geometry: partGeometry,
  material: partMaterial,
  position,
  rotation,
  scale,
}: PartProps) {
  return (
    <mesh
      geometry={partGeometry}
      material={partMaterial}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

function Building({
  primary,
  position = [0, 0, 0],
  scale = [0.1, 0.12, 0.1],
}: {
  primary: Material;
  position?: Vec3;
  scale?: Vec3;
}) {
  return (
    <group position={position}>
      <Part
        geometry={geometry.box}
        material={primary}
        position={[0, scale[1] / 2, 0]}
        scale={scale}
      />
      <Part
        geometry={geometry.cone4}
        material={material.roof}
        position={[0, scale[1] + 0.035, 0]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[scale[0] * 1.3, 0.07, scale[2] * 1.3]}
      />
    </group>
  );
}

function FortifiedCity({ primary }: { primary: Material }) {
  const corners: Vec3[] = [
    [-0.13, 0.065, -0.13],
    [0.13, 0.065, -0.13],
    [-0.13, 0.065, 0.13],
    [0.13, 0.065, 0.13],
  ];
  return (
    <>
      <Part
        geometry={geometry.box}
        material={material.stone}
        position={[0, 0.035, -0.14]}
        scale={[0.31, 0.07, 0.035]}
      />
      <Part
        geometry={geometry.box}
        material={material.stone}
        position={[0, 0.035, 0.14]}
        scale={[0.31, 0.07, 0.035]}
      />
      <Part
        geometry={geometry.box}
        material={material.stone}
        position={[-0.14, 0.035, 0]}
        scale={[0.035, 0.07, 0.31]}
      />
      <Part
        geometry={geometry.box}
        material={material.stone}
        position={[0.14, 0.035, 0]}
        scale={[0.035, 0.07, 0.31]}
      />
      {corners.map((position) => (
        <Part
          key={position.join(":")}
          geometry={geometry.cylinder8}
          material={primary}
          position={position}
          scale={[0.065, 0.13, 0.065]}
        />
      ))}
      <Building primary={primary} scale={[0.13, 0.16, 0.12]} />
    </>
  );
}

function TerraceCity({ primary }: { primary: Material }) {
  return (
    <>
      <Part
        geometry={geometry.box}
        material={material.stone}
        position={[0.02, 0.025, 0]}
        scale={[0.34, 0.05, 0.26]}
      />
      <Part
        geometry={geometry.box}
        material={primary}
        position={[-0.015, 0.075, -0.015]}
        scale={[0.27, 0.05, 0.2]}
      />
      <Part
        geometry={geometry.box}
        material={material.paleStone}
        position={[-0.05, 0.125, -0.03]}
        scale={[0.19, 0.05, 0.14]}
      />
      <Part
        geometry={geometry.box}
        material={primary}
        position={[-0.08, 0.175, -0.045]}
        scale={[0.1, 0.05, 0.08]}
      />
      <Part
        geometry={geometry.box}
        material={material.road}
        position={[0.12, 0.105, 0.055]}
        rotation={[0, 0, -0.35]}
        scale={[0.035, 0.22, 0.045]}
      />
    </>
  );
}

function PortCity({ primary }: { primary: Material }) {
  return (
    <>
      <Part
        geometry={geometry.cylinder16}
        material={material.water}
        position={[0, 0.007, 0]}
        scale={[0.23, 0.014, 0.23]}
      />
      <Part
        geometry={geometry.box}
        material={material.road}
        position={[0.08, 0.025, 0.02]}
        scale={[0.22, 0.04, 0.055]}
      />
      <Building
        primary={primary}
        position={[-0.08, 0.014, -0.07]}
        scale={[0.12, 0.11, 0.11]}
      />
      <Part
        geometry={geometry.cylinder8}
        material={material.darkStone}
        position={[0.1, 0.12, 0.02]}
        scale={[0.018, 0.2, 0.018]}
      />
      <Part
        geometry={geometry.cone4}
        material={material.canvas}
        position={[0.145, 0.15, 0.02]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[0.085, 0.11, 0.02]}
      />
    </>
  );
}

function AdministrativeCity({ primary }: { primary: Material }) {
  return (
    <>
      <Part
        geometry={geometry.box}
        material={primary}
        position={[0, 0.055, 0]}
        scale={[0.28, 0.11, 0.18]}
      />
      <Part
        geometry={geometry.sphere}
        material={material.brass}
        position={[0, 0.145, 0]}
        scale={[0.13, 0.09, 0.13]}
      />
      {[-0.1, -0.035, 0.035, 0.1].map((x) => (
        <Part
          key={x}
          geometry={geometry.cylinder8}
          material={material.paleStone}
          position={[x, 0.075, 0.105]}
          scale={[0.018, 0.15, 0.018]}
        />
      ))}
    </>
  );
}

function MarketCity({ primary }: { primary: Material }) {
  return (
    <>
      {[
        [-0.1, -0.07],
        [0.1, -0.07],
        [-0.1, 0.08],
        [0.1, 0.08],
      ].map(([x, z], index) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <Part
            geometry={geometry.box}
            material={primary}
            position={[0, 0.035, 0]}
            scale={[0.09, 0.07, 0.075]}
          />
          <Part
            geometry={geometry.cone4}
            material={index % 2 === 0 ? material.canvas : material.roof}
            position={[0, 0.095, 0]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[0.11, 0.07, 0.095]}
          />
        </group>
      ))}
      <Part
        geometry={geometry.cylinder8}
        material={material.brass}
        position={[0, 0.055, 0]}
        scale={[0.035, 0.11, 0.035]}
      />
    </>
  );
}

function MountainCity({ primary }: { primary: Material }) {
  return (
    <>
      <Part
        geometry={geometry.rock}
        material={material.darkStone}
        position={[0, 0.08, 0]}
        scale={[0.31, 0.16, 0.25]}
      />
      <Building
        primary={primary}
        position={[-0.1, 0.08, 0.025]}
        scale={[0.085, 0.09, 0.075]}
      />
      <Building
        primary={primary}
        position={[0.02, 0.13, -0.02]}
        scale={[0.09, 0.1, 0.08]}
      />
      <Building
        primary={primary}
        position={[0.12, 0.07, 0.04]}
        scale={[0.07, 0.075, 0.065]}
      />
    </>
  );
}

function Village({ primary }: { primary: Material }) {
  return (
    <>
      {[
        [-0.1, 0, -0.04, 0.11],
        [0.07, 0, -0.07, 0.13],
        [0.02, 0, 0.09, 0.09],
      ].map(([x, y, z, height]) => (
        <group key={`${x}:${z}`} position={[x, y, z]}>
          <Part
            geometry={geometry.cylinder8}
            material={primary}
            position={[0, height / 2, 0]}
            scale={[0.065, height, 0.065]}
          />
          <Part
            geometry={geometry.cone12}
            material={material.roof}
            position={[0, height + 0.03, 0]}
            scale={[0.085, 0.06, 0.085]}
          />
        </group>
      ))}
    </>
  );
}

function RuinedCity({ primary }: { primary: Material }) {
  return (
    <>
      <Part
        geometry={geometry.box}
        material={primary}
        position={[-0.09, 0.08, -0.02]}
        rotation={[0.08, 0.2, -0.12]}
        scale={[0.09, 0.16, 0.1]}
      />
      <Part
        geometry={geometry.box}
        material={material.darkStone}
        position={[0.07, 0.035, -0.05]}
        rotation={[0.1, 0.45, 0.24]}
        scale={[0.13, 0.07, 0.08]}
      />
      <Part
        geometry={geometry.cylinder8}
        material={primary}
        position={[0.1, 0.075, 0.08]}
        rotation={[0.2, 0, -0.4]}
        scale={[0.035, 0.15, 0.035]}
      />
      <Part
        geometry={geometry.rock}
        material={material.stone}
        position={[-0.02, 0.025, 0.1]}
        scale={[0.08, 0.05, 0.07]}
      />
    </>
  );
}

function NaturalFeature({
  archetype,
  primary,
}: {
  archetype: MarkerArchetype;
  primary: Material;
}) {
  switch (archetype) {
    case "mountain-range":
      return (
        <>
          <Part
            geometry={geometry.cone7}
            material={primary}
            position={[-0.1, 0.12, 0]}
            scale={[0.15, 0.24, 0.15]}
          />
          <Part
            geometry={geometry.cone7}
            material={material.stone}
            position={[0.04, 0.17, -0.02]}
            scale={[0.18, 0.34, 0.18]}
          />
          <Part
            geometry={geometry.cone7}
            material={primary}
            position={[0.14, 0.09, 0.05]}
            scale={[0.11, 0.18, 0.11]}
          />
        </>
      );
    case "hills":
      return (
        <>
          <Part
            geometry={geometry.sphere}
            material={primary}
            position={[-0.1, 0.045, 0]}
            scale={[0.16, 0.09, 0.13]}
          />
          <Part
            geometry={geometry.sphere}
            material={material.vegetation}
            position={[0.08, 0.055, -0.02]}
            scale={[0.19, 0.11, 0.15]}
          />
          <Part
            geometry={geometry.sphere}
            material={primary}
            position={[0.14, 0.035, 0.08]}
            scale={[0.11, 0.07, 0.1]}
          />
        </>
      );
    case "shattered-plains":
      return (
        <>
          <Part
            geometry={geometry.cylinder8}
            material={primary}
            position={[-0.1, 0.035, -0.04]}
            scale={[0.16, 0.07, 0.14]}
          />
          <Part
            geometry={geometry.cylinder8}
            material={material.stone}
            position={[0.08, 0.045, -0.06]}
            rotation={[0, 0.3, 0]}
            scale={[0.15, 0.09, 0.13]}
          />
          <Part
            geometry={geometry.cylinder8}
            material={primary}
            position={[0.02, 0.03, 0.1]}
            rotation={[0, -0.25, 0]}
            scale={[0.17, 0.06, 0.12]}
          />
        </>
      );
    case "valley":
      return (
        <>
          <Part
            geometry={geometry.cone7}
            material={primary}
            position={[-0.13, 0.08, 0]}
            scale={[0.13, 0.16, 0.25]}
          />
          <Part
            geometry={geometry.cone7}
            material={primary}
            position={[0.13, 0.08, 0]}
            scale={[0.13, 0.16, 0.25]}
          />
          <Part
            geometry={geometry.box}
            material={material.vegetation}
            position={[0, 0.008, 0]}
            scale={[0.08, 0.016, 0.3]}
          />
        </>
      );
    case "shallow-lake":
      return (
        <>
          <Part
            geometry={geometry.cylinder16}
            material={material.water}
            position={[0, 0.008, 0]}
            scale={[0.25, 0.016, 0.19]}
          />
          {[-0.14, -0.1, 0.13].map((x) => (
            <Part
              key={x}
              geometry={geometry.cylinder8}
              material={material.vegetation}
              position={[x, 0.035, 0.08]}
              scale={[0.012, 0.07, 0.012]}
            />
          ))}
        </>
      );
    case "river":
      return (
        <>
          <Part
            geometry={geometry.box}
            material={material.water}
            position={[-0.09, 0.006, 0.07]}
            rotation={[0, -0.48, 0]}
            scale={[0.2, 0.012, 0.055]}
          />
          <Part
            geometry={geometry.box}
            material={material.water}
            position={[0.03, 0.006, 0]}
            rotation={[0, 0.18, 0]}
            scale={[0.18, 0.012, 0.055]}
          />
          <Part
            geometry={geometry.box}
            material={material.water}
            position={[0.12, 0.006, -0.09]}
            rotation={[0, -0.5, 0]}
            scale={[0.18, 0.012, 0.055]}
          />
        </>
      );
    case "sea":
    case "ocean":
      return (
        <>
          <Part
            geometry={geometry.cylinder16}
            material={
              archetype === "ocean" ? material.deepWater : material.water
            }
            position={[0, 0.008, 0]}
            scale={[
              archetype === "ocean" ? 0.27 : 0.23,
              0.016,
              archetype === "ocean" ? 0.27 : 0.23,
            ]}
          />
          {[-0.09, 0.07].map((z, index) => (
            <Part
              key={z}
              geometry={geometry.wave}
              material={material.paleStone}
              position={[index === 0 ? -0.05 : 0.04, 0.022, z]}
              rotation={[Math.PI / 2, index === 0 ? 0.35 : -0.2, 0]}
              scale={[0.15, 0.15, 0.15]}
            />
          ))}
        </>
      );
    case "strait":
      return (
        <>
          <Part
            geometry={geometry.box}
            material={material.water}
            position={[0, 0.007, 0]}
            scale={[0.1, 0.014, 0.34]}
          />
          <Part
            geometry={geometry.rock}
            material={material.vegetation}
            position={[-0.14, 0.035, 0]}
            scale={[0.17, 0.07, 0.28]}
          />
          <Part
            geometry={geometry.rock}
            material={material.vegetation}
            position={[0.14, 0.035, 0]}
            scale={[0.17, 0.07, 0.28]}
          />
        </>
      );
    case "island":
      return (
        <>
          <Part
            geometry={geometry.cylinder16}
            material={material.water}
            position={[0, 0.006, 0]}
            scale={[0.24, 0.012, 0.2]}
          />
          <Part
            geometry={geometry.rock}
            material={primary}
            position={[0, 0.055, 0]}
            scale={[0.18, 0.11, 0.14]}
          />
        </>
      );
    case "island-chain":
      return (
        <>
          <Part
            geometry={geometry.cylinder16}
            material={material.water}
            position={[0, 0.006, 0]}
            scale={[0.26, 0.012, 0.19]}
          />
          {[
            [-0.13, 0.03, 0.05, 0.09],
            [0, 0.045, -0.03, 0.12],
            [0.13, 0.025, 0.045, 0.075],
          ].map(([x, y, z, size]) => (
            <Part
              key={`${x}:${z}`}
              geometry={geometry.rock}
              material={primary}
              position={[x, y, z]}
              scale={[size, size * 0.75, size]}
            />
          ))}
        </>
      );
    case "caves":
      return (
        <>
          <Part
            geometry={geometry.rock}
            material={primary}
            position={[-0.09, 0.09, 0]}
            scale={[0.14, 0.18, 0.14]}
          />
          <Part
            geometry={geometry.rock}
            material={primary}
            position={[0.09, 0.09, 0]}
            scale={[0.14, 0.18, 0.14]}
          />
          <Part
            geometry={geometry.rock}
            material={primary}
            position={[0, 0.18, 0]}
            scale={[0.2, 0.1, 0.15]}
          />
          <Part
            geometry={geometry.sphere}
            material={material.void}
            position={[0, 0.075, 0.105]}
            scale={[0.075, 0.11, 0.025]}
          />
        </>
      );
    case "rock-formation":
      return (
        <>
          <Part
            geometry={geometry.rock}
            material={primary}
            position={[-0.1, 0.075, 0.02]}
            rotation={[0.2, 0, -0.1]}
            scale={[0.14, 0.15, 0.13]}
          />
          <Part
            geometry={geometry.rock}
            material={material.stone}
            position={[0.04, 0.12, -0.02]}
            rotation={[0, 0.3, 0.14]}
            scale={[0.16, 0.24, 0.14]}
          />
          <Part
            geometry={geometry.rock}
            material={primary}
            position={[0.14, 0.055, 0.06]}
            scale={[0.1, 0.11, 0.1]}
          />
        </>
      );
    default:
      return null;
  }
}

function Institution({
  archetype,
  primary,
}: {
  archetype: MarkerArchetype;
  primary: Material;
}) {
  switch (archetype) {
    case "library":
      return (
        <>
          <Part
            geometry={geometry.box}
            material={primary}
            position={[0, 0.07, 0]}
            scale={[0.27, 0.14, 0.18]}
          />
          <Part
            geometry={geometry.cone4}
            material={material.roof}
            position={[0, 0.17, 0]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[0.2, 0.08, 0.17]}
          />
          {[-0.09, 0, 0.09].map((x) => (
            <Part
              key={x}
              geometry={geometry.box}
              material={material.brass}
              position={[x, 0.075, 0.1]}
              scale={[0.025, 0.11, 0.018]}
            />
          ))}
        </>
      );
    case "palace":
      return (
        <>
          <Part
            geometry={geometry.cylinder16}
            material={primary}
            position={[0, 0.07, 0]}
            scale={[0.19, 0.14, 0.19]}
          />
          <Part
            geometry={geometry.sphere}
            material={material.brass}
            position={[0, 0.17, 0]}
            scale={[0.15, 0.1, 0.15]}
          />
          <Part
            geometry={geometry.sphere}
            material={material.lens}
            position={[0, 0.275, 0]}
            scale={0.035}
          />
        </>
      );
    case "hospital":
      return (
        <>
          <Part
            geometry={geometry.box}
            material={primary}
            position={[0, 0.07, 0]}
            scale={[0.27, 0.14, 0.19]}
          />
          <Part
            geometry={geometry.sphere}
            material={material.paleStone}
            position={[0, 0.155, 0]}
            scale={[0.13, 0.07, 0.12]}
          />
          <Part
            geometry={geometry.box}
            material={material.lens}
            position={[0, 0.085, 0.102]}
            scale={[0.025, 0.095, 0.015]}
          />
          <Part
            geometry={geometry.box}
            material={material.lens}
            position={[0, 0.085, 0.103]}
            scale={[0.08, 0.025, 0.016]}
          />
        </>
      );
    case "monastery":
      return (
        <>
          <Part
            geometry={geometry.box}
            material={primary}
            position={[0, 0.07, 0]}
            scale={[0.25, 0.14, 0.2]}
          />
          <Part
            geometry={geometry.cone4}
            material={material.roof}
            position={[0, 0.17, 0]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[0.19, 0.11, 0.16]}
          />
          <Part
            geometry={geometry.taperedCylinder}
            material={material.brass}
            position={[0, 0.265, 0]}
            scale={[0.035, 0.12, 0.035]}
          />
        </>
      );
    case "warcamp":
      return (
        <>
          {[
            [-0.1, -0.06],
            [0.08, -0.07],
            [0.01, 0.09],
          ].map(([x, z], index) => (
            <Part
              key={`${x}:${z}`}
              geometry={geometry.cone4}
              material={index === 1 ? primary : material.canvas}
              position={[x, 0.055, z]}
              rotation={[0, Math.PI / 4, 0]}
              scale={[0.09, 0.11, 0.08]}
            />
          ))}
          <Part
            geometry={geometry.cylinder8}
            material={material.darkStone}
            position={[-0.18, 0.1, 0.08]}
            scale={[0.014, 0.2, 0.014]}
          />
          <Part
            geometry={geometry.plane}
            material={material.banner}
            position={[-0.135, 0.16, 0.08]}
            scale={[0.08, 0.055, 1]}
          />
        </>
      );
    case "oathgate":
      return (
        <>
          <Part
            geometry={geometry.gateRing}
            material={material.brass}
            position={[0, 0.018, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
          <Part
            geometry={geometry.cylinder16}
            material={primary}
            position={[0, 0.035, 0]}
            scale={[0.095, 0.07, 0.095]}
          />
          {[-0.16, 0.16].map((x) => (
            <Part
              key={x}
              geometry={geometry.cylinder8}
              material={primary}
              position={[x, 0.1, 0]}
              scale={[0.035, 0.2, 0.035]}
            />
          ))}
        </>
      );
    case "lighthouse":
      return (
        <>
          <Part
            geometry={geometry.taperedCylinder}
            material={primary}
            position={[0, 0.115, 0]}
            scale={[0.1, 0.23, 0.1]}
          />
          <Part
            geometry={geometry.cylinder16}
            material={material.lens}
            position={[0, 0.245, 0]}
            scale={[0.075, 0.055, 0.075]}
          />
          <Part
            geometry={geometry.cone12}
            material={material.roof}
            position={[0, 0.305, 0]}
            scale={[0.105, 0.07, 0.105]}
          />
          <Part
            geometry={geometry.cylinder16}
            material={material.water}
            position={[0, 0.006, 0]}
            scale={[0.2, 0.012, 0.2]}
          />
        </>
      );
    case "harbor":
      return (
        <>
          <Part
            geometry={geometry.cylinder16}
            material={material.water}
            position={[0, 0.006, 0]}
            scale={[0.25, 0.012, 0.22]}
          />
          {[-0.11, 0.11].map((x) => (
            <Part
              key={x}
              geometry={geometry.box}
              material={material.road}
              position={[x, 0.025, 0.04]}
              scale={[0.055, 0.04, 0.27]}
            />
          ))}
          <Part
            geometry={geometry.box}
            material={primary}
            position={[0, 0.05, -0.1]}
            scale={[0.28, 0.1, 0.07]}
          />
        </>
      );
    case "processional-way":
      return (
        <>
          <Part
            geometry={geometry.box}
            material={material.road}
            position={[0, 0.01, 0]}
            scale={[0.11, 0.02, 0.36]}
          />
          {[-0.11, 0.11].flatMap((x) =>
            [-0.12, 0, 0.12].map((z) => (
              <Part
                key={`${x}:${z}`}
                geometry={geometry.cylinder8}
                material={primary}
                position={[x, 0.065, z]}
                scale={[0.025, 0.13, 0.025]}
              />
            )),
          )}
        </>
      );
    default:
      return null;
  }
}

function MarkerMiniature({
  archetype,
  primary,
}: {
  archetype: MarkerArchetype;
  primary: Material;
}) {
  switch (archetype) {
    case "nation-standard":
      return (
        <>
          <Part
            geometry={geometry.cylinder8}
            material={primary}
            position={[0, 0.025, 0]}
            scale={[0.16, 0.05, 0.16]}
          />
          <Part
            geometry={geometry.cylinder8}
            material={material.darkStone}
            position={[0, 0.14, 0]}
            scale={[0.018, 0.23, 0.018]}
          />
          <Part
            geometry={geometry.plane}
            material={material.banner}
            position={[0.065, 0.2, 0]}
            scale={[0.12, 0.075, 1]}
          />
        </>
      );
    case "fortified-city":
      return <FortifiedCity primary={primary} />;
    case "terrace-city":
      return <TerraceCity primary={primary} />;
    case "port-city":
      return <PortCity primary={primary} />;
    case "administrative-city":
      return <AdministrativeCity primary={primary} />;
    case "market-city":
      return <MarketCity primary={primary} />;
    case "mountain-city":
      return <MountainCity primary={primary} />;
    case "village":
      return <Village primary={primary} />;
    case "ruined-city":
      return <RuinedCity primary={primary} />;
    case "mountain-range":
    case "hills":
    case "shattered-plains":
    case "valley":
    case "shallow-lake":
    case "river":
    case "sea":
    case "ocean":
    case "strait":
    case "island":
    case "island-chain":
    case "caves":
    case "rock-formation":
      return <NaturalFeature archetype={archetype} primary={primary} />;
    case "library":
    case "palace":
    case "hospital":
    case "monastery":
    case "warcamp":
    case "oathgate":
    case "lighthouse":
    case "harbor":
    case "processional-way":
      return <Institution archetype={archetype} primary={primary} />;
  }
}

function GazetteerMarker({
  place,
  selected,
  markerWorld,
  regionalClusterSize,
}: {
  place: GazetteerPlace;
  selected: boolean;
  markerWorld: readonly [number, number];
  regionalClusterSize: number;
}) {
  const focusGazetteerPlace = useAtlasStore(
    (state) => state.focusGazetteerPlace,
  );
  if (place.world === null) {
    return null;
  }
  const [x, z] = markerWorld;
  const scale = selected ? 1.45 : 1;
  const archetype = markerArchetypeForVisualization(place.visualization);

  return (
    <group
      name={`Gazetteer_${place.id}`}
      position={[x, gazetteerMarkerY(place, markerWorld), z]}
      scale={scale}
      dispose={null}
      userData={{
        gazetteerId: place.id,
        visualization: place.visualization,
        regionalClusterSize,
      }}
      onClick={(event) => {
        event.stopPropagation();
        focusGazetteerPlace(place.id);
      }}
    >
      <MarkerMiniature
        archetype={archetype}
        primary={markerMaterial[place.kind]}
      />
      {selected && (
        <Part
          geometry={geometry.selectedRing}
          material={material.selection}
          position={[0, 0.012, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
    </group>
  );
}

export interface GazetteerMarkersProps {
  detailLevel: DetailLevel;
  selectedId?: string;
  /**
   * Optional focus culling for city/street views. Positions are Stormfather
   * world-space `[x, z]`; omitting it preserves the complete atlas layer.
   */
  focusWorld?: readonly [number, number];
  maxDistance?: number;
}

/** Terrain-aware, clickable place layer shared by the map and search UI. */
export function GazetteerMarkers({
  detailLevel,
  selectedId,
  focusWorld,
  maxDistance = detailLevel === "street" ? 4 : detailLevel === "city" ? 9 : 160,
}: GazetteerMarkersProps) {
  const visiblePlacements = useMemo(
    () =>
      layoutGazetteerMarkerWorlds(
        placeableGazetteer.filter(
          (place) =>
            isGazetteerPlaceVisibleAtLod(place, detailLevel) &&
            isWithinGazetteerFocus(place, focusWorld, maxDistance),
        ),
      ),
    [detailLevel, focusWorld, maxDistance],
  );

  return (
    <group name="GazetteerMarkers">
      {visiblePlacements.map(({ place, world, regionalClusterSize }) => {
        const selected = place.id === selectedId;
        const profile = selected
          ? semanticSettlementProfile(place.id)
          : undefined;
        if (
          profile &&
          isSemanticSettlementDetailEligible(place, detailLevel)
        ) {
          return (
            <Suspense
              key={place.id}
              fallback={
                <GazetteerMarker
                  place={place}
                  markerWorld={world}
                  regionalClusterSize={regionalClusterSize}
                  selected={selected}
                />
              }
            >
              <SemanticSettlementDetail
                place={place}
                markerWorld={world}
                detailLevel={detailLevel === "street" ? "street" : "city"}
                profile={profile}
              />
            </Suspense>
          );
        }
        return (
          <GazetteerMarker
            key={place.id}
            place={place}
            markerWorld={world}
            regionalClusterSize={regionalClusterSize}
            selected={selected}
          />
        );
      })}
    </group>
  );
}
