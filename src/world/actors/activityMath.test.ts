import { describe, expect, it } from "vitest";
import {
  bridgeRunPose,
  cargoLiftHeight,
  fishingRaftPose,
} from "./activityMath";

describe("city activity motion", () => {
  it("moves bridge crews between the warcamp and plateau edge", () => {
    const start = bridgeRunPose(0, 0);
    const crossing = bridgeRunPose(5, 0);

    expect(start.x).toBeCloseTo(37.05);
    expect(crossing.x).toBeGreaterThan(start.x + 1);
    expect(crossing.z).toBeGreaterThan(start.z);
  });

  it("recalls bridge crews to shelter as the highstorm arrives", () => {
    const exposed = bridgeRunPose(5, 0);
    const sheltering = bridgeRunPose(5, 1);

    expect(sheltering.x).toBeLessThan(exposed.x);
    expect(sheltering.x).toBeCloseTo(37.17, 1);
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
});
