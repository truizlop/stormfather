import * as THREE from "three";
import {
  riverPaths,
  type GeographyPoint,
  type RiverPath,
} from "../cartography/geography";
import { terrainHeightAt } from "./terrainHeight";

export interface RiverSample {
  x: number;
  z: number;
  distance: number;
  progress: number;
  width: number;
  normalX: number;
  normalZ: number;
}

interface DrainageSegment {
  start: RiverSample;
  end: RiverSample;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  influence: number;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const amount = THREE.MathUtils.clamp(
    (value - edge0) / Math.max(0.0001, edge1 - edge0),
    0,
    1,
  );
  return amount * amount * (3 - 2 * amount);
}

export function riverWidthAt(baseWidth: number, progress: number) {
  const amount = THREE.MathUtils.clamp(progress, 0, 1);
  const headwater = Math.max(0.085, baseWidth * 0.58);
  const accumulated = baseWidth * (0.76 + Math.pow(amount, 1.18) * 1.58);
  const estuary =
    smoothstep(0.76, 1, amount) * (0.24 + baseWidth * 1.28);
  return THREE.MathUtils.lerp(headwater, accumulated, amount) + estuary;
}

function approximatePathLength(points: readonly GeographyPoint[]) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index][0] - points[index - 1][0],
      points[index][1] - points[index - 1][1],
    );
  }
  return length;
}

/**
 * A centripetal spline retains the reference map's authored waypoints while
 * removing the angular, constant-width polyline look between them.
 */
export function sampleRiver(
  river: Pick<RiverPath, "points" | "width">,
  spacing = 0.22,
): RiverSample[] {
  const curve = new THREE.CatmullRomCurve3(
    river.points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    "centripetal",
    0.5,
  );
  const divisions = Math.max(
    river.points.length - 1,
    Math.ceil(approximatePathLength(river.points) / spacing),
  );
  const points = curve.getSpacedPoints(divisions);
  const source = river.points[0];
  const mouth = river.points.at(-1) ?? source;
  points[0].set(source[0], 0, source[1]);
  points[points.length - 1].set(mouth[0], 0, mouth[1]);
  const distances = new Array<number>(points.length).fill(0);
  for (let index = 1; index < points.length; index += 1) {
    distances[index] =
      distances[index - 1] + points[index].distanceTo(points[index - 1]);
  }
  const totalDistance = Math.max(0.0001, distances.at(-1) ?? 0.0001);

  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangentX = next.x - previous.x;
    const tangentZ = next.z - previous.z;
    const tangentLength = Math.hypot(tangentX, tangentZ) || 1;
    const progress = distances[index] / totalDistance;
    return {
      x: point.x,
      z: point.z,
      distance: distances[index],
      progress,
      width: riverWidthAt(river.width, progress),
      normalX: -tangentZ / tangentLength,
      normalZ: tangentX / tangentLength,
    };
  });
}

const drainageSegments: readonly DrainageSegment[] = riverPaths.flatMap(
  (river) => {
    const samples = sampleRiver(river, 0.48);
    return samples.slice(1).map((end, index) => {
      const start = samples[index];
      const influence =
        Math.max(start.width, end.width) * 0.5 +
        0.58 +
        Math.max(start.progress, end.progress) * 0.38;
      return {
        start,
        end,
        minX: Math.min(start.x, end.x) - influence,
        maxX: Math.max(start.x, end.x) + influence,
        minZ: Math.min(start.z, end.z) - influence,
        maxZ: Math.max(start.z, end.z) + influence,
        influence,
      };
    });
  },
);

function projectedAmount(
  x: number,
  z: number,
  start: RiverSample,
  end: RiverSample,
) {
  const segmentX = end.x - start.x;
  const segmentZ = end.z - start.z;
  const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
  if (lengthSquared === 0) return 0;
  return THREE.MathUtils.clamp(
    ((x - start.x) * segmentX + (z - start.z) * segmentZ) / lengthSquared,
    0,
    1,
  );
}

