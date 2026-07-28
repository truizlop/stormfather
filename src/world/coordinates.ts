import { ROSHAR_MAP_BOUNDS } from "./cartography/geography";

export function mapToWorld(point: { x: number; y: number }) {
  return {
    x:
      ROSHAR_MAP_BOUNDS.minX +
      point.x * (ROSHAR_MAP_BOUNDS.maxX - ROSHAR_MAP_BOUNDS.minX),
    z:
      ROSHAR_MAP_BOUNDS.minZ +
      point.y * (ROSHAR_MAP_BOUNDS.maxZ - ROSHAR_MAP_BOUNDS.minZ),
  };
}

export function worldToMinimap(point: { x: number; z: number }) {
  return {
    x:
      ((point.x - ROSHAR_MAP_BOUNDS.minX) /
        (ROSHAR_MAP_BOUNDS.maxX - ROSHAR_MAP_BOUNDS.minX)) *
      100,
    y:
      ((point.z - ROSHAR_MAP_BOUNDS.minZ) /
        (ROSHAR_MAP_BOUNDS.maxZ - ROSHAR_MAP_BOUNDS.minZ)) *
      100,
  };
}

export function detailFromDistance(distance: number) {
  if (distance > 58) return "continent" as const;
  if (distance > 28) return "region" as const;
  if (distance > 11) return "city" as const;
  return "street" as const;
}
