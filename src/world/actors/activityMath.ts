import * as THREE from "three";
import { SHATTERED_PLAINS_BRIDGE_RUN_PATH } from "../terrain/shatteredPlainsTopology";

export interface ActivityPose {
  x: number;
  z: number;
  heading: number;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

const bridgeRunSegmentLengths =
  SHATTERED_PLAINS_BRIDGE_RUN_PATH.slice(1).map(
    (point, index) =>
      Math.hypot(
        point[0] - SHATTERED_PLAINS_BRIDGE_RUN_PATH[index][0],
        point[1] - SHATTERED_PLAINS_BRIDGE_RUN_PATH[index][1],
      ),
  );
const bridgeRunLength = bridgeRunSegmentLengths.reduce(
  (total, length) => total + length,
  0,
);

function sampleBridgeRunPath(progress: number) {
  const distance = THREE.MathUtils.clamp(progress, 0, 1) * bridgeRunLength;
  let traveled = 0;
  for (
    let index = 0;
    index < bridgeRunSegmentLengths.length;
    index += 1
  ) {
    const segmentLength = bridgeRunSegmentLengths[index];
    if (
      traveled + segmentLength >= distance ||
      index === bridgeRunSegmentLengths.length - 1
    ) {
      const segmentProgress =
        segmentLength === 0
          ? 0
          : THREE.MathUtils.clamp(
              (distance - traveled) / segmentLength,
              0,
              1,
            );
      const start = SHATTERED_PLAINS_BRIDGE_RUN_PATH[index];
      const end = SHATTERED_PLAINS_BRIDGE_RUN_PATH[index + 1];
      return {
        x: THREE.MathUtils.lerp(start[0], end[0], segmentProgress),
        z: THREE.MathUtils.lerp(start[1], end[1], segmentProgress),
        heading: Math.atan2(end[0] - start[0], end[1] - start[1]),
      };
    }
    traveled += segmentLength;
  }
  return { x: 0, z: 0, heading: 0 };
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
  const localPose = sampleBridgeRunPath(progress);

  return {
    x: center[0] + localPose.x,
    z: center[1] + localPose.z,
    heading: outbound
      ? localPose.heading
      : localPose.heading + Math.PI,
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

export function floatingWatercraftY(
  waterY: number,
  simulationTime: number,
  index: number,
) {
  return (
    waterY +
    0.035 +
    Math.sin(simulationTime * 0.4 + index) * 0.007
  );
}

export function cargoLiftHeight(
  simulationTime: number,
  stormProximity: number,
) {
  const activeHeight = 0.42 + (Math.sin(simulationTime * 0.34) + 1) * 0.22;
  return THREE.MathUtils.lerp(activeHeight, 0.18, stormProximity);
}