export function riverDepressionAt(x: number, z: number) {
  let depression = 0;
  for (const segment of drainageSegments) {
    if (
      x < segment.minX ||
      x > segment.maxX ||
      z < segment.minZ ||
      z > segment.maxZ
    ) {
      continue;
    }
    const amount = projectedAmount(x, z, segment.start, segment.end);
    const centerX =
      segment.start.x + (segment.end.x - segment.start.x) * amount;
    const centerZ =
      segment.start.z + (segment.end.z - segment.start.z) * amount;
    const distance = Math.hypot(x - centerX, z - centerZ);
    if (distance >= segment.influence) continue;

    const progress =
      segment.start.progress +
      (segment.end.progress - segment.start.progress) * amount;
    const profile = 1 - smoothstep(0, segment.influence, distance);
    const depth =
      0.055 +
      progress * 0.075 +
      smoothstep(0.76, 1, progress) * 0.055;
    depression = Math.min(depression, -depth * profile);
  }
  return depression;
}

function appendWaterRibbon(
  geometry: {
    positions: number[];
    uvs: number[];
    progress: number[];
    indices: number[];
  },
  river: RiverPath,
  riverIndex: number,
  spacing: number,
) {
  const samples = sampleRiver(river, spacing);
  const offset = geometry.positions.length / 3;

  samples.forEach((sample) => {
    const halfWidth = sample.width * 0.5;
    for (const side of [-1, 1] as const) {
      const x = sample.x + sample.normalX * halfWidth * side;
      const z = sample.z + sample.normalZ * halfWidth * side;
      geometry.positions.push(
        x,
        terrainHeightAt(x, z) + riverDepressionAt(x, z) + 0.024,
        z,
      );
      geometry.uvs.push(side < 0 ? 0 : 1, sample.distance + riverIndex * 7.31);
      geometry.progress.push(sample.progress);
    }
  });

  for (let index = 0; index < samples.length - 1; index += 1) {
    const current = offset + index * 2;
    geometry.indices.push(
      current,
      current + 2,
      current + 1,
      current + 1,
      current + 2,
      current + 3,
    );
  }
}

function appendBankStrip(
  geometry: {
    positions: number[];
    uvs: number[];
    indices: number[];
  },
  samples: readonly RiverSample[],
  side: -1 | 1,
) {
  const offset = geometry.positions.length / 3;
  samples.forEach((sample) => {
    const innerDistance = sample.width * 0.5 + 0.018;
    const outerDistance =
      innerDistance + 0.31 + sample.progress * 0.31;
    for (const [distance, blend] of [
      [outerDistance, 0],
      [innerDistance, 1],
    ] as const) {
      const x = sample.x + sample.normalX * distance * side;
      const z = sample.z + sample.normalZ * distance * side;
      geometry.positions.push(
        x,
        terrainHeightAt(x, z) + riverDepressionAt(x, z) + 0.018,
        z,
      );
      geometry.uvs.push(blend, sample.progress);
    }
  });
  for (let index = 0; index < samples.length - 1; index += 1) {
    const current = offset + index * 2;
    geometry.indices.push(
      current,
      current + 2,
      current + 1,
      current + 1,
      current + 2,
      current + 3,
    );
  }
}

export function createRiverSurfaceGeometry(spacing = 0.22) {
  const data = {
    positions: [] as number[],
    uvs: [] as number[],
    progress: [] as number[],
    indices: [] as number[],
  };
  riverPaths.forEach((river, index) =>
    appendWaterRibbon(data, river, index, spacing),
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(data.positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(data.uvs, 2));
  geometry.setAttribute(
    "aProgress",
    new THREE.Float32BufferAttribute(data.progress, 1),
  );
  geometry.setIndex(data.indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createRiverBankGeometry(spacing = 0.22) {
  const data = {
    positions: [] as number[],
    uvs: [] as number[],
    indices: [] as number[],
  };
  riverPaths.forEach((river) => {
    const samples = sampleRiver(river, spacing);
    appendBankStrip(data, samples, -1);
    appendBankStrip(data, samples, 1);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(data.positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(data.uvs, 2));
  geometry.setIndex(data.indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
