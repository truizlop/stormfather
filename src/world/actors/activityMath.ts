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
    x: THREE.MathUtils.lerp(37.05, 40.45, progress),
    z: THREE.MathUtils.lerp(9.35, 10.2, progress),
    heading: outbound ? Math.atan2(3.4, 0.85) : Math.atan2(-3.4, -0.85),
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
