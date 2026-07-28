import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";

function FoundationScene() {
  return (
    <>
      <color attach="background" args={["#071218"]} />
      <fog attach="fog" args={["#071218", 14, 52]} />
      <ambientLight intensity={0.8} color="#9fb9c3" />
      <directionalLight
        position={[8, 14, 6]}
        intensity={2.4}
        color="#f2d8a0"
        castShadow
      />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[38, 24, 96, 64]} />
        <meshStandardMaterial color="#2a3b38" roughness={0.94} metalness={0.04} />
      </mesh>
      <mesh position={[5, 4, -2]}>
        <torusGeometry args={[3.8, 0.16, 24, 96, Math.PI * 1.5]} />
        <meshBasicMaterial color="#65e7f0" toneMapped={false} />
      </mesh>
      <OrbitControls
        makeDefault
        enableDamping
        minDistance={8}
        maxDistance={38}
        maxPolarAngle={Math.PI * 0.48}
        target={new THREE.Vector3(0, 0, 0)}
      />
    </>
  );
}

export function App() {
  return (
    <main className="app-shell">
      <Canvas
        className="world-canvas"
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [13, 12, 18], fov: 42, near: 0.1, far: 140 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <FoundationScene />
        </Suspense>
      </Canvas>
      <header className="foundation-header">
        <span className="foundation-mark" aria-hidden="true">
          ✦
        </span>
        <h1>Roshar</h1>
      </header>
      <section className="foundation-note" aria-live="polite">
        <p>Living atlas foundation</p>
        <strong>Terrain systems initializing</strong>
      </section>
    </main>
  );
}
