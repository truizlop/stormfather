import * as THREE from "three";
import {
  SHATTERED_PLAINS_PATCH,
  SHATTERED_PLAINS_PLATEAUS,
  SHATTERED_PLAINS_WESTERN_WARCAMP,
} from "./shatteredPlainsTopology";

function smoothstep(value: number) {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * The canonical field is cymatic, not an excavated oval. A restrained,
 * deterministic edge modulation breaks the presentation-disk silhouette
 * while retaining the topology's measured navigation bounds.
 */
export function shatteredPlainsBoundaryScale(angle: number) {
  return (
    1 +
    Math.sin(angle * 5 + 0.6) * 0.032 +
    Math.sin(angle * 9 - 1.2) * 0.018 +
    Math.sin(angle * 13 + 0.25) * 0.01
  );
}

export const SHATTERED_PLAINS_HANDOFF_PROGRESS = 0.28;
export const SHATTERED_PLAINS_CAP_APRON = 0.16;

export function createShatteredPlainsFloorGeometry(
  center: readonly [number, number],
  landmarkDatum: number,
  outerHeightAt: (x: number, z: number) => number,
  radialSegments = 96,
  outerColorAt?: (x: number, z: number, y: number) => THREE.Color,
  worldUvAt?: (
    x: number,
    z: number,
  ) => readonly [number, number],
) {
  const segments = Math.max(24, Math.floor(radialSegments));
  const floorRings = 3;
  const transitionRings = 6;
  const ringCount = floorRings + transitionRings;
  const floorY = landmarkDatum + SHATTERED_PLAINS_PATCH.chasmFloorY;
  const floorColor = new THREE.Color("#3b4744");
  const centerUv = worldUvAt?.(center[0], center[1]) ?? [0.5, 0.5];
  const positions: number[] = [center[0], floorY, center[1]];
  const uvs: number[] = [centerUv[0], centerUv[1]];
  const colors: number[] = [
    floorColor.r,
    floorColor.g,
    floorColor.b,
  ];
  const indices: number[] = [];
  const shoulderColor = new THREE.Color("#6e675a");
  const vertexColor = new THREE.Color();

  for (let ring = 1; ring <= ringCount; ring += 1) {
    const onFloor = ring <= floorRings;
    const floorProgress = Math.min(1, ring / floorRings);
    const transitionProgress = onFloor
      ? 0
      : (ring - floorRings) / transitionRings;
    const radiusX = onFloor
      ? SHATTERED_PLAINS_PATCH.innerRadiusX * floorProgress
      : THREE.MathUtils.lerp(
          SHATTERED_PLAINS_PATCH.innerRadiusX,
          SHATTERED_PLAINS_PATCH.outerRadiusX,
          transitionProgress,
        );
    const radiusZ = onFloor
      ? SHATTERED_PLAINS_PATCH.innerRadiusZ * floorProgress
      : THREE.MathUtils.lerp(
          SHATTERED_PLAINS_PATCH.innerRadiusZ,
          SHATTERED_PLAINS_PATCH.outerRadiusZ,
          transitionProgress,
        );
    const blend = smoothstep(
      transitionProgress / SHATTERED_PLAINS_HANDOFF_PROGRESS,
    );

    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const boundaryScale = shatteredPlainsBoundaryScale(angle);
      const deformedRadiusX = radiusX * boundaryScale;
      const deformedRadiusZ = radiusZ * boundaryScale;
      const x = center[0] + cosine * deformedRadiusX;
      const z = center[1] + sine * deformedRadiusZ;
      const terrainY = outerHeightAt(x, z);
      const y = THREE.MathUtils.lerp(
        floorY,
        terrainY,
        blend,
      );
      positions.push(x, y, z);
      const worldUv = worldUvAt?.(x, z);
      uvs.push(
        worldUv?.[0] ??
          0.5 +
            (cosine * deformedRadiusX) /
              (SHATTERED_PLAINS_PATCH.outerRadiusX * 2),
        worldUv?.[1] ??
          0.5 +
            (sine * deformedRadiusZ) /
              (SHATTERED_PLAINS_PATCH.outerRadiusZ * 2),
      );
      const outerColor =
        outerColorAt?.(x, z, terrainY) ?? shoulderColor;
      vertexColor.lerpColors(floorColor, outerColor, blend);
      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    indices.push(0, 1 + next, 1 + segment);
  }
  for (let ring = 0; ring < ringCount - 1; ring += 1) {
    const currentOffset = 1 + ring * segments;
    const nextOffset = currentOffset + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      indices.push(
        currentOffset + segment,
        nextOffset + next,
        nextOffset + segment,
        currentOffset + segment,
        currentOffset + next,
        nextOffset + next,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uvs, 2),
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Runtime terrain broadens the old diagram-scale caps while keeping the
 * checked navigation polygons inset. The apron is real stone with a matching
 * cliff skirt, so the field reads as tableland split by narrow chasms.
 */
export function createShatteredPlainsCapGeometry(
  center: readonly [number, number],
  landmarkDatum: number,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const plateau of SHATTERED_PLAINS_PLATEAUS) {
    const centroid = plateau.polygon.reduce(
      (sum, [x, z]) => [sum[0] + x, sum[1] + z] as const,
      [0, 0] as const,
    );
    const centerX = centroid[0] / plateau.polygon.length;
    const centerZ = centroid[1] / plateau.polygon.length;
    // Sit a few millimetres above the legacy prism cap so the runtime terrain
    // owns one continuous material from the safe inset through the apron.
    const capY = landmarkDatum + plateau.capY + 0.006;
    const offset = positions.length / 3;
    positions.push(center[0] + centerX, capY, center[1] + centerZ);
    uvs.push(
      0.5 + centerX / (SHATTERED_PLAINS_PATCH.outerRadiusX * 2),
      0.5 + centerZ / (SHATTERED_PLAINS_PATCH.outerRadiusZ * 2),
    );

    for (const [x, z] of plateau.polygon) {
      const radius = Math.max(
        0.001,
        Math.hypot(x - centerX, z - centerZ),
      );
      const expandedX =
        x + ((x - centerX) / radius) * SHATTERED_PLAINS_CAP_APRON;
      const expandedZ =
        z + ((z - centerZ) / radius) * SHATTERED_PLAINS_CAP_APRON;
      positions.push(
        center[0] + expandedX,
        capY,
        center[1] + expandedZ,
      );
      uvs.push(
        0.5 +
          expandedX /
            (SHATTERED_PLAINS_PATCH.outerRadiusX * 2),
        0.5 +
          expandedZ /
            (SHATTERED_PLAINS_PATCH.outerRadiusZ * 2),
      );
    }
    for (let edge = 0; edge < plateau.polygon.length; edge += 1) {
      indices.push(
        offset,
        offset + 1 + edge,
        offset + 1 + ((edge + 1) % plateau.polygon.length),
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uvs, 2),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Authored plateau prisms have deliberately varied undersides. These irregular
 * skirts overlap their walls just below the cap and descend into the shared
 * chasm floor, removing daylight gaps without changing the modeled skyline.
 */
export function createShatteredPlainsWallGeometry(
  center: readonly [number, number],
  landmarkDatum: number,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const lipColor = new THREE.Color("#786f60");
  const strataColor = new THREE.Color("#514e46");
  const dampColor = new THREE.Color("#2e3938");
  const floorY =
    landmarkDatum + SHATTERED_PLAINS_PATCH.chasmFloorY - 0.018;

  for (const plateau of SHATTERED_PLAINS_PLATEAUS) {
    const centroid = plateau.polygon.reduce(
      (sum, [x, z]) => [sum[0] + x, sum[1] + z] as const,
      [0, 0] as const,
    );
    const centerX = centroid[0] / plateau.polygon.length;
    const centerZ = centroid[1] / plateau.polygon.length;
    for (let edge = 0; edge < plateau.polygon.length; edge += 1) {
      const start = plateau.polygon[edge];
      const end = plateau.polygon[(edge + 1) % plateau.polygon.length];
      const outwardStart = Math.hypot(
        start[0] - centerX,
        start[1] - centerZ,
      );
      const outwardEnd = Math.hypot(
        end[0] - centerX,
        end[1] - centerZ,
      );
      const startX =
        center[0] +
        start[0] +
        ((start[0] - centerX) / Math.max(0.001, outwardStart)) *
          SHATTERED_PLAINS_CAP_APRON;
      const startZ =
        center[1] +
        start[1] +
        ((start[1] - centerZ) / Math.max(0.001, outwardStart)) *
          SHATTERED_PLAINS_CAP_APRON;
      const endX =
        center[0] +
        end[0] +
        ((end[0] - centerX) / Math.max(0.001, outwardEnd)) *
          SHATTERED_PLAINS_CAP_APRON;
      const endZ =
        center[1] +
        end[1] +
        ((end[1] - centerZ) / Math.max(0.001, outwardEnd)) *
          SHATTERED_PLAINS_CAP_APRON;
      const middleStartX =
        center[0] +
        start[0] +
        ((start[0] - centerX) / Math.max(0.001, outwardStart)) *
          0.2;
      const middleStartZ =
        center[1] +
        start[1] +
        ((start[1] - centerZ) / Math.max(0.001, outwardStart)) *
          0.2;
      const middleEndX =
        center[0] +
        end[0] +
        ((end[0] - centerX) / Math.max(0.001, outwardEnd)) * 0.2;
      const middleEndZ =
        center[1] +
        end[1] +
        ((end[1] - centerZ) / Math.max(0.001, outwardEnd)) * 0.2;
      const bottomStartX =
        center[0] +
        start[0] +
        ((start[0] - centerX) / Math.max(0.001, outwardStart)) *
          0.245;
      const bottomStartZ =
        center[1] +
        start[1] +
        ((start[1] - centerZ) / Math.max(0.001, outwardStart)) *
          0.245;
      const bottomEndX =
        center[0] +
        end[0] +
        ((end[0] - centerX) / Math.max(0.001, outwardEnd)) * 0.245;
      const bottomEndZ =
        center[1] +
        end[1] +
        ((end[1] - centerZ) / Math.max(0.001, outwardEnd)) * 0.245;
      const topY = landmarkDatum + plateau.capY - 0.008;
      const middleY = THREE.MathUtils.lerp(topY, floorY, 0.48);
      const offset = positions.length / 3;
      positions.push(
        startX,
        topY,
        startZ,
        endX,
        topY,
        endZ,
        middleStartX,
        middleY,
        middleStartZ,
        middleEndX,
        middleY,
        middleEndZ,
        bottomStartX,
        floorY,
        bottomStartZ,
        bottomEndX,
        floorY,
        bottomEndZ,
      );
      const edgeLength = Math.hypot(endX - startX, endZ - startZ);
      uvs.push(
        0,
        1,
        edgeLength * 4,
        1,
        0,
        0.52,
        edgeLength * 4,
        0.52,
        0,
        0,
        edgeLength * 4,
        0,
      );
      for (const color of [
        lipColor,
        lipColor,
        strataColor,
        strataColor,
        dampColor,
        dampColor,
      ]) {
        colors.push(color.r, color.g, color.b);
      }
      indices.push(
        offset,
        offset + 2,
        offset + 1,
        offset + 1,
        offset + 2,
        offset + 3,
        offset + 2,
        offset + 4,
        offset + 3,
        offset + 3,
        offset + 4,
        offset + 5,
      );
    }
  }

  const warcamp = SHATTERED_PLAINS_WESTERN_WARCAMP;
  const warcampSegments = 32;
  const warcampOffset = positions.length / 3;
  for (let segment = 0; segment < warcampSegments; segment += 1) {
    const angle = (segment / warcampSegments) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const topY =
      landmarkDatum + warcamp.foundation.surfaceY - 0.012;
    const middleY = THREE.MathUtils.lerp(topY, floorY, 0.52);
    const middleRadius = THREE.MathUtils.lerp(
      warcamp.foundation.walkableRadius,
      warcamp.foundation.radius,
      0.42,
    );
    positions.push(
      center[0] +
        warcamp.anchor[0] +
        cosine * warcamp.foundation.walkableRadius,
      topY,
      center[1] +
        warcamp.anchor[1] +
        sine * warcamp.foundation.walkableRadius,
      center[0] + warcamp.anchor[0] + cosine * middleRadius,
      middleY,
      center[1] + warcamp.anchor[1] + sine * middleRadius,
      center[0] +
        warcamp.anchor[0] +
        cosine * warcamp.foundation.radius,
      floorY,
      center[1] +
        warcamp.anchor[1] +
        sine * warcamp.foundation.radius,
    );
    uvs.push(
      segment / 6,
      1,
      segment / 6,
      0.48,
      segment / 6,
      0,
    );
    colors.push(
      lipColor.r,
      lipColor.g,
      lipColor.b,
      strataColor.r,
      strataColor.g,
      strataColor.b,
      dampColor.r,
      dampColor.g,
      dampColor.b,
    );
  }
  for (let segment = 0; segment < warcampSegments; segment += 1) {
    const next = (segment + 1) % warcampSegments;
    const top = warcampOffset + segment * 3;
    const middle = top + 1;
    const bottom = top + 2;
    const nextTop = warcampOffset + next * 3;
    const nextMiddle = nextTop + 1;
    const nextBottom = nextTop + 2;
    indices.push(
      top,
      middle,
      nextTop,
      nextTop,
      middle,
      nextMiddle,
      middle,
      bottom,
      nextMiddle,
      nextMiddle,
      bottom,
      nextBottom,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(uvs, 2),
  );
  geometry.setAttribute(
    "color",
    new THREE.Float32BufferAttribute(colors, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
