import { describe, expect, it } from "vitest";
import { detailFromDistance } from "./coordinates";
import {
  atlasCameraFov,
  drainQueuedZoomRequests,
  enqueueZoomRequest,
  fittedModeledArrivalDetailOwner,
  fittedModeledArrivalPose,
  gazetteerArrivalOffset,
  isMobileWorldOverview,
  modeledArrivalBounds,
  modeledArrivalProjectedExtent,
} from "./cameraArrival";
import { landmarkLocalScale } from "./cities/landmarkMetrics";
import { cityProfile } from "./cities/profiles";
import { cityProximityCandidate } from "./cities/progressiveLod";
import { semanticSettlementProfile } from "./gazetteer/semanticSettlements";
import { locations } from "./locations";
import { localSurfaceY } from "./terrain/localSurface";

const modeledLocations = locations.filter((location) => location.modelRoot);

describe("gazetteer arrival framing", () => {
  it.each(["hearthstone", "sesemalex-dar"] as const)(
    "lands the semantic settlement %s at visible city detail",
    (id) => {
      for (const mobile of [false, true]) {
        const offset = gazetteerArrivalOffset(
          { id, minimumLod: "region" },
          mobile,
        );
        expect(detailFromDistance(Math.hypot(...offset))).toBe("city");
      }
    },
  );

  it("keeps an ordinary regional feature at regional framing", () => {
    const offset = gazetteerArrivalOffset(
      { id: "horneater-peaks", minimumLod: "region" },
      false,
    );
    expect(detailFromDistance(Math.hypot(...offset))).toBe("region");
  });

  it("brings mobile Hearthstone close enough to read while staying outside the village", () => {
    const place = { id: "hearthstone", minimumLod: "region" } as const;
    const desktop = gazetteerArrivalOffset(place, false);
    const mobile = gazetteerArrivalOffset(place, true);
    const radius = semanticSettlementProfile(place.id)!.radius;
    const mobileLookDistance = Math.hypot(
      mobile[0],
      mobile[1] - 0.3,
      mobile[2],
    );

    expect(mobileLookDistance).toBeLessThan(Math.hypot(...desktop));
    expect(detailFromDistance(mobileLookDistance)).toBe("city");
    expect(Math.hypot(mobile[0], mobile[2])).toBeGreaterThan(
      radius * 1.25,
    );
  });

  it("widens focused mobile views without treating search results as the world overview", () => {
    expect(atlasCameraFov(1440, false)).toBe(42);
    expect(atlasCameraFov(390, false)).toBe(54);
    expect(atlasCameraFov(390, true)).toBe(72);
    expect(
      isMobileWorldOverview(
        390,
        "roshar",
        null,
        "continent",
        null,
      ),
    ).toBe(true);
    expect(
      isMobileWorldOverview(
        390,
        "roshar",
        "hearthstone",
        "city",
        null,
      ),
    ).toBe(false);
    expect(
      isMobileWorldOverview(
        390,
        "roshar",
        null,
        "city",
        "thaylen-city",
      ),
    ).toBe(false);
    expect(
      isMobileWorldOverview(390, "roshar", null, "street", null),
    ).toBe(false);
  });
});

describe("modeled mobile arrival fitting", () => {
  const viewportWidth = 390;
  const viewportHeight = 844;
  const fov = 54;
  const candidates = modeledLocations.map((location) =>
    cityProximityCandidate(location.id),
  );

  it("fits every authored city inside its own portrait proximity lens", () => {
    expect(modeledLocations).toHaveLength(10);

    for (const location of modeledLocations) {
      const pose = fittedModeledArrivalPose(
        location,
        viewportWidth,
        viewportHeight,
        fov,
      );
      const bounds = modeledArrivalBounds(location)!;
      const candidate = candidates.find(
        (entry) => entry.locationId === location.id,
      )!;
      expect(pose, location.id).not.toBeNull();
      const extent = modeledArrivalProjectedExtent(
        pose!,
        bounds,
        viewportWidth,
        viewportHeight,
        fov,
      );

      expect(extent.horizontal, location.id).toBeLessThanOrEqual(0.94);
      expect(extent.vertical, location.id).toBeLessThanOrEqual(0.94);
      expect(
        Math.hypot(
          pose!.position[0] - candidate.center[0],
          pose!.position[1] - candidate.center[1],
          pose!.position[2] - candidate.center[2],
        ),
        location.id,
      ).toBeLessThanOrEqual(candidate.lensDistance);
      expect(
        pose!.position[1] -
          localSurfaceY(location.id, pose!.position[0], pose!.position[2]),
        location.id,
      ).toBeGreaterThanOrEqual(0.52);
      expect(
        fittedModeledArrivalDetailOwner(location, pose!, candidates),
        location.id,
      ).toBe(location.id);
    }
  });

  it("uses Kharbranth's conservative authored cliff width", () => {
    const location = modeledLocations.find(
      (entry) => entry.id === "kharbranth",
    )!;
    const scale = landmarkLocalScale(
      location.modelRoot!,
      cityProfile(location.id, location.culture),
    );

    expect(modeledArrivalBounds(location)!.halfSize[0]).toBeCloseTo(
      8.25 * scale,
    );
  });

  it("includes Vedenar's Tarat-facing docks in arrival framing", () => {
    const location = modeledLocations.find(
      (entry) => entry.id === "vedenar",
    )!;
    const scale = landmarkLocalScale(
      location.modelRoot!,
      cityProfile(location.id, location.culture),
    );

    expect(modeledArrivalBounds(location)!.halfSize[2]).toBeCloseTo(
      6.2 * scale,
    );
  });

  it("does not preserve city detail for a fitted lens owned by another city", () => {
    const location = modeledLocations.find(
      (entry) => entry.id === "kharbranth",
    )!;
    const pose = fittedModeledArrivalPose(
      location,
      viewportWidth,
      viewportHeight,
      fov,
    )!;
    const otherCandidate = candidates.find(
      (entry) => entry.locationId === "thaylen-city",
    )!;

    expect(
      fittedModeledArrivalDetailOwner(location, pose, [otherCandidate]),
    ).toBeNull();
  });
});

describe("arrival zoom queue", () => {
  it("waits for travel completion and drains explicit zoom levels in FIFO order", () => {
    const queued = enqueueZoomRequest(
      enqueueZoomRequest([], { factor: 0.65, level: "city" }),
      { factor: 0.38, level: "street" },
    );

    expect(drainQueuedZoomRequests(0.99, queued)).toEqual({
      ready: [],
      pending: queued,
    });
    expect(drainQueuedZoomRequests(1, queued)).toEqual({
      ready: [
        { factor: 0.65, level: "city" },
        { factor: 0.38, level: "street" },
      ],
      pending: [],
    });
  });
});
