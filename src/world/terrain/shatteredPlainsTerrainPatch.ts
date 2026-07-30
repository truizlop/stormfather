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

export function createShatteredPlainsFloorGeometry(
  center: readonly [number, number],
  landmarkDatum: number,
  outerHeightAt: (x: number, z: number) => number,
  radialSegments = 96,
) {
  const segments = Math.max(24, Math.floor(radialSegments));
  const floorRings = 3;
  const transitionRings = 6;
  const ringCount = floorRings + transitionRings;
  const floorY = landmarkDatum + SHATTERED_PLAINS_PATCH.chasmFloorY;
  const positions: number[] = [center[0], floorY, center[1]];
  const uvs: number[] = [0.5, 0.5];
  const colors: number[] = [0.18, 0.22, 0.22];
  const indices: number[] = [];
  const floorColor = new THREE.Color("#263334");
  const shoulderColor = new THREE.Color("#777064");
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
    const blend = smoothstep(transitionProgress);

    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const x = center[0] + cosine * radiusX;
      const z = center[1] + sine * radiusZ;
      const outerX =
        center[0] +
        cosine * SHATTERED_PLAINS_PATCH.outerRadiusX;
      const outerZ =
        center[1] +
        sine * SHATTERED_PLAINS_PATCH.outerRadiusZ;
      const y = THREE.MathUtils.lerp(
        floorY,
        outerHeightAt(outerX, outerZ) + 0.008,
        blend,
      );
      positions.push(x, y, z);
      uvs.push(
        0.5 +
          (cosine * radiusX) /
            (SHATTERED_PLAINS_PATCH.outerRadiusX * 2),
        0.5 +
          (sine * radiusZ) /
            (SHATTERED_PLAINS_PATCH.outerRadiusZ * 2),
      );
      vertexColor.lerpColors(floorColor, shoulderColor, blend);
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
  const indices: number[] = [];
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
          0.006;
      const startZ =
        center[1] +
        start[1] +
        ((start[1] - centerZ) / Math.max(0.001, outwardStart)) *
          0.006;
      const endX =
        center[0] +
        end[0] +
        ((end[0] - centerX) / Math.max(0.001, outwardEnd)) * 0.006;
      const endZ =
        center[1] +
        end[1] +
        ((end[1] - centerZ) / Math.max(0.001, outwardEnd)) * 0.006;
      const topY = landmarkDatum + plateau.capY - 0.045;
      const offset = positions.length / 3;
      positions.push(
        startX,
        topY,
        startZ,
        endX,
        topY,
        endZ,
        startX,
        floorY,
        startZ,
        endX,
        floorY,
        endZ,
      );
      const edgeLength = Math.hypot(endX - startX, endZ - startZ);
      uvs.push(0, 1, edgeLength * 4, 1, 0, 0, edgeLength * 4, 0);
      indices.push(
        offset,
        offset + 2,
        offset + 1,
        offset + 1,
        offset + 2,
        offset + 3,
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
    positions.push(
      center[0] +
        warcamp.anchor[0] +
        cosine * warcamp.foundation.walkableRadius,
      landmarkDatum + warcamp.foundation.baseY + 0.006,
      center[1] +
        warcamp.anchor[1] +
        sine * warcamp.foundation.walkableRadius,
      center[0] +
        warcamp.anchor[0] +
        cosine * warcamp.foundation.radius,
      floorY,
      center[1] +
        warcamp.anchor[1] +
        sine * warcamp.foundation.radius,
    );
    uvs.push(segment / 6, 1, segment / 6, 0);
  }
  for (let segment = 0; segment < warcampSegments; segment += 1) {
    const next = (segment + 1) % warcampSegments;
    const top = warcampOffset + segment * 2;
    const bottom = top + 1;
    const nextTop = warcampOffset + next * 2;
    const nextBottom = nextTop + 1;
    indices.push(top, bottom, nextTop, nextTop, bottom, nextBottom);
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
