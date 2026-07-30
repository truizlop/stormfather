import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AtlasUI } from "./ui/AtlasUI";
import { INITIAL_ATLAS_CAMERA } from "./world/initialView";
import { WorldScene } from "./world/WorldScene";

function LoadingOverlay() {
  const { active, progress } = useProgress();
  const loadStarted = useRef(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (active) {
      loadStarted.current = true;
      return;
    }
    if (loadStarted.current && progress >= 99.5) {
      setInitialLoadComplete(true);
    }
  }, [active, progress]);

  if (!active) return null;
  return (
    <div
      className={`loading-overlay ${
        initialLoadComplete ? "is-background-load" : ""
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="loading-mark" aria-hidden="true" />
      <p>
        {initialLoadComplete
          ? "Resolving local detail"
          : "Charting the highstorm"}
      </p>
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
          position: [...INITIAL_ATLAS_CAMERA.position],
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
