import { describe, expect, it } from "vitest";
import {
  STORM_CYCLE_SECONDS,
  STORM_EAST_EDGE,
  STORM_WEST_EDGE,
  stormPhase,
  stormProximity,
  stormXAtTime,
} from "./storm";

describe("Highstorm simulation", () => {
  it("moves from east to west through one cycle", () => {
    expect(stormXAtTime(0)).toBe(STORM_EAST_EDGE);
    expect(stormXAtTime(STORM_CYCLE_SECONDS / 2)).toBeCloseTo(0);
    expect(stormXAtTime(STORM_CYCLE_SECONDS - 0.01)).toBeCloseTo(
      STORM_WEST_EDGE,
      1,
    );
  });

  it("classifies a location before, inside and after the wall", () => {
    expect(stormPhase(30, 0)).toBe("calm");
    expect(stormPhase(8, 0)).toBe("warning");
    expect(stormPhase(0, 0)).toBe("storm");
    expect(stormPhase(-9, 0)).toBe("wake");
  });

  it("returns a normalized local reaction strength", () => {
    expect(stormProximity(0, 0)).toBe(1);
    expect(stormProximity(20, 0)).toBe(0);
  });
});
