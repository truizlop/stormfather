import { describe, expect, it } from "vitest";
import { detailFromDistance, mapToWorld, worldToMinimap } from "./coordinates";

describe("world coordinates", () => {
  it("round-trips normalized map coordinates through the minimap", () => {
    const world = mapToWorld({ x: 0.25, y: 0.75 });
    const minimap = worldToMinimap(world);

    expect(minimap.x).toBeCloseTo(25);
    expect(minimap.y).toBeCloseTo(75);
  });

  it("selects successively richer levels of detail", () => {
    expect(detailFromDistance(75)).toBe("continent");
    expect(detailFromDistance(40)).toBe("region");
    expect(detailFromDistance(18)).toBe("city");
    expect(detailFromDistance(7)).toBe("street");
  });
});
