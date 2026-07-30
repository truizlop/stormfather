import { useSyncExternalStore } from "react";
import { COMPACT_VIEWPORT_MEDIA_QUERY } from "../world/compactViewport";

function compactMediaQuery() {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia(COMPACT_VIEWPORT_MEDIA_QUERY);
}

function subscribeToCompactLayout(onStoreChange: () => void) {
  const mediaQuery = compactMediaQuery();
  if (!mediaQuery) return () => undefined;
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function compactLayoutSnapshot() {
  return compactMediaQuery()?.matches ?? false;
}

export function useCompactLayout() {
  return useSyncExternalStore(
    subscribeToCompactLayout,
    compactLayoutSnapshot,
    () => false,
  );
}
