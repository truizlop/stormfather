import { describe, expect, it } from "vitest";
import {
  createFloraSeeds,
  floraBudget,
  floraReactionAt,
} from "./flora";

describe("Rosharan flora composition", () => {
  it("is deterministic and keeps grass exclusive to Shinovar", () => {
    expect(createFloraSeeds("kholinar", "street")).toEqual(
      createFloraSeeds("kholinar", "street"),
    );
    expect(
      createFloraSeeds("shinovar", "city").some(
        (seed) => seed.kind === "grass",
      ),
    ).toBe(true);
    for (const locationId of [
      "kholinar",
      "shattered-plains",
      "purelake",
      "aimia",
    ]) {
      expect(
        createFloraSeeds(locationId, "street").some(
          (seed) => seed.kind === "grass",
        ),
      ).toBe(false);
    }
  });

  it("uses bounded progressive budgets with a smaller compact mode", () => {
    expect(floraBudget("continent", false)).toBe(0);
    expect(floraBudget("region", false)).toBeLessThan(
      floraBudget("street", false),
    );
    expect(floraBudget("street", true)).toBeLessThan(
      floraBudget("street", false),
    );
  });
});

describe("highstorm flora reactions", () => {
  it("closes rockbuds and retracts shell fans", () => {
    const calmBud = floraReactionAt("rockbud", 0, false);
    const stormBud = floraReactionAt("rockbud", 1, false);
    const stormFan = floraReactionAt("shell-fan", 1, false);
    expect(stormBud.openness).toBeLessThan(calmBud.openness * 0.1);
    expect(stormFan.height).toBeLessThan(0.3);
    expect(stormFan.bend).toBeGreaterThan(1);
  });

  it("lets sheltered Shin grass bend without retracting", () => {
    const exposed = floraReactionAt("grass", 1, false);
    const sheltered = floraReactionAt("grass", 1, true);
    expect(sheltered.openness).toBe(1);
    expect(sheltered.height).toBeGreaterThan(0.95);
    expect(sheltered.bend).toBeLessThan(exposed.bend);
  });
});
