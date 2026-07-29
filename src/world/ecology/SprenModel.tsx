import type { SprenType } from "./ecology";

export function SprenModel({ type }: { type: SprenType }) {
  switch (type) {
    case "windspren":
      return (
        <group name="Windspren">
          <mesh scale={[0.8, 0.36, 1.5]}>
            <octahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial
              color="#d8fbff"
              emissive="#55dce9"
              emissiveIntensity={2.4}
              roughness={0.18}
              transparent
              opacity={0.84}
            />
          </mesh>
          <mesh position-z={0.13} rotation-x={Math.PI / 2}>
            <coneGeometry args={[0.05, 0.28, 5]} />
            <meshBasicMaterial
              color="#7cecf5"
              transparent
              opacity={0.38}
              depthWrite={false}
            />
          </mesh>
        </group>
      );
    case "lifespren":
      return (
        <group name="Lifespren">
          <mesh scale={[0.65, 1.25, 0.28]} rotation-z={0.45}>
            <octahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial
              color="#d6ff8c"
              emissive="#67ef61"
              emissiveIntensity={2}
              roughness={0.32}
            />
          </mesh>
          <mesh position={[0.035, -0.085, 0]} rotation-z={-0.3}>
            <cylinderGeometry args={[0.006, 0.01, 0.16, 5]} />
            <meshBasicMaterial color="#75df5d" />
          </mesh>
        </group>
      );
    case "gloryspren":
      return (
        <group name="Gloryspren">
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.085, 0.013, 7, 18]} />
            <meshStandardMaterial
              color="#fff2a8"
              emissive="#ffd749"
              emissiveIntensity={2.5}
              roughness={0.2}
            />
          </mesh>
          <mesh scale={0.45}>
            <icosahedronGeometry args={[0.06, 0]} />
            <meshBasicMaterial color="#fff7d1" />
          </mesh>
        </group>
      );
    case "fearspren":
      return (
        <group name="Fearspren">
          {[-0.05, 0, 0.05].map((x, index) => (
            <mesh
              key={x}
              position={[x, 0.04 + index * 0.018, 0]}
              rotation-z={(index - 1) * 0.25}
            >
              <coneGeometry args={[0.022, 0.18 + index * 0.03, 5]} />
              <meshStandardMaterial
                color="#d6a3ec"
                emissive="#8d45b0"
                emissiveIntensity={1.25}
                roughness={0.42}
                transparent
                opacity={0.82}
              />
            </mesh>
          ))}
        </group>
      );
    case "rainspren":
      return (
        <group name="Rainspren">
          <mesh rotation-z={0.2} scale={[0.38, 1.8, 0.38]}>
            <octahedronGeometry args={[0.075, 0]} />
            <meshStandardMaterial
              color="#8899c8"
              emissive="#36477a"
              emissiveIntensity={1.6}
              roughness={0.5}
              transparent
              opacity={0.8}
            />
          </mesh>
          <mesh position-y={-0.13}>
            <sphereGeometry args={[0.025, 6, 5]} />
            <meshBasicMaterial color="#b5c5ef" />
          </mesh>
        </group>
      );
  }
}
