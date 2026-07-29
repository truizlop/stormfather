import { describe, expect, it } from "vitest";
import {
  markerArchetypeByVisualization,
  markerArchetypeForVisualization,
  visualizationArchetypes,
} from "./markerArchetypes";

describe("gazetteer marker archetypes", () => {
  it("covers every visualization value exactly once", () => {
    expect(visualizationArchetypes).toHaveLength(31);
    expect(new Set(visualizationArchetypes).size).toBe(
      visualizationArchetypes.length,
    );
    expect(Object.keys(markerArchetypeByVisualization).sort()).toEqual(
      [...visualizationArchetypes].sort(),
    );

    for (const visualization of visualizationArchetypes) {
      expect(markerArchetypeForVisualization(visualization)).toBe(
        markerArchetypeByVisualization[visualization],
      );
    }
  });

  it("keeps settlement silhouettes semantically distinct", () => {
    expect(
      ([
        "fortified-city",
        "terrace-city",
        "port-city",
        "administrative-city",
        "market-city",
        "mountain-city",
        "village",
        "ruined-city",
      ] as const).map(markerArchetypeForVisualization),
    ).toEqual([
      "fortified-city",
      "terrace-city",
      "port-city",
      "administrative-city",
      "market-city",
      "mountain-city",
      "village",
      "ruined-city",
    ]);
  });

  it("does not collapse navigation and landmark symbols into generic solids", () => {
    expect(markerArchetypeForVisualization("lighthouse")).toBe("lighthouse");
    expect(markerArchetypeForVisualization("harbor")).toBe("harbor");
    expect(markerArchetypeForVisualization("processional-way")).toBe(
      "processional-way",
    );
    expect(markerArchetypeForVisualization("caves")).toBe("caves");
    expect(markerArchetypeForVisualization("rock-formation")).toBe(
      "rock-formation",
    );
    expect(markerArchetypeForVisualization("island-chain")).toBe(
      "island-chain",
    );
  });
});
