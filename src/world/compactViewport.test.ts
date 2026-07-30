import { describe, expect, it } from "vitest";
import {
  atlasViewportInsets,
  COMPACT_VIEWPORT_MEDIA_QUERY,
  isCompactViewport,
} from "./compactViewport";

describe("compact viewport policy", () => {
  it.each([
    [390, 844],
    [900, 1_200],
    [844, 390],
    [960, 540],
    [1_000, 560],
  ])("treats %sx%s as compact", (width, height) => {
    expect(isCompactViewport(width, height)).toBe(true);
  });

  it.each([
    [901, 1_200],
    [1_000, 561],
    [1_001, 560],
    [1_440, 900],
  ])("preserves the desktop composition at %sx%s", (width, height) => {
    expect(isCompactViewport(width, height)).toBe(false);
  });

  it("exports a media query with the same breakpoint boundaries", () => {
    expect(COMPACT_VIEWPORT_MEDIA_QUERY).toContain("max-width: 900px");
    expect(COMPACT_VIEWPORT_MEDIA_QUERY).toContain("max-width: 1000px");
    expect(COMPACT_VIEWPORT_MEDIA_QUERY).toContain("max-height: 560px");
  });

  it("reserves compact header, dock, and right-side controls", () => {
    const compact = atlasViewportInsets(390, 844);
    const landscape = atlasViewportInsets(960, 540);
    const desktop = atlasViewportInsets(1_440, 900);

    expect(compact.top).toBeGreaterThanOrEqual(56);
    expect(compact.bottom).toBeGreaterThanOrEqual(112);
    expect(compact.right).toBeGreaterThanOrEqual(56);
    expect(landscape).toEqual(compact);
    expect(desktop).toEqual({
      top: 58,
      right: 8,
      bottom: 8,
      left: 8,
    });
  });
});
