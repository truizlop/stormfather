import { describe, expect, it } from "vitest";
import {
  cityLodConfig,
  createCityLodState,
  createCitySilhouette,
  effectiveCityLodDistance,
  updateCityLodState,
} from "./progressiveLod";

const testConfig = {
  nearDistance: 20,
  farDistance: 50,
  hysteresis: 3,
  fadeSeconds: 0.25,
};

describe("progressive city LOD", () => {
  it("keeps a selected semantic city in authored near detail", () => {
    expect(effectiveCityLodDistance(25.38, true)).toBe(0);
    expect(effectiveCityLodDistance(25.38, false)).toBe(25.38);
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
    const config = cityLodConfig(far.profile);
    expect(config.nearDistance).toBe(far.profile.radius * 5);
    expect(config.farDistance).toBe(far.profile.radius * 10);
    expect(config.hysteresis).toBeGreaterThan(0);
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

    expect(urithiru.style).toBe("tower");
    expect(purelake.style).toBe("lake");
    expect(kharbranth.style).toBe("terraced-port");
    expect(
      Math.max(...urithiru.seeds.map((seed) => seed.height)),
    ).toBeGreaterThan(
      Math.max(...purelake.seeds.map((seed) => seed.height)) * 4,
    );
    expect(new Set(kharbranth.seeds.map((seed) => seed.y)).size).toBeGreaterThan(
      2,
    );
  });

  it("extends every silhouette foundation below its terrain contact", () => {
    for (const locationId of [
      "urithiru",
      "kharbranth",
      "kholinar",
      "purelake",
      "shinovar",
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
