import { describe, expect, it } from "vitest";
import {
  bridgeRunPose,
  cargoLiftHeight,
  fishingRaftPose,
  floatingWatercraftY,
} from "./activityMath";
import {
  SHATTERED_PLAINS_BRIDGE_RUN_PATH,
  shatteredPlainsSurfaceAt,
} from "../terrain/shatteredPlainsTopology";

describe("city activity motion", () => {
  it("moves bridge crews between the warcamp and plateau edge", () => {
    const center = [40, 13.76] as const;
    const start = bridgeRunPose(0, 0, center);
    const crossing = bridgeRunPose(5, 0, center);

    expect(start.x).toBeCloseTo(
      center[0] + SHATTERED_PLAINS_BRIDGE_RUN_PATH[0][0],
    );
    expect(start.z).toBeCloseTo(
      center[1] + SHATTERED_PLAINS_BRIDGE_RUN_PATH[0][1],
    );
    expect(crossing.x).toBeGreaterThan(start.x + 0.2);
    expect(crossing.z).toBeGreaterThan(start.z);
    expect(
      shatteredPlainsSurfaceAt(
        crossing.x - center[0],
        crossing.z - center[1],
      )?.id,
    ).toBe("plateau-31");
  });

  it("recalls bridge crews to shelter as the highstorm arrives", () => {
    const center = [40, 13.76] as const;
    const exposed = bridgeRunPose(5, 0, center);
    const sheltering = bridgeRunPose(5, 1, center);

    expect(sheltering.x).toBeLessThan(exposed.x);
    expect(sheltering.x).toBeCloseTo(center[0] - 3.46, 1);
  });

  it("brings fishing rafts into their village and lowers cargo", () => {
    const center = [-12, -9] as const;
    const fishing = fishingRaftPose(20, 1, 0, center);
    const sheltering = fishingRaftPose(20, 1, 1, center);
    const fishingDistance = Math.hypot(
      fishing.x - center[0],
      fishing.z - center[1],
    );
    const shelteringDistance = Math.hypot(
      sheltering.x - center[0],
      sheltering.z - center[1],
    );

    expect(shelteringDistance).toBeLessThan(fishingDistance);
    expect(cargoLiftHeight(20, 1)).toBeCloseTo(0.18);
  });

  it("keeps a fishing raft registered to a draining water surface", () => {
    const calm = floatingWatercraftY(0.08, 42, 1);
    const drained = floatingWatercraftY(0.035, 42, 1);

    expect(calm - drained).toBeCloseTo(0.045);
    expect(drained).toBeGreaterThan(0.035);
    expect(drained).toBeLessThan(0.08);
  });
});
