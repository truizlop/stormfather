import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type Ref,
} from "react";
import * as THREE from "three";
import {
  CHASMFIEND_FOOT_COUNT,
  CHASMFIEND_LEG_GEOMETRY,
  CHASMFIEND_LEG_ROWS,
  chasmfiendLegLiftAt,
  chasmfiendLegYawAt,
  type CreatureSpecies,
} from "./ecology";

const shellMaterial = (
  <meshStandardMaterial
    color="#594735"
    roughness={0.73}
    metalness={0.07}
  />
);

function Limb({
  position,
  rotation,
  length,
  radius,
  color = "#44372d",
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
  radius: number;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[radius * 0.72, radius, length, 5]} />
      <meshStandardMaterial color={color} roughness={0.88} />
    </mesh>
  );
}

export interface CreatureRigHandle {
  update: (
    gaitPhase: number,
    stormStrength: number,
    footOffsets?: Float32Array,
  ) => void;
}

const CHASMFIEND_BODY_SECTIONS = [
  {
    position: [0, 0.62, 1.14],
    scale: [0.32, 0.34, 0.58],
    rotationY: -0.04,
  },
  {
    position: [0, 0.67, 0.55],
    scale: [0.4, 0.44, 0.66],
    rotationY: 0.03,
  },
  {
    position: [0, 0.7, -0.1],
    scale: [0.44, 0.5, 0.7],
    rotationY: -0.025,
  },
  {
    position: [0, 0.66, -0.75],
    scale: [0.37, 0.42, 0.58],
    rotationY: 0.035,
  },
] as const;

function useChasmfiendResources() {
  const resources = useMemo(
    () => ({
      geometries: {
        shell: new THREE.DodecahedronGeometry(1, 0),
        plate: new THREE.CylinderGeometry(0.86, 1, 1, 7, 1, false),
        limb: new THREE.CylinderGeometry(0.72, 1, 1, 6, 1, false),
        joint: new THREE.IcosahedronGeometry(1, 0),
        spine: new THREE.ConeGeometry(1, 1, 6, 1, false),
        eye: new THREE.SphereGeometry(1, 6, 4),
      },
      materials: {
        shell: new THREE.MeshPhysicalMaterial({
          color: "#1d1924",
          roughness: 0.5,
          metalness: 0.08,
          clearcoat: 0.28,
          clearcoatRoughness: 0.48,
          iridescence: 0.12,
          iridescenceIOR: 1.3,
          iridescenceThicknessRange: [120, 220],
          flatShading: true,
        }),
        plate: new THREE.MeshPhysicalMaterial({
          color: "#31283a",
          roughness: 0.4,
          metalness: 0.12,
          clearcoat: 0.34,
          clearcoatRoughness: 0.42,
          iridescence: 0.2,
          iridescenceIOR: 1.32,
          iridescenceThicknessRange: [130, 260],
          flatShading: true,
        }),
        edge: new THREE.MeshPhysicalMaterial({
          color: "#5a4d62",
          roughness: 0.36,
          metalness: 0.16,
          clearcoat: 0.3,
          clearcoatRoughness: 0.38,
          iridescence: 0.24,
          iridescenceIOR: 1.35,
          iridescenceThicknessRange: [140, 280],
          flatShading: true,
        }),
        joint: new THREE.MeshStandardMaterial({
          color: "#111015",
          roughness: 0.9,
          metalness: 0.02,
          flatShading: true,
        }),
        eye: new THREE.MeshStandardMaterial({
          color: "#c2efb5",
          emissive: "#43a862",
          emissiveIntensity: 1.4,
          roughness: 0.24,
        }),
      },
    }),
    [],
  );

  useEffect(
    () => () => {
      for (const geometry of Object.values(resources.geometries)) {
        geometry.dispose();
      }
      for (const material of Object.values(resources.materials)) {
        material.dispose();
      }
    },
    [resources],
  );

  return resources;
}

