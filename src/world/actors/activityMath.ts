import * as THREE from "three";

export interface ActivityPose {
  x: number;
  z: number;
  heading: number;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function bridgeRunPose(
  simulationTime: number,
  stormProximity: number,
  center: readonly [number, number],
): ActivityPose {
  const warning = THREE.MathUtils.smoothstep(stormProximity, 0.28, 0.9);
  const cycle = positiveModulo(
    simulationTime * (0.095 + stormProximity * 0.055),
    2,
  );
  const routeProgress = cycle <= 1 ? cycle : 2 - cycle;
  const progress = THREE.MathUtils.lerp(routeProgress, 0.035, warning);
  const outbound = cycle <= 1;

  return {
    x: THREE.MathUtils.lerp(center[0] - 3.15, center[0] + 0.55, progress),
    z: THREE.MathUtils.lerp(center[1] - 2.35, center[1] - 0.35, progress),
    heading: outbound ? Math.atan2(3.7, 2) : Math.atan2(-3.7, -2),
  };
}

export function fishingRaftPose(
  simulationTime: number,
  index: number,
  stormProximity: number,
  center: readonly [number, number],
): ActivityPose {
  const warning = THREE.MathUtils.smoothstep(stormProximity, 0.18, 0.86);
  const angle = index * 2.17 + simulationTime * (0.017 + index * 0.002);
  const fishingRadius = 2.15 + index * 0.64;
  const radius = THREE.MathUtils.lerp(fishingRadius, 0.72 + index * 0.18, warning);

  return {
    x: center[0] + Math.cos(angle) * radius,
    z: center[1] + Math.sin(angle) * radius * 0.62,
    heading: -angle + Math.PI / 2,
  };
}

export function cargoLiftHeight(
  simulationTime: number,
  stormProximity: number,
) {
  const activeHeight = 0.42 + (Math.sin(simulationTime * 0.34) + 1) * 0.22;
  return THREE.MathUtils.lerp(activeHeight, 0.18, stormProximity);
}

export function caravanPose(
  simulationTime: number,
  stormProximity: number,
  center: readonly [number, number],
): ActivityPose {
  const warning = THREE.MathUtils.smoothstep(stormProximity, 0.32, 0.9);
  const cycle = positiveModulo(simulationTime * 0.026, 1);
  const route = THREE.MathUtils.lerp(cycle, 0.08, warning);
  const x = center[0] - 3.2 + route * 6.4;
  const z = center[1] + 2.35 + Math.sin(route * Math.PI * 2) * 0.48;
  const dx = 6.4;
  const dz = Math.cos(route * Math.PI * 2) * Math.PI * 0.96;
  return { x, z, heading: Math.atan2(dx, dz) };
}
