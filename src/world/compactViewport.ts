export const COMPACT_VIEWPORT_MAX_WIDTH = 900;
export const COMPACT_LANDSCAPE_MAX_WIDTH = 1_000;
export const COMPACT_LANDSCAPE_MAX_HEIGHT = 560;

/**
 * Keep this query aligned with `isCompactViewport`. UI code can consume the
 * query through `useCompactLayout`, while Three.js code uses the pure
 * predicate with the renderer's measured drawing-buffer size.
 */
export const COMPACT_VIEWPORT_MEDIA_QUERY =
  `(max-width: ${COMPACT_VIEWPORT_MAX_WIDTH}px), ` +
  `(max-width: ${COMPACT_LANDSCAPE_MAX_WIDTH}px) and ` +
  `(max-height: ${COMPACT_LANDSCAPE_MAX_HEIGHT}px)`;

export interface AtlasViewportInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const DESKTOP_VIEWPORT_INSETS: AtlasViewportInsets = {
  top: 58,
  right: 8,
  bottom: 8,
  left: 8,
};

/**
 * These conservative CSS-pixel insets match the compact atlas chrome:
 * a 56px header, a 48px right-side control rail, and the collapsed travel
 * dock plus breathing room. Device safe-area padding is added by CSS, so the
 * label layer intentionally leaves a little extra clearance here.
 */
const COMPACT_VIEWPORT_INSETS: AtlasViewportInsets = {
  top: 64,
  right: 64,
  bottom: 124,
  left: 8,
};

/**
 * Compact composition applies to phones and portrait tablets, plus short
 * landscape screens where a desktop side-panel layout would leave too little
 * vertical map area.
 */
export function isCompactViewport(
  width: number,
  height = Number.POSITIVE_INFINITY,
) {
  if (!Number.isFinite(width) || width <= 0) return false;
  if (width <= COMPACT_VIEWPORT_MAX_WIDTH) return true;
  return (
    Number.isFinite(height) &&
    height > 0 &&
    width <= COMPACT_LANDSCAPE_MAX_WIDTH &&
    height <= COMPACT_LANDSCAPE_MAX_HEIGHT
  );
}

export function atlasViewportInsets(
  width: number,
  height: number,
): AtlasViewportInsets {
  return isCompactViewport(width, height)
    ? COMPACT_VIEWPORT_INSETS
    : DESKTOP_VIEWPORT_INSETS;
}
