import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { Suspense } from "react";
import * as THREE from "three";
import { AtlasUI } from "./ui/AtlasUI";
import { WorldScene } from "./world/WorldScene";

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="loading-overlay" role="status">
      <span className="loading-mark" aria-hidden="true" />
      <p>Charting the highstorm</p>
      <strong>{Math.round(progress)}%</strong>
    </div>
  );
}

export function App() {
  return (
    <main className="app-shell">
      <Canvas
        className="world-canvas"
        shadows="basic"
        dpr={[1, 1.6]}
        camera={{
          position: [49, 14, 24],
          fov: 42,
          near: 0.1,
          far: 450,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <Suspense fallback={null}>
          <WorldScene />
        </Suspense>
      </Canvas>
      <AtlasUI />
      <LoadingOverlay />
    </main>
  );
}
