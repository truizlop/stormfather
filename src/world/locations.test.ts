import { describe, expect, it } from "vitest";
import { cityProfile } from "./cities/profiles";
import {
  cityProximityCandidate,
  nearestCityProximityOwner,
} from "./cities/progressiveLod";
import { detailFromDistance } from "./coordinates";
import { gazetteerById, gazetteerMarkerWorld } from "./gazetteer";
import {
  locationById,
  locationDisplayName,
  locations,
  modeledLocationForGazetteer,
} from "./locations";
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
    expect(location!.camera.position[0]).toBeLessThan(
      location!.coordinates.x,
    );
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

  it("keeps every authored travel camera at its declared tier or a safer exterior city tier", () => {
    for (const location of locations) {
      const distance = Math.hypot(
        location.camera.position[0] - location.camera.target[0],
        location.camera.position[1] - location.camera.target[1],
        location.camera.position[2] - location.camera.target[2],
      );
      const actual = detailFromDistance(distance);
      const allowed =
        location.modelRoot && location.arrivalDetail === "street"
          ? ["street", "city"]
          : [location.arrivalDetail];
      expect(allowed, location.id).toContain(actual);
    }
  });

  it("keeps modeled arrivals outside their footprints with an exterior oblique sightline", () => {
    for (const location of locations.filter(
      (candidate) => candidate.modelRoot,
    )) {
      const profile = cityProfile(location.id, location.culture);
      const horizontalFromCenter = Math.hypot(
        location.camera.position[0] - location.coordinates.x,
        location.camera.position[2] - location.coordinates.z,
      );
      const horizontalLook = Math.hypot(
        location.camera.position[0] - location.camera.target[0],
        location.camera.position[2] - location.camera.target[2],
      );
      const verticalLook =
        location.camera.position[1] - location.camera.target[1];
      const pitch = Math.atan2(verticalLook, horizontalLook);

      expect(horizontalFromCenter, location.id).toBeGreaterThan(
        profile.radius * 1.25,
      );
      expect(horizontalLook, location.id).toBeGreaterThan(profile.radius);
      expect(pitch, location.id).toBeGreaterThan(0.45);
      expect(pitch, location.id).toBeLessThan(1.05);
    }
  });

  it("lands every modeled list destination inside its own viewed near-detail envelope", () => {
    const modeled = locations.filter((location) => location.modelRoot);
    const candidates = modeled.map((location) =>
      cityProximityCandidate(location.id),
    );

    for (const location of modeled) {
      const candidate = candidates.find(
        (entry) => entry.locationId === location.id,
      )!;
      const cameraDistance = Math.hypot(
        location.camera.position[0] - candidate.center[0],
        location.camera.position[1] - candidate.center[1],
        location.camera.position[2] - candidate.center[2],
      );
      const focusDistance = Math.hypot(
        location.camera.target[0] - candidate.center[0],
        location.camera.target[1] - candidate.center[1],
        location.camera.target[2] - candidate.center[2],
      );

      expect.soft(cameraDistance, location.id).toBeLessThanOrEqual(
        candidate.lensDistance,
      );
      expect.soft(focusDistance, location.id).toBeLessThanOrEqual(
        candidate.nearDistance,
      );
      expect.soft(
        nearestCityProximityOwner(location.camera.position, candidates, {
          focusPosition: location.camera.target,
        }),
        location.id,
      ).toBe(location.id);
    }
  });

  it.each([
    ["azimir", "azir", "Azimir"],
    ["akinah", "aimia", "Akinah"],
    ["vedenar", "vedenar", "Vedenar"],
  ] as const)(
    "resolves exact %s searches to the exterior %s authored scene and label",
    (gazetteerId, locationId, expectedLabel) => {
      const place = gazetteerById.get(gazetteerId)!;
      const location = locationById.get(locationId)!;

      expect(modeledLocationForGazetteer(place)?.id).toBe(locationId);
      expect(locationDisplayName(location, place)).toBe(expectedLabel);
    },
  );

  it("keeps Vedenar geographically independent from its Urithiru portal label", () => {
    const vedenar = locationById.get("vedenar")!;
    const urithiru = locationById.get("urithiru")!;
    const place = gazetteerById.get("vedenar")!;

    expect([vedenar.coordinates.x, vedenar.coordinates.z]).toEqual([
      13.25711084817365,
      9.719221057177,
    ]);
    expect(vedenar.modelRoot).toBe("Landmark_Vedenar");
    expect(vedenar.modelRoot).not.toBe(urithiru.modelRoot);
    expect(place.parentLocationId).toBe("vedenar");
    expect(modeledLocationForGazetteer(place)).toBe(vedenar);
  });
});
