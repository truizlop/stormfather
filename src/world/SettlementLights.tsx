import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { locations } from "./locations";
import { useAtlasStore } from "../store/useAtlasStore";
import { stormPhase, stormXAtTime } from "./weather/storm";
import { localSurfaceY } from "./terrain/localSurface";

export function SettlementLights() {
  const points = useRef<THREE.Points>(null);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const positions = useMemo(() => {
    const values: number[] = [];
    locations
      .filter((location) => location.id !== "roshar")
      .forEach((location, locationIndex) => {
        for (let index = 0; index < 16; index += 1) {
          const angle = index * 2.39996;
          const radius = 0.5 + ((index * 17) % 28) / 10;
          values.push(
            location.coordinates.x + Math.cos(angle) * radius,
            localSurfaceY(
              location.id,
              location.coordinates.x + Math.cos(angle) * radius,
              location.coordinates.z + Math.sin(angle) * radius * 0.65,
            ) +
              0.18 +
              (index % 4) * 0.08,
            location.coordinates.z + Math.sin(angle) * radius * 0.65,
          );
        }
        values.push(
          location.coordinates.x,
          localSurfaceY(
            location.id,
            location.coordinates.x,
            location.coordinates.z,
          ) +
            0.52 +
            locationIndex * 0.01,
          location.coordinates.z,
        );
      });
    return new Float32Array(values);
  }, []);

  useFrame(() => {
    if (!points.current) return;
    const state = useAtlasStore.getState();
    const stormX = stormXAtTime(state.simulationTime);
    const selected = locations.find((location) => location.id === state.selectedId);
    const phase = selected ? stormPhase(stormX, selected.coordinates.x) : "calm";
    const opacity = phase === "storm" ? 0.24 : phase === "warning" ? 0.52 : 0.72;
    (points.current.material as THREE.PointsMaterial).opacity = opacity;
  });

  return proximityLocationId === null ? (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffd68a"
        size={0.14}
        transparent
        opacity={0.72}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  ) : null;
}