function ChasmfiendLimbSegment({
  dx,
  dy,
  geometry,
  material,
  meshRef,
  radius,
  castsShadow = true,
}: {
  dx: number;
  dy: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  meshRef?: (node: THREE.Mesh | null) => void;
  radius: number;
  castsShadow?: boolean;
}) {
  const length = Math.hypot(dx, dy);
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[dx / 2, dy / 2, 0]}
      rotation-z={Math.atan2(-dx, dy)}
      scale={[radius, length, radius]}
      castShadow={castsShadow}
      receiveShadow
    />
  );
}

function ChasmfiendLeg({
  rowZ,
  side,
  setHipRef,
  setLowerRef,
  setFootRef,
  resources,
  compact,
}: {
  rowZ: number;
  side: -1 | 1;
  setHipRef: (node: THREE.Group | null) => void;
  setLowerRef: (node: THREE.Mesh | null) => void;
  setFootRef: (node: THREE.Mesh | null) => void;
  resources: ReturnType<typeof useChasmfiendResources>;
  compact: boolean;
}) {
  const rowReach = 1 - Math.abs(rowZ) * 0.1;
  const upperX =
    side * CHASMFIEND_LEG_GEOMETRY.upperReach * rowReach;
  const upperY = CHASMFIEND_LEG_GEOMETRY.upperDrop;
  const lowerX =
    side * CHASMFIEND_LEG_GEOMETRY.lowerReach * rowReach;
  const lowerY = CHASMFIEND_LEG_GEOMETRY.lowerDrop;
  if (compact) {
    return (
      <group
        ref={setHipRef}
        position={[
          side * CHASMFIEND_LEG_GEOMETRY.hipX,
          0.62,
          rowZ,
        ]}
      >
        <ChasmfiendLimbSegment
          dx={upperX + lowerX}
          dy={upperY + lowerY}
          geometry={resources.geometries.limb}
          material={resources.materials.shell}
          meshRef={setLowerRef}
          radius={0.05}
          castsShadow={false}
        />
      </group>
    );
  }
  return (
    <group
      ref={setHipRef}
      position={[
        side * CHASMFIEND_LEG_GEOMETRY.hipX,
        0.62,
        rowZ,
      ]}
    >
      <ChasmfiendLimbSegment
        dx={upperX}
        dy={upperY}
        geometry={resources.geometries.limb}
        material={resources.materials.shell}
        radius={0.055}
      />
      <group
        position={[upperX, upperY, 0]}
      >
        <mesh
          geometry={resources.geometries.joint}
          material={resources.materials.joint}
          scale={[0.07, 0.065, 0.07]}
          castShadow
        />
        <ChasmfiendLimbSegment
          dx={lowerX}
          dy={lowerY}
          geometry={resources.geometries.limb}
          material={resources.materials.joint}
          meshRef={setLowerRef}
          radius={0.045}
        />
        <mesh
          ref={setFootRef}
          geometry={resources.geometries.joint}
          material={resources.materials.edge}
          position={[
            lowerX,
            lowerY + CHASMFIEND_LEG_GEOMETRY.footClearance,
            CHASMFIEND_LEG_GEOMETRY.footZ,
          ]}
          scale={[
            0.06,
            CHASMFIEND_LEG_GEOMETRY.footVerticalRadius,
            0.15,
          ]}
          castShadow
          receiveShadow
        />
      </group>
    </group>
  );
}

