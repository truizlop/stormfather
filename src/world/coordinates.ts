const MAP_BOUNDS = {
  minX: -54,
  maxX: 52,
  minZ: -25,
  maxZ: 28,
} as const;

export function mapToWorld(point: { x: number; y: number }) {
  return {
    x: MAP_BOUNDS.minX + point.x * (MAP_BOUNDS.maxX - MAP_BOUNDS.minX),
    z: MAP_BOUNDS.minZ + point.y * (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ),
  };
}

export function worldToMinimap(point: { x: number; z: number }) {
  return {
    x: ((point.x - MAP_BOUNDS.minX) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX)) * 100,
    y: ((point.z - MAP_BOUNDS.minZ) / (MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ)) * 100,
  };
}

export function detailFromDistance(distance: number) {
  if (distance > 58) return "continent" as const;
  if (distance > 28) return "region" as const;
  if (distance > 11) return "city" as const;
  return "street" as const;
}
