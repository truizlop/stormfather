import { describe, expect, it } from "vitest";
import { countryLabels, frontiers, frontierStyle } from "./frontiers";

describe("Roshar country frontiers", () => {
  it("uses unique, meaningful polylines inside the atlas bounds", () => {
    expect(new Set(frontiers.map((frontier) => frontier.id)).size).toBe(
      frontiers.length,
    );
    for (const frontier of frontiers) {
      expect(frontier.points.length).toBeGreaterThanOrEqual(4);
      expect(frontier.countries[0]).not.toBe(frontier.countries[1]);
      for (const [x, z] of frontier.points) {
        expect(x).toBeGreaterThanOrEqual(-54);
        expect(x).toBeLessThanOrEqual(52);
        expect(z).toBeGreaterThanOrEqual(-25);
        expect(z).toBeLessThanOrEqual(28);
      }
    }
  });

  it("represents national, disputed, and porous edges distinctly", () => {
    expect(new Set(frontiers.map((frontier) => frontier.kind))).toEqual(
      new Set(["national", "disputed", "porous"]),
    );
    expect(frontierStyle.national.dashSize).toBe(0);
    expect(frontierStyle.disputed.color).not.toBe(
      frontierStyle.porous.color,
    );
  });

  it("provides major and minor country labels", () => {
    expect(countryLabels.some((label) => label.emphasis === "major")).toBe(true);
    expect(countryLabels.some((label) => label.emphasis === "minor")).toBe(true);
  });
});