function Chasmfiend({
  rigRef,
  compact,
}: {
  rigRef?: Ref<CreatureRigHandle>;
  compact: boolean;
}) {
  const resources = useChasmfiendResources();
  const hipRefs = useRef<Array<THREE.Group | null>>([]);
  const lowerRefs = useRef<Array<THREE.Mesh | null>>([]);
  const footRefs = useRef<Array<THREE.Mesh | null>>([]);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);

  useImperativeHandle(
    rigRef,
    () => ({
      update(gaitPhase, stormStrength, footOffsets) {
        const storm = Math.max(0, Math.min(1, stormStrength));
        for (
          let legIndex = 0;
          legIndex < CHASMFIEND_FOOT_COUNT;
          legIndex += 1
        ) {
          const row = Math.floor(legIndex / 2);
          const side = legIndex % 2 === 0 ? -1 : 1;
          const rowZ = CHASMFIEND_LEG_ROWS[row] ?? 0;
          const rowReach = 1 - Math.abs(rowZ) * 0.1;
          const hip = hipRefs.current[legIndex];
          if (hip) {
            hip.rotation.y = chasmfiendLegYawAt(
              legIndex,
              gaitPhase,
              storm,
            );
          }
          const verticalOffset = Math.max(
            -0.28,
            Math.min(0.28, footOffsets?.[legIndex] ?? 0),
          );
          const swingLift = chasmfiendLegLiftAt(
            legIndex,
            gaitPhase,
            storm,
          );
          const lowerX =
            side *
            CHASMFIEND_LEG_GEOMETRY.lowerReach *
            rowReach;
          const lowerY = compact
            ? CHASMFIEND_LEG_GEOMETRY.upperDrop +
              CHASMFIEND_LEG_GEOMETRY.lowerDrop +
              verticalOffset +
              swingLift
            : CHASMFIEND_LEG_GEOMETRY.lowerDrop +
              verticalOffset +
              swingLift;
          const animatedLowerX = compact
            ? side *
              (CHASMFIEND_LEG_GEOMETRY.upperReach +
                CHASMFIEND_LEG_GEOMETRY.lowerReach) *
              rowReach
            : lowerX;
          const lower = lowerRefs.current[legIndex];
          if (lower) {
            lower.position.y = lowerY / 2;
            lower.rotation.z = Math.atan2(-animatedLowerX, lowerY);
            lower.scale.y = Math.hypot(animatedLowerX, lowerY);
          }
          const foot = footRefs.current[legIndex];
          if (foot) {
            foot.position.y =
              lowerY + CHASMFIEND_LEG_GEOMETRY.footClearance;
          }
        }
        if (head.current) {
          head.current.rotation.x =
            Math.sin(gaitPhase * 0.5) * 0.022 + storm * 0.025;
        }
        if (tail.current) {
          tail.current.rotation.y = Math.sin(gaitPhase * 0.38) * 0.07;
        }
      },
    }),
    [compact],
  );

  return (
    <group name="Chasmfiend procedural model" dispose={null}>
      {CHASMFIEND_BODY_SECTIONS.map((section, index) => (
        <mesh
          key={section.position[2]}
          geometry={resources.geometries.shell}
          material={
            index % 2 === 0
              ? resources.materials.shell
              : resources.materials.plate
          }
          position={section.position}
          rotation-y={section.rotationY}
          scale={section.scale}
          castShadow
          receiveShadow
        />
      ))}
      {[
        { z: 1.1, y: 1.01, x: 0.3, depth: 0.09, radius: 0.4 },
        { z: 0.55, y: 1.09, x: 0.37, depth: 0.1, radius: 0.51 },
        { z: -0.02, y: 1.13, x: 0.4, depth: 0.105, radius: 0.53 },
        { z: -0.58, y: 1.01, x: 0.34, depth: 0.09, radius: 0.42 },
      ].filter((_, index) => !compact || index % 2 === 0).map((plate) => (
        <mesh
          key={plate.z}
          geometry={resources.geometries.plate}
          material={resources.materials.plate}
          position={[0, plate.y, plate.z]}
          scale={[plate.x, plate.depth, plate.radius]}
          castShadow
        />
      ))}
      {CHASMFIEND_LEG_ROWS.flatMap((rowZ, row) =>
        ([-1, 1] as const).map((side, sideIndex) => (
          <ChasmfiendLeg
            key={`${rowZ}-${side}`}
            rowZ={rowZ}
            side={side}
            setHipRef={(node) => {
              hipRefs.current[row * 2 + sideIndex] = node;
            }}
            setLowerRef={(node) => {
              lowerRefs.current[row * 2 + sideIndex] = node;
            }}
            setFootRef={(node) => {
              footRefs.current[row * 2 + sideIndex] = node;
            }}
            resources={resources}
            compact={compact}
          />
        )),
      )}
      <group ref={head} position={[0, 0.65, -1.16]}>
        <mesh
          geometry={resources.geometries.shell}
          material={resources.materials.shell}
          position={[0, -0.04, -0.26]}
          scale={[0.34, 0.34, 0.46]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={resources.geometries.plate}
          material={resources.materials.plate}
          position={[0, 0.25, -0.26]}
          scale={[0.3, 0.075, 0.34]}
          castShadow
        />
        {([-1, 1] as const).map((side) => (
          <mesh
            key={`eye-${side}`}
            geometry={resources.geometries.eye}
            material={resources.materials.eye}
            position={[side * 0.26, 0.045, -0.4]}
            scale={0.045}
          />
        ))}
        {!compact &&
          ([-1, 1] as const).map((side) => (
            <mesh
              key={`mandible-${side}`}
              geometry={resources.geometries.spine}
              material={resources.materials.joint}
              position={[side * 0.16, -0.12, -0.7]}
              rotation={[-Math.PI / 2, 0, side * 0.16]}
              scale={[0.065, 0.62, 0.065]}
              castShadow
            />
          ))}
      </group>
      <group ref={tail} position={[0, 0.57, 1.15]}>
        <mesh
          geometry={resources.geometries.shell}
          material={resources.materials.joint}
          position={[0, -0.035, 0.35]}
          scale={[0.26, 0.27, 0.44]}
          castShadow
        />
        {!compact &&
          ([-1, 1] as const).map((side) => (
            <mesh
              key={`tail-${side}`}
              geometry={resources.geometries.spine}
              material={resources.materials.edge}
              position={[side * 0.12, -0.05, 0.82]}
              rotation={[Math.PI / 2, 0, side * -0.18]}
              scale={[0.085, 0.52, 0.085]}
              castShadow
            />
          ))}
      </group>
      {[
        { z: 1.08, y: 1.25, height: 0.26, radius: 0.07 },
        { z: 0.6, y: 1.37, height: 0.4, radius: 0.085 },
        { z: 0.12, y: 1.44, height: 0.52, radius: 0.09 },
        { z: -0.36, y: 1.36, height: 0.4, radius: 0.08 },
        { z: -0.78, y: 1.2, height: 0.28, radius: 0.065 },
      ].filter((_, index) => !compact || index % 2 === 0).map((spine) => (
        <mesh
          key={spine.z}
          geometry={resources.geometries.spine}
          material={resources.materials.edge}
          position={[0, spine.y, spine.z]}
          scale={[spine.radius, spine.height, spine.radius]}
          castShadow
        >
        </mesh>
      ))}
      {!compact &&
        ([-1, 1] as const).flatMap((side) =>
          [-0.72, -0.2, 0.32, 0.84].map((z) => (
            <mesh
              key={`${side}-${z}`}
              geometry={resources.geometries.spine}
              material={resources.materials.plate}
              position={[side * 0.42, 0.81, z]}
              rotation={[0, 0, side * -0.72]}
              scale={[0.055, 0.18, 0.055]}
              castShadow
            />
          )),
        )}
      <mesh
        geometry={resources.geometries.plate}
        material={resources.materials.joint}
        position={[0, 0.35, -0.05]}
        scale={[0.31, 0.08, 1.08]}
        receiveShadow
      />
      {!compact &&
        ([-1, 1] as const).map((side) => (
          <mesh
            key={`jaw-${side}`}
            geometry={resources.geometries.spine}
            material={resources.materials.edge}
            position={[side * 0.1, 0.48, -1.9]}
            rotation={[-Math.PI / 2, 0, side * -0.08]}
            scale={[0.055, 0.44, 0.055]}
            castShadow
          />
        ))}
    </group>
  );
}

