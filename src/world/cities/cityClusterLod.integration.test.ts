import { describe, expect, it } from "vitest";
import { locationById } from "../locations";
import { landmarkSurfaceY } from "../terrain/localSurface";
import {
  CITY_LOD_HIDDEN_WEIGHT,
  cityClusterLodPolicy,
  createCityLodState,
  createCitySilhouette,
  nearWorldSpaceOffset,
  updateCityNearLifecycle,
} from "./progressiveLod";

const integrationConfig = {
  nearDistance: 20,
  farDistance: 50,
  hysteresis: 3,
  fadeSeconds: 0.25,
};

describe("modeled city cluster LOD integration", () => {
  it("mounts an unselected authored city after a manual camera approach owns its proximity lens", () => {
    const state = createCityLodState(35, integrationConfig);
    const policy = cityClusterLodPolicy(
      "kharbranth",
      "kharbranth",
      undefined,
    );

    expect(policy).toEqual({
      allowNear: true,
      forceNear: false,
      retainOutgoingNear: false,
    });
    expect(
      updateCityNearLifecycle(
        state,
        35,
        1 / 60,
        integrationConfig,
        policy,
      ),
    ).toBe(true);
    expect(state.target).toBe("near");
  });

  it("keeps a non-owner mid silhouette without mounting authored detail", () => {
    const state = createCityLodState(70, integrationConfig);
    const policy = cityClusterLodPolicy(
      "kharbranth",
      null,
      undefined,
    );

    expect(
      updateCityNearLifecycle(
        state,
        30,
        1,
        integrationConfig,
        policy,
      ),
    ).toBe(false);
    expect(state.target).toBe("mid");
    expect(state.weights.mid).toBeGreaterThan(state.weights.far);
    expect(state.weights.near).toBe(0);
  });

  it("unmounts a manually outgoing near scene before mounting its successor", () => {
    const outgoingState = createCityLodState(10, integrationConfig);
    const incomingState = createCityLodState(30, integrationConfig);
    const outgoingPolicy = cityClusterLodPolicy(
      "kharbranth",
      "thaylen-city",
      "kharbranth",
    );
    const incomingPolicy = cityClusterLodPolicy(
      "thaylen-city",
      "thaylen-city",
      "kharbranth",
    );

    expect(outgoingPolicy).toEqual({
      allowNear: false,
      forceNear: false,
      retainOutgoingNear: false,
    });
    expect(incomingPolicy).toEqual({
      allowNear: true,
      forceNear: false,
      retainOutgoingNear: false,
    });

    const outgoingMounted = updateCityNearLifecycle(
      outgoingState,
      10,
      1 / 60,
      integrationConfig,
      outgoingPolicy,
    );
    const incomingMounted = updateCityNearLifecycle(
      incomingState,
      10,
      1 / 60,
      integrationConfig,
      incomingPolicy,
    );

    expect(outgoingMounted).toBe(false);
    expect(incomingMounted).toBe(true);
  });

  it("unmounts the outgoing near scene immediately once an exact destination owns the camera", () => {
    const outgoingState = createCityLodState(10, integrationConfig);
    const selectedState = createCityLodState(70, integrationConfig);
    const outgoingPolicy = cityClusterLodPolicy(
      "kharbranth",
      "thaylen-city",
      "thaylen-city",
    );
    const selectedPolicy = cityClusterLodPolicy(
      "thaylen-city",
      "thaylen-city",
      "thaylen-city",
    );

    expect(outgoingPolicy).toEqual({
      allowNear: false,
      forceNear: false,
      retainOutgoingNear: false,
    });
    expect(selectedPolicy).toEqual({
      allowNear: true,
      forceNear: true,
      retainOutgoingNear: false,
    });
    expect(
      updateCityNearLifecycle(
        outgoingState,
        10,
        1 / 60,
        integrationConfig,
        outgoingPolicy,
      ),
    ).toBe(false);
    expect(outgoingState.weights.near).toBeGreaterThan(
      CITY_LOD_HIDDEN_WEIGHT,
    );
    expect(
      updateCityNearLifecycle(
        selectedState,
        70,
        1 / 60,
        integrationConfig,
        selectedPolicy,
      ),
    ).toBe(true);
  });

  it("cancels the parent transform exactly once for the world-space loading fallback", () => {
    const location = locationById.get("kharbranth")!;
    const far = createCitySilhouette(location.id, "far");
    const nearOffset = nearWorldSpaceOffset(far.center, true)!;
    const fallbackWorldPosition = [
      location.coordinates.x,
      landmarkSurfaceY(
        location.id,
        location.coordinates.x,
        location.coordinates.z,
      ),
      location.coordinates.z,
    ] as const;
    const effectivePosition = [
      far.center[0] + nearOffset[0] + fallbackWorldPosition[0],
      far.center[1] + nearOffset[1] + fallbackWorldPosition[1],
      far.center[2] + nearOffset[2] + fallbackWorldPosition[2],
    ];

    expect(fallbackWorldPosition).toEqual(far.center);
    expect(effectivePosition).toEqual(fallbackWorldPosition);
  });
});
