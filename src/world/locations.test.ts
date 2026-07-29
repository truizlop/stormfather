import { describe, expect, it } from "vitest";
import { locationById } from "./locations";

describe("authored destination arrival framing", () => {
  it("centers the complete Shattered Plains footprint at city scale", () => {
    const location = locationById.get("shattered-plains");
    expect(location).toBeDefined();

    const targetOffset = Math.hypot(
      location!.camera.target[0] - location!.coordinates.x,
      location!.camera.target[2] - location!.coordinates.z,
    );
    const cameraDistance = Math.hypot(
      location!.camera.position[0] - location!.camera.target[0],
      location!.camera.position[1] - location!.camera.target[1],
      location!.camera.position[2] - location!.camera.target[2],
    );

    expect(targetOffset).toBeLessThan(0.05);
    expect(cameraDistance).toBeGreaterThan(11);
    expect(cameraDistance).toBeLessThan(28);
  });
});
