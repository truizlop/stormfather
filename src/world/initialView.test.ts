import { describe, expect, it } from "vitest";
import { cityProximityCandidate } from "./cities/progressiveLod";
import { INITIAL_ATLAS_CAMERA } from "./initialView";
import { locations } from "./locations";

describe("initial atlas camera", () => {
  it("starts outside every authored city lens", () => {
    for (const location of locations.filter(
      (candidate) => candidate.modelRoot,
    )) {
      const candidate = cityProximityCandidate(location.id);
      const distance = Math.hypot(
        INITIAL_ATLAS_CAMERA.position[0] - candidate.center[0],
        INITIAL_ATLAS_CAMERA.position[1] - candidate.center[1],
        INITIAL_ATLAS_CAMERA.position[2] - candidate.center[2],
      );

      expect(distance, location.name).toBeGreaterThan(
        candidate.lensDistance,
      );
    }
  });
});
