import { mountainRidges, type GeographyPoint } from "../cartography/geography";

function fract(value: number) {
  return value - Math.floor(value);
}

function hash2(x: number, z: number) {
  return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453123);
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}

function valueNoise(x: number, z: number) {
  const cellX = Math.floor(x);
  const cellZ = Math.floor(z);
  const localX = smoothstep(x - cellX);
  const localZ = smoothstep(z - cellZ);
  const northWest = hash2(cellX, cellZ);
  const northEast = hash2(cellX + 1, cellZ);
  const southWest = hash2(cellX, cellZ + 1);
  const southEast = hash2(cellX + 1, cellZ + 1);
  const north = northWest + (northEast - northWest) * localX;
  const south = southWest + (southEast - southWest) * localX;
  return north + (south - north) * localZ;
}

function fbm(x: number, z: number) {
  let amplitude = 0.56;
  let frequency = 1;
  let total = 0;
  let weight = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    total += valueNoise(x * frequency, z * frequency) * amplitude;
    weight += amplitude;
    amplitude *= 0.48;
    frequency *= 2.03;
  }
  return total / weight;
}

function pointToSegmentDistance(
  point: GeographyPoint,
  start: GeographyPoint,
  end: GeographyPoint,
) {
  const segmentX = end[0] - start[0];
  const segmentZ = end[1] - start[1];
  const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
  if (lengthSquared === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1]);
  }
  const amount = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * segmentX +
        (point[1] - start[1]) * segmentZ) /
        lengthSquared,
    ),
  );
  const projectedX = start[0] + amount * segmentX;
  const projectedZ = start[1] + amount * segmentZ;
  return Math.hypot(point[0] - projectedX, point[1] - projectedZ);
}

function distanceToPath(
  point: GeographyPoint,
  path: readonly GeographyPoint[],
) {
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < path.length; index += 1) {
    distance = Math.min(
      distance,
      pointToSegmentDistance(point, path[index - 1], path[index]),
    );
  }
  return distance;
}

export function ridgeHeightAt(x: number, z: number) {
  let strongest = 0;
  let secondary = 0;
  for (const ridge of mountainRidges) {
    const distance = distanceToPath([x, z], ridge.points);
    const profile = Math.exp(
      -Math.pow(distance / Math.max(0.1, ridge.width), 2) * 2.35,
    );
    const fracture =
      0.68 +
      Math.abs(fbm(x * 0.34 + ridge.crags * 3, z * 0.34) - 0.5) *
        ridge.crags *
        1.08;
    const height = ridge.elevation * profile * fracture;
    if (height > strongest) {
      secondary = strongest;
      strongest = height;
    } else if (height > secondary) {
      secondary = height;
    }
  }
  return strongest + secondary * 0.18;
}

export function terrainHeightAt(x: number, z: number) {
  const broad = fbm(x * 0.095 + 10.4, z * 0.095 - 3.8);
  const detail = fbm(x * 0.33 - 8.2, z * 0.33 + 12.1);
  const eroded = Math.abs(fbm(x * 0.19, z * 0.19) - 0.5);
  const stormwardPlateau =
    Math.max(0, Math.min(1, (x - 20) / 28)) *
    (0.3 + Math.abs(Math.sin(z * 0.42)) * 0.26);
  const base =
    0.48 +
    broad * 0.56 +
    detail * 0.2 +
    eroded * 0.3 +
    stormwardPlateau;
  return base + ridgeHeightAt(x, z);
}

export function terrainSlopeAt(x: number, z: number, sample = 0.18) {
  const west = terrainHeightAt(x - sample, z);
  const east = terrainHeightAt(x + sample, z);
  const north = terrainHeightAt(x, z - sample);
  const south = terrainHeightAt(x, z + sample);
  return Math.hypot(east - west, south - north) / (sample * 2);
}