function Chull() {
  return (
    <group name="Chull procedural model">
      <mesh position={[0, 0.32, 0]} scale={[0.75, 0.56, 1]} castShadow>
        <dodecahedronGeometry args={[0.48, 1]} />
        {shellMaterial}
      </mesh>
      <mesh position={[0, 0.24, -0.53]} scale={[0.52, 0.4, 0.55]} castShadow>
        <icosahedronGeometry args={[0.36, 1]} />
        <meshStandardMaterial color="#49392e" roughness={0.82} />
      </mesh>
      {[-0.32, 0, 0.32].flatMap((z) =>
        [-1, 1].map((side) => (
          <Limb
            key={`${z}-${side}`}
            position={[side * 0.48, 0.02, z]}
            rotation={[0, 0, side * -0.72]}
            length={0.56}
            radius={0.055}
          />
        )),
      )}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.18, 0.26, -0.79]}
          rotation={[1.25, 0, side * -0.18]}
          castShadow
        >
          <coneGeometry args={[0.045, 0.34, 6]} />
          <meshStandardMaterial color="#302a25" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 0.69, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.035, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#6d553d" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Axehound() {
  return (
    <group name="Axehound procedural model">
      <mesh position={[0, 0.31, 0.03]} scale={[0.42, 0.33, 1]} castShadow>
        <icosahedronGeometry args={[0.43, 1]} />
        <meshStandardMaterial color="#705844" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.31, -0.47]} scale={[0.72, 0.5, 0.7]} castShadow>
        <dodecahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color="#553f34" roughness={0.8} />
      </mesh>
      {[-0.26, 0, 0.28].flatMap((z) =>
        [-1, 1].map((side) => (
          <Limb
            key={`${z}-${side}`}
            position={[side * 0.3, 0.02, z]}
            rotation={[0, 0, side * -0.45]}
            length={0.43}
            radius={0.04}
            color="#493a31"
          />
        )),
      )}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.16, 0.3, -0.72]}
          rotation={[1.25, 0, side * -0.36]}
          castShadow
        >
          <coneGeometry args={[0.055, 0.36, 5]} />
          <meshStandardMaterial color="#2c2722" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.35, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.58, 7]} />
        <meshStandardMaterial color="#5b4738" roughness={0.86} />
      </mesh>
    </group>
  );
}

