import { describe, expect, it } from "vitest";
import {
  createWindrunnerSeeds,
  URITHIRU_CROWN_CLEARANCE_RADIUS,
  URITHIRU_CROWN_MINIMUM_ALTITUDE,
  URITHIRU_TOWER_CLEARANCE_RADIUS,
  windrunnerBudget,
  windrunnerFlightModeAt,
  windrunnerFlightPoseAt,
} from "./windrunnerFlight";

describe("Windrunner patrol composition", () => {
  it("uses deterministic, mobile-budgeted formations", () => {
    expect(createWindrunnerSeeds("city")).toEqual(
      createWindrunnerSeeds("city"),
    );
    expect(windrunnerBudget("continent", false)).toBe(0);
    expect(windrunnerBudget("city", true)).toBeLessThan(
      windrunnerBudget("city", false),
    );
    expect(windrunnerBudget("street", false)).toBeGreaterThan(
      windrunnerBudget("region", false),
    );
  });

  it("includes a captain, fully bonded knights, and squires", () => {
    const formation = createWindrunnerSeeds("street");
    expect(formation[0]?.rank).toBe("captain");
    expect(formation.some((seed) => seed.rank === "knight")).toBe(true);
    expect(formation.some((seed) => seed.rank === "squire")).toBe(true);
  });

  it("keeps every flight plan outside Urithiru's broadest terrace", () => {
    const formation = createWindrunnerSeeds("street");
    for (const seed of formation) {
      for (let time = 0; time <= 180; time += 3) {
        const pose = windrunnerFlightPoseAt(seed, time, 0);
        if (seed.flightBand === "crown") {
          expect(pose.y).toBeGreaterThanOrEqual(
            URITHIRU_CROWN_MINIMUM_ALTITUDE,
          );
          expect(Math.hypot(pose.x, pose.z)).toBeGreaterThan(
            URITHIRU_CROWN_CLEARANCE_RADIUS,
          );
        } else {
          expect(Math.hypot(pose.x, pose.z)).toBeGreaterThan(
            URITHIRU_TOWER_CLEARANCE_RADIUS,
          );
        }
      }
    }
  });
});

describe("Windrunner flight simulation", () => {
  it("cycles through patrol, launch, and dive maneuvers", () => {
    const seed = createWindrunnerSeeds("city")[0]!;
    const modes = new Set(
      Array.from({ length: 180 }, (_, index) =>
        windrunnerFlightModeAt(seed, index * 0.4, 0),
      ),
    );
    expect(modes).toEqual(new Set(["patrol", "launch", "dive"]));
  });

  it("forms a brighter, higher stormguard above the storm layer", () => {
    const seed = createWindrunnerSeeds("city")[0]!;
    const calm = windrunnerFlightPoseAt(seed, 18, 0);
    const storm = windrunnerFlightPoseAt(seed, 18, 1);
    expect(storm.mode).toBe("stormguard");
    expect(storm.stormlight).toBeGreaterThan(calm.stormlight * 1.6);
    expect(storm.y).toBeGreaterThan(calm.y);
    expect(Math.abs(storm.bank)).toBeGreaterThan(Math.abs(calm.bank));
    expect(storm.speed).toBeGreaterThan(calm.speed);
  });

  it("returns finite orientation and velocity values throughout a patrol", () => {
    const seed = createWindrunnerSeeds("street")[5]!;
    for (let time = 0; time <= 90; time += 1.7) {
      const pose = windrunnerFlightPoseAt(seed, time, 0.4);
      for (const value of [
        pose.x,
        pose.y,
        pose.z,
        pose.heading,
        pose.pitch,
        pose.bank,
        pose.speed,
      ]) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });
});
