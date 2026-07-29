import { describe, expect, it } from "vitest";
import {
  createCreatureSeeds,
  createSprenSeeds,
  creatureMotionAt,
  deterministicUnit,
  ecologyBudget,
  sprenBehaviorAt,
} from "./ecology";

describe("Rosharan ecology placement", () => {
  it("is deterministic for a selected habitat and detail level", () => {
    expect(createCreatureSeeds("shattered-plains", "street")).toEqual(
      createCreatureSeeds("shattered-plains", "street"),
    );
    expect(createSprenSeeds("kholinar", "city")).toEqual(
      createSprenSeeds("kholinar", "city"),
    );
    expect(deterministicUnit("chasmfiend:one")).toBe(
      deterministicUnit("chasmfiend:one"),
    );
  });

  it("includes a chasmfiend at the Shattered Plains and coastal skyeels", () => {
    expect(
      createCreatureSeeds("shattered-plains", "city").some(
        (seed) => seed.species === "chasmfiend",
      ),
    ).toBe(true);
    expect(
      createCreatureSeeds("kharbranth", "city").some(
        (seed) => seed.species === "skyeel",
      ),
    ).toBe(true);
  });

  it("bounds populations by detail and viewport budget", () => {
    expect(ecologyBudget("continent", false)).toEqual({
      creatures: 0,
      spren: 0,
    });
    expect(ecologyBudget("street", true).creatures).toBeLessThan(
      ecologyBudget("street", false).creatures,
    );
    expect(createSprenSeeds("kholinar", "region", false)).toHaveLength(4);
  });
});

describe("storm-aware ecology", () => {
  it("drives axehounds quickly toward shelter during a storm", () => {
    const seed = createCreatureSeeds("kholinar", "street").find(
      (candidate) => candidate.species === "axehound",
    );
    expect(seed).toBeDefined();
    const calm = creatureMotionAt(seed!, 20, 0);
    const storm = creatureMotionAt(seed!, 20, 1);
    expect(Math.hypot(storm.x, storm.z)).toBeLessThan(
      Math.hypot(calm.x, calm.z),
    );
    expect(storm.pace).toBeGreaterThan(calm.pace * 3);
    expect(storm.crouch).toBeLessThan(calm.crouch);
  });

  it("amplifies wind and rain spren while life spren retract", () => {
    expect(sprenBehaviorAt("windspren", 1).speed).toBeGreaterThan(
      sprenBehaviorAt("windspren", 0).speed * 4,
    );
    expect(sprenBehaviorAt("rainspren", 1).visibility).toBeGreaterThan(
      sprenBehaviorAt("rainspren", 0).visibility,
    );
    expect(sprenBehaviorAt("lifespren", 1).visibility).toBeLessThan(
      sprenBehaviorAt("lifespren", 0).visibility * 0.2,
    );
  });
});
