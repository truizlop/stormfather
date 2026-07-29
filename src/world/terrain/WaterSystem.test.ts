import { describe, expect, it } from "vitest";
import { OCEAN_WATER_HEIGHT } from "./locationSurface";
import { RENDERED_OCEAN_HEIGHT } from "./WaterSystem";

describe("rendered water datums", () => {
  it("renders the ocean at the shared harbor and watercraft datum", () => {
    expect(RENDERED_OCEAN_HEIGHT).toBe(OCEAN_WATER_HEIGHT);
  });
});
