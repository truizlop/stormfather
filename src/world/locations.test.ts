import { describe, expect, it } from "vitest";
import { gazetteerById, gazetteerMarkerWorld } from "./gazetteer";
import { locationById } from "./locations";
import { LOCATION_TERRAIN_CRADLES } from "./terrain/locationTerrain";

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

  it.each([
    ["azir", "azimir"],
    ["aimia", "akinah"],
  ] as const)(
    "co-registers the %s authored scene with the searched %s city",
    (locationId, gazetteerId) => {
      const location = locationById.get(locationId)!;
      const place = gazetteerById.get(gazetteerId)!;
      const marker = gazetteerMarkerWorld(place)!;
      const cradle = LOCATION_TERRAIN_CRADLES.find(
        (candidate) => candidate.id === locationId,
      )!;

      expect([location.coordinates.x, location.coordinates.z]).toEqual(
        marker,
      );
      expect(cradle.center).toEqual(marker);
      expect(
        Math.hypot(
          location.camera.target[0] - marker[0],
          location.camera.target[2] - marker[1],
        ),
      ).toBeLessThan(0.02);
    },
  );
});
