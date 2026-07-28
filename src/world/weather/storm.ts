export const STORM_EAST_EDGE = 54;
export const STORM_WEST_EDGE = -54;
export const STORM_CYCLE_SECONDS = 210;

export type StormPhase = "calm" | "warning" | "storm" | "wake";

export function stormXAtTime(timeSeconds: number) {
  const progress =
    ((timeSeconds % STORM_CYCLE_SECONDS) + STORM_CYCLE_SECONDS) %
    STORM_CYCLE_SECONDS;
  return (
    STORM_EAST_EDGE -
    (progress / STORM_CYCLE_SECONDS) * (STORM_EAST_EDGE - STORM_WEST_EDGE)
  );
}

export function stormProximity(stormX: number, entityX: number) {
  const distance = Math.abs(stormX - entityX);
  return Math.max(0, 1 - distance / 11);
}

export function stormPhase(stormX: number, entityX: number): StormPhase {
  const delta = stormX - entityX;
  if (delta > 11) return "calm";
  if (delta > 2.5) return "warning";
  if (delta > -6.5) return "storm";
  return "wake";
}

export function timeUntilStorm(stormX: number, entityX: number) {
  if (stormX < entityX) return null;
  const worldUnitsPerSecond =
    (STORM_EAST_EDGE - STORM_WEST_EDGE) / STORM_CYCLE_SECONDS;
  return (stormX - entityX) / worldUnitsPerSecond;
}
