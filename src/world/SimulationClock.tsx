import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useAtlasStore } from "../store/useAtlasStore";

export function SimulationClock() {
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    accumulator.current += delta;
    if (accumulator.current < 0.05) return;
    const elapsed = accumulator.current;
    accumulator.current = 0;
    const state = useAtlasStore.getState();
    if (state.isPlaying) {
      state.setSimulationTime(state.simulationTime + elapsed);
    }
  });

  return null;
}