function Skyeel() {
  return (
    <group name="Skyeel procedural model" rotation-x={0.05}>
      {Array.from({ length: 8 }, (_, index) => {
        const amount = index / 7;
        const radius = 0.18 * (1 - amount * 0.72);
        return (
          <mesh
            key={index}
            position={[
              Math.sin(index * 0.72) * 0.08,
              Math.sin(index * 0.58) * 0.05,
              index * 0.23 - 0.62,
            ]}
            scale={[1.2, 0.66, 1.5]}
            castShadow
          >
            <sphereGeometry args={[radius, 8, 6]} />
            <meshStandardMaterial
              color={index < 2 ? "#445c61" : "#536b68"}
              roughness={0.64}
              metalness={0.04}
            />
          </mesh>
        );
      })}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.22, 0, -0.45]}
          rotation={[Math.PI / 2, side * 0.4, 0]}
        >
          <coneGeometry args={[0.17, 0.52, 3]} />
          <meshStandardMaterial
            color="#728f8a"
            side={2}
            transparent
            opacity={0.78}
            roughness={0.5}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.02, -0.76]} scale={[0.3, 0.2, 0.42]}>
        <icosahedronGeometry args={[0.48, 1]} />
        <meshStandardMaterial color="#344b51" roughness={0.68} />
      </mesh>
    </group>
  );
}

function Cremling() {
  return (
    <group name="Cremling procedural model">
      <mesh position={[0, 0.11, 0]} scale={[0.48, 0.3, 0.8]} castShadow>
        <dodecahedronGeometry args={[0.36, 0]} />
        <meshStandardMaterial color="#765845" roughness={0.83} />
      </mesh>
      {[-0.16, 0, 0.16].flatMap((z) =>
        [-1, 1].map((side) => (
          <Limb
            key={`${z}-${side}`}
            position={[side * 0.25, 0.02, z]}
            rotation={[0, 0, side * -1.04]}
            length={0.28}
            radius={0.025}
          />
        )),
      )}
      <mesh position={[0, 0.11, -0.31]} scale={[0.6, 0.36, 0.6]}>
        <icosahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial color="#4b392f" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function CreatureModel({
  species,
  rigRef,
  compact = false,
}: {
  species: CreatureSpecies;
  rigRef?: Ref<CreatureRigHandle>;
  compact?: boolean;
}) {
  switch (species) {
    case "chasmfiend":
      return <Chasmfiend rigRef={rigRef} compact={compact} />;
    case "chull":
      return <Chull />;
    case "axehound":
      return <Axehound />;
    case "skyeel":
      return <Skyeel />;
    case "cremling":
      return <Cremling />;
  }
}
