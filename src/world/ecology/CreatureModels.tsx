import type { CreatureSpecies } from "./ecology";

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

function Chasmfiend() {
  return (
    <group name="Chasmfiend procedural model">
      <mesh position={[0, 0.34, 0]} scale={[0.58, 0.3, 1.12]} castShadow>
        <dodecahedronGeometry args={[0.72, 1]} />
        <meshStandardMaterial
          color="#5f4937"
          roughness={0.68}
          metalness={0.12}
        />
      </mesh>
      {[-0.43, -0.22, 0, 0.22, 0.43].flatMap((z, row) =>
        [-1, 1].map((side) => (
          <group key={`${z}-${side}`} position={[side * 0.38, 0.23, z]}>
            <Limb
              position={[side * 0.24, -0.08, 0]}
              rotation={[0.05, 0, side * -0.88]}
              length={0.64}
              radius={0.055}
            />
            <Limb
              position={[side * 0.49, -0.3, 0.02]}
              rotation={[0.12, 0, side * -0.38]}
              length={0.48}
              radius={0.038}
              color={row % 2 ? "#382f29" : "#49382d"}
            />
          </group>
        )),
      )}
      <mesh position={[0, 0.31, -0.98]} scale={[0.48, 0.31, 0.52]} castShadow>
        <icosahedronGeometry args={[0.48, 1]} />
        <meshStandardMaterial
          color="#4d392e"
          roughness={0.72}
          metalness={0.1}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.29, 0.3, -1.34]}
          rotation={[1.2, 0, side * -0.38]}
          castShadow
        >
          <coneGeometry args={[0.08, 0.62, 7]} />
          <meshStandardMaterial color="#221f1c" roughness={0.76} />
        </mesh>
      ))}
      {[-0.58, -0.25, 0.08, 0.41].map((z) => (
        <mesh
          key={z}
          position={[0, 0.78 - Math.abs(z) * 0.1, z]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <coneGeometry args={[0.09, 0.28, 6]} />
          <meshStandardMaterial color="#745b42" roughness={0.7} />
        </mesh>
      ))}
      <pointLight
        position={[0, 0.38, -1.22]}
        color="#b9ecde"
        intensity={0.22}
        distance={1.4}
      />
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

export function CreatureModel({ species }: { species: CreatureSpecies }) {
  switch (species) {
    case "chasmfiend":
      return <Chasmfiend />;
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
