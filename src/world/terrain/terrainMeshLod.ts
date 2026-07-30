import type { DetailLevel } from "../types";

export function terrainMeshSegments(
  mobile: boolean,
  focused: boolean,
) {
  if (mobile) {
    return focused ? ([260, 138] as const) : ([190, 100] as const);
  }
  return focused ? ([480, 252] as const) : ([320, 168] as const);
}

export function showCartographicLinework(detailLevel: DetailLevel) {
  return detailLevel === "continent" || detailLevel === "region";
}
