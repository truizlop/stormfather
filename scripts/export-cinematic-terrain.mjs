#!/usr/bin/env node
/**
 * Export the exact procedural terrain inputs used by the Three.js atlas.
 *
 * Vite's SSR loader evaluates the existing TypeScript modules directly, so
 * this exporter does not carry a second copy of the terrain formula. The
 * resulting compact JSON is a disposable render artifact consumed by Blender.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputPath = path.join(
  projectRoot,
  "artifacts",
  "cinematic",
  "roshar-runtime-terrain.json",
);
const segmentsX = 320;
const segmentsZ = 168;

function pointInPolygon(x, z, polygon) {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current++
  ) {
    const [currentX, currentZ] = polygon[current];
    const [previousX, previousZ] = polygon[previous];
    const crosses =
      currentZ > z !== previousZ > z &&
      x <
        ((previousX - currentX) * (z - currentZ)) /
          (previousZ - currentZ) +
          currentX;
    if (crosses) inside = !inside;
  }
  return inside;
}

function serializeGeometry(geometry) {
  const positions = geometry.getAttribute("position");
  const indices = geometry.getIndex();
  return {
    positions: Array.from(positions.array),
    indices: indices ? Array.from(indices.array) : [],
  };
}

function clipSegmentToCell(start, end, minX, maxX, minZ, maxZ) {
  const deltaX = end[0] - start[0];
  const deltaZ = end[1] - start[1];
  let lower = 0;
  let upper = 1;
  for (const [origin, delta, minimum, maximum] of [
    [start[0], deltaX, minX, maxX],
    [start[1], deltaZ, minZ, maxZ],
  ]) {
    if (Math.abs(delta) < 1e-12) {
      if (origin < minimum || origin > maximum) return null;
      continue;
    }
    const first = (minimum - origin) / delta;
    const second = (maximum - origin) / delta;
    lower = Math.max(lower, Math.min(first, second));
    upper = Math.min(upper, Math.max(first, second));
    if (lower > upper) return null;
  }
  return [
    [start[0] + deltaX * lower, start[1] + deltaZ * lower],
    [start[0] + deltaX * upper, start[1] + deltaZ * upper],
  ];
}

function addUniquePoint(points, point) {
  if (
    points.some(
      (existing) =>
        Math.abs(existing[0] - point[0]) < 1e-7 &&
        Math.abs(existing[1] - point[1]) < 1e-7,
    )
  ) {
    return;
  }
  points.push(point);
}

const server = await createServer({
  root: projectRoot,
  appType: "custom",
  logLevel: "error",
  server: {
    middlewareMode: true,
    hmr: false,
    ws: false,
  },
});

try {
  const geography = await server.ssrLoadModule(
    "/src/world/cartography/geography.ts",
  );
  const terrainHeight = await server.ssrLoadModule(
    "/src/world/terrain/terrainHeight.ts",
  );
  const terrainColor = await server.ssrLoadModule(
    "/src/world/terrain/terrainColor.ts",
  );
  const riverChannels = await server.ssrLoadModule(
    "/src/world/terrain/riverChannels.ts",
  );

  const bounds = geography.ROSHAR_MAP_BOUNDS;
  const landPolygons = [
    geography.mainlandOutline,
    geography.aimiaOutline,
    ...geography.islandPolygons.map((island) => island.points),
  ];
  const waterPolygons = geography.inlandWaterPolygons.map(
    (water) => water.points,
  );
  const boundaries = [...landPolygons, ...waterPolygons];
  const insideLand = (x, z) =>
    landPolygons.some((polygon) => pointInPolygon(x, z, polygon)) &&
    !waterPolygons.some((polygon) => pointInPolygon(x, z, polygon));
  const columns = segmentsX + 1;
  const rows = segmentsZ + 1;
  const heights = new Array(columns * rows);
  const colors = new Array(columns * rows * 3);

  for (let row = 0; row < rows; row += 1) {
    const z =
      bounds.minZ +
      (row / segmentsZ) * (bounds.maxZ - bounds.minZ);
    for (let column = 0; column < columns; column += 1) {
      const x =
        bounds.minX +
        (column / segmentsX) * (bounds.maxX - bounds.minX);
      const vertex = row * columns + column;
      const height =
        terrainHeight.terrainHeightAt(x, z) +
        riverChannels.riverDepressionAt(x, z);
      heights[vertex] = height;
      terrainColor
        .terrainColorAt(x, z, height)
        .toArray(colors, vertex * 3);
    }
  }

  const landCells = [];
  const surfacePositions = [];
  const surfaceColors = [];
  const surfaceIndices = [];
  for (let row = 0; row < segmentsZ; row += 1) {
    const minZ =
      bounds.minZ +
      (row / segmentsZ) *
        (bounds.maxZ - bounds.minZ);
    const maxZ =
      bounds.minZ +
      ((row + 1) / segmentsZ) *
        (bounds.maxZ - bounds.minZ);
    for (let column = 0; column < segmentsX; column += 1) {
      const minX =
        bounds.minX +
        (column / segmentsX) *
          (bounds.maxX - bounds.minX);
      const maxX =
        bounds.minX +
        ((column + 1) / segmentsX) *
          (bounds.maxX - bounds.minX);
      const candidates = [];
      for (const point of [
        [minX, minZ],
        [maxX, minZ],
        [maxX, maxZ],
        [minX, maxZ],
      ]) {
        if (insideLand(point[0], point[1])) {
          addUniquePoint(candidates, point);
        }
      }
      for (const boundary of boundaries) {
        for (let index = 0; index < boundary.length; index += 1) {
          const clipped = clipSegmentToCell(
            boundary[index],
            boundary[(index + 1) % boundary.length],
            minX,
            maxX,
            minZ,
            maxZ,
          );
          if (!clipped) continue;
          addUniquePoint(candidates, clipped[0]);
          addUniquePoint(candidates, clipped[1]);
        }
      }
      if (candidates.length < 3) continue;
      const centerX =
        candidates.reduce((sum, point) => sum + point[0], 0) /
        candidates.length;
      const centerZ =
        candidates.reduce((sum, point) => sum + point[1], 0) /
        candidates.length;
      candidates.sort(
        (first, second) =>
          Math.atan2(first[1] - centerZ, first[0] - centerX) -
          Math.atan2(second[1] - centerZ, second[0] - centerX),
      );

      const validTriangles = [];
      for (let index = 1; index < candidates.length - 1; index += 1) {
        const triangle = [candidates[0], candidates[index], candidates[index + 1]];
        const triangleX =
          (triangle[0][0] + triangle[1][0] + triangle[2][0]) / 3;
        const triangleZ =
          (triangle[0][1] + triangle[1][1] + triangle[2][1]) / 3;
        if (insideLand(triangleX, triangleZ)) {
          validTriangles.push([0, index, index + 1]);
        }
      }
      if (validTriangles.length === 0) continue;
      const offset = surfacePositions.length / 3;
      for (const [x, z] of candidates) {
        const height =
          terrainHeight.terrainHeightAt(x, z) +
          riverChannels.riverDepressionAt(x, z);
        surfacePositions.push(x, height, z);
        terrainColor
          .terrainColorAt(x, z, height)
          .toArray(surfaceColors, surfaceColors.length);
      }
      for (const triangle of validTriangles) {
        surfaceIndices.push(
          offset + triangle[0],
          offset + triangle[1],
          offset + triangle[2],
        );
      }
      if (insideLand((minX + maxX) * 0.5, (minZ + maxZ) * 0.5)) {
        landCells.push(row * segmentsX + column);
      }
    }
  }

  const coastPositions = [];
  const coastIndices = [];
  for (const polygon of landPolygons) {
    for (let index = 0; index < polygon.length; index += 1) {
      const current = polygon[index];
      const next = polygon[(index + 1) % polygon.length];
      const offset = coastPositions.length / 3;
      coastPositions.push(
        current[0],
        terrainHeight.terrainHeightAt(current[0], current[1]),
        current[1],
        next[0],
        terrainHeight.terrainHeightAt(next[0], next[1]),
        next[1],
        current[0],
        -0.38,
        current[1],
        next[0],
        -0.38,
        next[1],
      );
      coastIndices.push(
        offset,
        offset + 2,
        offset + 1,
        offset + 1,
        offset + 2,
        offset + 3,
      );
    }
  }

  const output = {
    source: {
      height: "src/world/terrain/terrainHeight.ts",
      color: "src/world/terrain/terrainColor.ts",
      rivers: "src/world/terrain/riverChannels.ts",
      geography: "src/world/cartography/geography.ts",
    },
    bounds,
    segmentsX,
    segmentsZ,
    heights,
    colors,
    landCells,
    surface: {
      positions: surfacePositions,
      colors: surfaceColors,
      indices: surfaceIndices,
    },
    coast: {
      positions: coastPositions,
      indices: coastIndices,
    },
    rivers: serializeGeometry(
      riverChannels.createRiverSurfaceGeometry(0.22),
    ),
    riverBanks: serializeGeometry(
      riverChannels.createRiverBankGeometry(0.22),
    ),
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(output));
  const megabytes = (
    Buffer.byteLength(JSON.stringify(output)) /
    1024 /
    1024
  ).toFixed(2);
  console.log(
    `Exported ${landCells.length.toLocaleString()} terrain cells, ` +
      `${(columns * rows).toLocaleString()} vertices, and runtime rivers ` +
      `to ${outputPath} (${megabytes} MiB).`,
  );
} finally {
  await server.close();
}
