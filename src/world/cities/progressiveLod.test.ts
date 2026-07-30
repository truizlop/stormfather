import { describe, expect, it } from "vitest";
import {
  CITY_PROXIMITY_HANDOFF_HYSTERESIS,
  CITY_PROXIMITY_PROXY_PADDING,
  cityInspectionOwnerAtFocus,
  cityLodConfig,
  cityNearDetailShouldMount,
  cityProximityCandidate,
  citySilhouetteShouldRender,
  citySilhouettePlanRadius,
  createCityLodState,
  createCitySilhouette,
  effectiveCityLodDistance,
  localCityPresenceId,
  localCityRenderDetail,
  nearestCityFocusOwner,
  nearestCityProximityOwner,
  resolvedCityProximityOwner,
  selectedCityShouldForceNear,
  updateCityLodState,
} from "./progressiveLod";

const testConfig = {
  nearDistance: 20,
  farDistance: 50,
  hysteresis: 3,
  fadeSeconds: 0.25,
};

describe("progressive city LOD", () => {
  it("suppresses unrelated map proxies inside an authored local city lens", () => {
    expect(
      citySilhouetteShouldRender("kharbranth", "vedenar"),
    ).toBe(false);
    expect(
      citySilhouetteShouldRender("vedenar", "vedenar"),
    ).toBe(true);
    expect(
      citySilhouetteShouldRender("kharbranth", "vedenar"),
    ).toBe(false);
    expect(
      citySilhouetteShouldRender("kharbranth", null),
    ).toBe(true);
  });

  it("keeps a selected semantic city in authored near detail", () => {
    expect(effectiveCityLodDistance(25.38, true)).toBe(0);
    expect(effectiveCityLodDistance(25.38, false)).toBe(25.38);
  });

  it("requests authored detail when manual camera movement reaches an unselected city", () => {
    const state = createCityLodState(30, testConfig);
    expect(cityNearDetailShouldMount(state, false)).toBe(false);

    updateCityLodState(
      state,
      effectiveCityLodDistance(16, false),
      1 / 60,
      testConfig,
    );

    expect(state.target).toBe("near");
    expect(cityNearDetailShouldMount(state, false)).toBe(true);
  });

  it("does not eagerly mount far or mid authored scenes and retains an outgoing fade", () => {
    expect(
      cityNearDetailShouldMount(
        createCityLodState(70, testConfig),
        false,
      ),
    ).toBe(false);
    expect(
      cityNearDetailShouldMount(
        createCityLodState(30, testConfig),
        false,
      ),
    ).toBe(false);

    const leavingNear = createCityLodState(10, testConfig);
    updateCityLodState(leavingNear, 30, 1 / 60, testConfig);
    expect(leavingNear.target).toBe("mid");
    expect(leavingNear.weights.near).toBeGreaterThan(0);
    expect(cityNearDetailShouldMount(leavingNear, false)).toBe(true);

    for (let frame = 0; frame < 180; frame += 1) {
      updateCityLodState(leavingNear, 30, 1 / 60, testConfig);
    }
    expect(cityNearDetailShouldMount(leavingNear, false)).toBe(false);
  });

  it("gives Azir a compact map lens instead of an overlapping authored envelope", () => {
    const candidates = [
      "azir",
      "urithiru",
      "purelake",
      "aimia",
      "shinovar",
      "kharbranth",
      "kholinar",
      "thaylen-city",
      "shattered-plains",
      "vedenar",
    ].map(cityProximityCandidate);
    const azir = candidates.find(
      (candidate) => candidate.locationId === "azir",
    )!;
    const overlapping = candidates.filter(
      (candidate) =>
        Math.hypot(
          azir.center[0] - candidate.center[0],
          azir.center[1] - candidate.center[1],
          azir.center[2] - candidate.center[2],
        ) <= candidate.nearDistance,
    );

    expect(overlapping.map((candidate) => candidate.locationId)).toEqual([
      "azir",
    ]);
    expect(
      nearestCityProximityOwner(azir.center, candidates),
    ).toBe("azir");
  });

  it("keeps Kharbranth and Thaylen ownership lenses disjoint", () => {
    const candidates = ["kharbranth", "thaylen-city"].map(
      cityProximityCandidate,
    );
    const kharbranth = candidates[0];
    const thaylen = candidates[1];
    const centerDistance = Math.hypot(
      kharbranth.center[0] - thaylen.center[0],
      kharbranth.center[1] - thaylen.center[1],
      kharbranth.center[2] - thaylen.center[2],
    );

    expect(centerDistance).toBeGreaterThan(
      kharbranth.nearDistance + thaylen.nearDistance,
    );
    expect(
      nearestCityProximityOwner(kharbranth.center, candidates, {
        focusPosition: kharbranth.center,
      }),
    ).toBe("kharbranth");
    expect(
      nearestCityProximityOwner(thaylen.center, candidates, {
        focusPosition: thaylen.center,
      }),
    ).toBe("thaylen-city");

    // A stale Kharbranth list selection is intentionally absent from this
    // camera-derived helper. Panning the viewed point to Thaylen hands off.
    expect(
      nearestCityProximityOwner(
        kharbranth.center,
        candidates,
        { focusPosition: thaylen.center },
      ),
    ).toBe("thaylen-city");
    expect(
      nearestCityFocusOwner(thaylen.center, candidates),
    ).toBe("thaylen-city");
  });

  it("keeps Kharbranth and Vedenar ownership lenses disjoint", () => {
    const candidates = ["kharbranth", "vedenar"].map(
      cityProximityCandidate,
    );
    const kharbranth = candidates[0];
    const vedenar = candidates[1];
    const centerDistance = Math.hypot(
      kharbranth.center[0] - vedenar.center[0],
      kharbranth.center[1] - vedenar.center[1],
      kharbranth.center[2] - vedenar.center[2],
    );

    expect(centerDistance).toBeGreaterThan(
      kharbranth.nearDistance + vedenar.nearDistance,
    );
    expect(
      nearestCityProximityOwner(vedenar.center, candidates, {
        currentOwnerId: "kharbranth",
        focusPosition: vedenar.center,
      }),
    ).toBe("vedenar");
    expect(
      nearestCityProximityOwner(kharbranth.center, candidates, {
        currentOwnerId: "vedenar",
        focusPosition: kharbranth.center,
      }),
    ).toBe("kharbranth");
  });

  it("does not let Kharbranth's oversized local footprint claim Thaylen's map lens", () => {
    const candidates = ["kharbranth", "thaylen-city"].map(
      cityProximityCandidate,
    );
    const camera = [9.66, 2.32, 23.6] as const;
    const lowerRoadFocus = [9.92, 2.25, 22.7611] as const;

    expect(
      nearestCityProximityOwner(camera, candidates, {
        focusPosition: lowerRoadFocus,
      }),
    ).toBe("thaylen-city");
    expect(
      nearestCityProximityOwner(camera, candidates, {
        currentOwnerId: "thaylen-city",
        focusPosition: lowerRoadFocus,
      }),
    ).toBe("thaylen-city");
  });

  it("can disable outgoing retention for an explicit destination handoff", () => {
    const outgoing = createCityLodState(10, testConfig);
    const incoming = createCityLodState(30, testConfig);

    for (let frame = 0; frame < 180; frame += 1) {
      updateCityLodState(
        outgoing,
        effectiveCityLodDistance(10, false, false),
        1 / 60,
        testConfig,
      );
      updateCityLodState(
        incoming,
        effectiveCityLodDistance(10, false, true),
        1 / 60,
        testConfig,
      );

      expect(
        [outgoing, incoming].filter(
          (state) =>
            cityNearDetailShouldMount(
              state,
              false,
              state === incoming,
              false,
            ),
        ).length,
      ).toBeLessThanOrEqual(1);
      if (frame === 0) {
        expect(outgoing.weights.near).toBeGreaterThan(0);
        expect(outgoing.weights.near).toBeLessThan(1);
        expect(
          cityNearDetailShouldMount(
            outgoing,
            false,
            false,
            false,
          ),
        ).toBe(false);
      }
    }

    expect(outgoing.weights.near).toBe(0);
    expect(
      cityNearDetailShouldMount(outgoing, false, false),
    ).toBe(false);
    expect(incoming.weights.near).toBeGreaterThan(0.999);
  });

  it("lets exact selection replace an outgoing owner immediately", () => {
    const outgoing = createCityLodState(10, testConfig);
    const selected = createCityLodState(70, testConfig);

    expect(
      cityNearDetailShouldMount(outgoing, false, false, false),
    ).toBe(false);
    expect(
      cityNearDetailShouldMount(selected, true, true, false),
    ).toBe(true);
  });

  it("activates a standalone manual approach from Roshar and clears outside local detail", () => {
    const candidate = cityProximityCandidate("thaylen-city");
    const camera = [
      candidate.center[0] + candidate.nearDistance * 0.62,
      candidate.center[1] + 5,
      candidate.center[2] + 2,
    ] as const;

    const owner = nearestCityProximityOwner(camera, [candidate], {
      focusPosition: candidate.center,
    });
    expect(owner).toBe("thaylen-city");
    expect(localCityPresenceId("city", owner)).toBe(
      "thaylen-city",
    );
    expect(localCityPresenceId("street", owner)).toBe(
      "thaylen-city",
    );
    expect(localCityPresenceId("region", owner)).toBe("thaylen-city");
    expect(localCityPresenceId("continent", owner)).toBe("thaylen-city");
  });

  it("promotes a camera-owned regional city to authored City detail", () => {
    expect(localCityRenderDetail("continent")).toBe("city");
    expect(localCityRenderDetail("region")).toBe("city");
    expect(localCityRenderDetail("city")).toBe("city");
    expect(localCityRenderDetail("street")).toBe("street");
  });

  it("drops stale list-selection force when manual focus hands off to another city", () => {
    expect(
      selectedCityShouldForceNear(
        "kharbranth",
        "kharbranth",
        "kharbranth",
      ),
    ).toBe(true);
    expect(
      selectedCityShouldForceNear(
        "kharbranth",
        "kharbranth",
        "thaylen-city",
      ),
    ).toBe(false);
    expect(
      selectedCityShouldForceNear(
        "thaylen-city",
        "kharbranth",
        "thaylen-city",
      ),
    ).toBe(false);
  });

  it("keeps an explicit close inspection attached to its authored city until inspection ends", () => {
    expect(
      resolvedCityProximityOwner("thaylen-city", "kharbranth"),
    ).toBe("kharbranth");
    expect(
      resolvedCityProximityOwner("thaylen-city", null),
    ).toBe("thaylen-city");
    expect(
      cityInspectionOwnerAtFocus(
        "kharbranth",
        [10.2, 1.2, 22.9],
        [10.3, 1.2, 23],
      ),
    ).toBe("kharbranth");
    expect(
      cityInspectionOwnerAtFocus(
        "kharbranth",
        [10.2, 1.2, 22.9],
        [11, 1.2, 22.9],
      ),
    ).toBeNull();
  });

  it("clears proximity when either the camera or its viewed point leaves the near envelope", () => {
    const candidate = cityProximityCandidate("kharbranth");
    const cameraOutside = [
      candidate.center[0] + candidate.lensDistance + 2,
      candidate.center[1],
      candidate.center[2],
    ] as const;
    const focusOutside = [
      candidate.center[0] + candidate.nearDistance + 2,
      candidate.center[1],
      candidate.center[2],
    ] as const;

    expect(
      nearestCityProximityOwner(cameraOutside, [candidate], {
        currentOwnerId: candidate.locationId,
        focusPosition: candidate.center,
        handoffHysteresis: 0,
      }),
    ).toBeNull();
    expect(
      nearestCityProximityOwner(candidate.center, [candidate], {
        currentOwnerId: candidate.locationId,
        focusPosition: focusOutside,
        handoffHysteresis: 0,
      }),
    ).toBeNull();
  });

  it("leaves a clear regional gap between neighboring city ownership lenses", () => {
    const candidates = ["kharbranth", "thaylen-city"].map(
      cityProximityCandidate,
    );
    const from = candidates[0].center;
    const to = candidates[1].center;
    const span = Math.hypot(
      to[0] - from[0],
      to[1] - from[1],
      to[2] - from[2],
    );
    const midpoint = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    ] as const;

    expect(span).toBeGreaterThan(
      candidates[0].nearDistance +
        candidates[1].nearDistance +
        CITY_PROXIMITY_HANDOFF_HYSTERESIS * 2,
    );
    expect(
      nearestCityProximityOwner(
        midpoint,
        candidates,
      ),
    ).toBeNull();
  });

  it("holds the active tier inside hysteresis bands", () => {
    const state = createCityLodState(70, testConfig);
    updateCityLodState(state, 48, 1 / 60, testConfig);
    expect(state.target).toBe("far");

    updateCityLodState(state, 46, 1 / 60, testConfig);
    expect(state.target).toBe("mid");

    updateCityLodState(state, 52, 1 / 60, testConfig);
    expect(state.target).toBe("mid");

    updateCityLodState(state, 54, 1 / 60, testConfig);
    expect(state.target).toBe("far");

    const nearState = createCityLodState(30, testConfig);
    updateCityLodState(nearState, 18, 1 / 60, testConfig);
    expect(nearState.target).toBe("mid");
    updateCityLodState(nearState, 16, 1 / 60, testConfig);
    expect(nearState.target).toBe("near");
    updateCityLodState(nearState, 22, 1 / 60, testConfig);
    expect(nearState.target).toBe("near");
    updateCityLodState(nearState, 24, 1 / 60, testConfig);
    expect(nearState.target).toBe("mid");
  });

  it("crossfades without dropping all three tiers in one frame", () => {
    const state = createCityLodState(70, testConfig);
    updateCityLodState(state, 40, 1 / 60, testConfig);

    expect(state.target).toBe("mid");
    expect(state.weights.far).toBeGreaterThan(0);
    expect(state.weights.mid).toBeGreaterThan(0);
    expect(state.weights.near).toBe(0);
    expect(
      state.weights.far + state.weights.mid + state.weights.near,
    ).toBeCloseTo(1, 8);

    for (let frame = 0; frame < 90; frame += 1) {
      updateCityLodState(state, 40, 1 / 60, testConfig);
    }
    expect(state.weights.mid).toBeGreaterThan(0.99);
    expect(state.weights.far).toBeLessThan(0.01);
  });

  it("derives useful thresholds from the existing city radius", () => {
    const far = createCitySilhouette("kharbranth", "far");
    const mid = createCitySilhouette("kharbranth", "mid");
    const config = cityLodConfig(far.profile);
    const candidate = cityProximityCandidate("kharbranth");
    expect(config.nearDistance).toBe(far.profile.radius * 5);
    expect(config.farDistance).toBe(far.profile.radius * 10);
    expect(config.hysteresis).toBeGreaterThan(0);
    expect(candidate.nearDistance).toBeCloseTo(
      citySilhouettePlanRadius(mid) + CITY_PROXIMITY_PROXY_PADDING,
    );
    expect(candidate.nearDistance).toBeLessThan(config.nearDistance / 4);
  });

  it("uses denser mid silhouettes while keeping each tier to three draw calls", () => {
    const far = createCitySilhouette("kholinar", "far");
    const mid = createCitySilhouette("kholinar", "mid");
    expect(far.seeds).toHaveLength(9);
    expect(mid.seeds).toHaveLength(24);
    expect(far.estimatedDrawCalls).toBe(3);
    expect(mid.estimatedDrawCalls).toBe(3);
  });

  it("keeps far cartographic massing compact while mid detail grows toward the authored footprint", () => {
    const far = createCitySilhouette("kharbranth", "far");
    const mid = createCitySilhouette("kharbranth", "mid");
    const farSpread = Math.max(
      ...far.seeds.map((seed) =>
        Math.hypot(seed.x - far.center[0], seed.z - far.center[2]),
      ),
    );
    const midSpread = Math.max(
      ...mid.seeds.map((seed) =>
        Math.hypot(seed.x - mid.center[0], seed.z - mid.center[2]),
      ),
    );
    expect(farSpread).toBeLessThan(1);
    expect(midSpread).toBeGreaterThan(farSpread * 2);
    expect(Math.max(...far.seeds.map((seed) => seed.height))).toBeLessThan(
      Math.max(...mid.seeds.map((seed) => seed.height)),
    );
  });

  it("builds city-specific silhouettes instead of a generic replacement", () => {
    const urithiru = createCitySilhouette("urithiru", "far");
    const purelake = createCitySilhouette("purelake", "far");
    const kharbranth = createCitySilhouette("kharbranth", "mid");
    const vedenar = createCitySilhouette("vedenar", "mid");

    expect(urithiru.style).toBe("tower");
    expect(purelake.style).toBe("lake");
    expect(kharbranth.style).toBe("terraced-port");
    expect(vedenar.style).toBe("terraced-fortress");
    expect(
      Math.max(...urithiru.seeds.map((seed) => seed.height)),
    ).toBeGreaterThan(
      Math.max(...purelake.seeds.map((seed) => seed.height)) * 4,
    );
    expect(new Set(kharbranth.seeds.map((seed) => seed.y)).size).toBeGreaterThan(
      2,
    );
    expect(new Set(vedenar.seeds.map((seed) => seed.z)).size).toBeGreaterThan(
      4,
    );
  });

  it("extends every silhouette foundation below its terrain contact", () => {
    for (const locationId of [
      "urithiru",
      "kharbranth",
      "kholinar",
      "purelake",
      "shinovar",
      "vedenar",
    ]) {
      const silhouette = createCitySilhouette(locationId, "mid");
      for (const seed of silhouette.seeds) {
        expect(seed.foundationDrop).toBeGreaterThanOrEqual(0.115);
        expect(seed.foundationWidth).toBeGreaterThan(seed.width);
        expect(seed.foundationDepth).toBeGreaterThan(seed.depth);
        const foundationTop =
          seed.y - seed.foundationDrop / 2 + 0.012 +
          seed.foundationDrop / 2;
        expect(foundationTop).toBeGreaterThanOrEqual(seed.y);
      }
    }
  });
});
