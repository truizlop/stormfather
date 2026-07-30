import { act, cleanup, render } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as THREE from "three";
import { useAtlasStore } from "../store/useAtlasStore";
import { CameraRig } from "./CameraRig";
import {
  modeledArrivalBounds,
} from "./cameraArrival";
import {
  cityClusterLodPolicy,
  cityLodConfig,
  cityProximityCandidate,
  createCityLodState,
  createCitySilhouette,
  nearestCityProximityOwner,
  updateCityNearLifecycle,
} from "./cities/progressiveLod";
import { detailFromDistance } from "./coordinates";
import { locationById, locations } from "./locations";

type FrameCallback = (state: unknown, delta: number) => void;
type MockControls = {
  target: THREE.Vector3;
  minDistance: number;
  update: ReturnType<typeof vi.fn>;
};

const fiberHarness = vi.hoisted(() => ({
  camera: null as THREE.PerspectiveCamera | null,
  frame: null as FrameCallback | null,
  size: { width: 1440, height: 1000 },
}));

const controlsHarness = vi.hoisted(() => ({
  instance: null as MockControls | null,
  onStart: null as (() => void) | null,
  onEnd: null as (() => void) | null,
  zoomToCursor: false,
}));

vi.mock("@react-three/fiber", () => ({
  useFrame: (callback: FrameCallback) => {
    fiberHarness.frame = callback;
  },
  useThree: (
    selector: (state: {
      camera: THREE.PerspectiveCamera;
      size: { width: number; height: number };
    }) => unknown,
  ) =>
    selector({
      camera: fiberHarness.camera!,
      size: fiberHarness.size,
    }),
}));

vi.mock("@react-three/drei", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const Three = await vi.importActual<typeof import("three")>("three");

  return {
    MapControls: React.forwardRef<
      MockControls,
      {
        onStart?: () => void;
        onEnd?: () => void;
        zoomToCursor?: boolean;
      }
    >(function MockMapControls(
      { onEnd, onStart, zoomToCursor },
      ref,
    ) {
      const controls = React.useMemo<MockControls>(
        () => ({
          target: new Three.Vector3(),
          minDistance: 5.8,
          update: vi.fn(),
        }),
        [],
      );
      React.useImperativeHandle(ref, () => controls, [controls]);
      controlsHarness.instance = controls;
      controlsHarness.onStart = onStart ?? null;
      controlsHarness.onEnd = onEnd ?? null;
      controlsHarness.zoomToCursor = zoomToCursor ?? false;
      return null;
    }),
  };
});

const modeledLocations = locations.filter((location) => location.modelRoot);

function runFrame(delta = 2) {
  act(() => {
    fiberHarness.frame?.({}, delta);
  });
}

function expectVectorCloseTo(
  actual: THREE.Vector3,
  expected: readonly [number, number, number],
) {
  expect(actual.x).toBeCloseTo(expected[0], 5);
  expect(actual.y).toBeCloseTo(expected[1], 5);
  expect(actual.z).toBeCloseTo(expected[2], 5);
}

describe("CameraRig navigation regressions", () => {
  beforeEach(() => {
    fiberHarness.camera = new THREE.PerspectiveCamera(
      42,
      fiberHarness.size.width / fiberHarness.size.height,
      0.1,
      500,
    );
    fiberHarness.camera.position.set(-2, 100, 78);
    fiberHarness.frame = null;
    fiberHarness.size = { width: 1440, height: 1000 };
    controlsHarness.instance = null;
    controlsHarness.onStart = null;
    controlsHarness.onEnd = null;
    controlsHarness.zoomToCursor = false;
    useAtlasStore.setState({
      selectedId: "roshar",
      selectedGazetteerId: null,
      proximityLocationId: null,
      travelEpoch: 0,
      simulationTime: 12,
      isPlaying: false,
      detailLevel: "continent",
      stormMode: false,
      menuOpen: false,
      searchOpen: false,
      locationPanelOpen: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("mounts every authored city from camera proximity without list selection", () => {
    const candidates = modeledLocations.map((location) =>
      cityProximityCandidate(location.id),
    );

    for (const location of modeledLocations) {
      const owner = nearestCityProximityOwner(
        location.camera.position,
        candidates,
        { focusPosition: location.camera.target },
      );
      const candidate = candidates.find(
        (entry) => entry.locationId === location.id,
      )!;
      const config = cityLodConfig(
        createCitySilhouette(location.id, "far").profile,
      );
      const state = createCityLodState(
        candidate.lensDistance + 1,
        config,
      );
      const policy = cityClusterLodPolicy(
        location.id,
        owner,
        undefined,
      );

      expect(owner, location.id).toBe(location.id);
      expect(policy.forceNear, location.id).toBe(false);
      expect(policy.allowNear, location.id).toBe(true);
      let mounted = false;
      for (let frame = 0; frame < 3; frame += 1) {
        mounted = updateCityNearLifecycle(
          state,
          candidate.lensDistance,
          1 / 60,
          config,
          policy,
        );
      }
      expect(mounted, location.id).toBe(true);
    }
  });

  it("anchors native wheel and pinch dolly to the pointed terrain", () => {
    render(<CameraRig />);

    expect(controlsHarness.zoomToCursor).toBe(true);
  });

  it("keeps every list/search arrival camera outside its authored bounds", () => {
    for (const location of modeledLocations) {
      const bounds = modeledArrivalBounds(location)!;
      const position = location.camera.position;
      const outsideBounds =
        Math.abs(position[0] - bounds.center[0]) > bounds.halfSize[0] ||
        Math.abs(position[1] - bounds.center[1]) > bounds.halfSize[1] ||
        Math.abs(position[2] - bounds.center[2]) > bounds.halfSize[2];
      const lookTowardCenter =
        (bounds.center[0] - position[0]) *
          (location.camera.target[0] - position[0]) +
        (bounds.center[1] - position[1]) *
          (location.camera.target[1] - position[1]) +
        (bounds.center[2] - position[2]) *
          (location.camera.target[2] - position[2]);

      expect(outsideBounds, location.id).toBe(true);
      expect(lookTowardCenter, location.id).toBeGreaterThan(0);
    }
  });

  it("clears a queued street zoom when a later travel epoch supersedes the trip", () => {
    useAtlasStore.setState({
      selectedId: "kharbranth",
      travelEpoch: 1,
    });
    render(<CameraRig />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent("atlas:zoom", {
          detail: { factor: 0.38, level: "street" },
        }),
      );
      useAtlasStore.getState().selectLocation("urithiru");
    });
    runFrame();

    const urithiru = locationById.get("urithiru")!;
    expectVectorCloseTo(
      fiberHarness.camera!.position,
      urithiru.camera.position,
    );
    expectVectorCloseTo(
      controlsHarness.instance!.target,
      urithiru.camera.target,
    );
  });

  it("uses the viewed city for zoom after panning away from a stale exact search", () => {
    useAtlasStore.getState().focusGazetteerPlace("kharbranth");
    render(<CameraRig />);
    runFrame();
    act(() => {
      useAtlasStore.getState().setProximityLocation("kharbranth");
    });

    const kharbranth = locationById.get("kharbranth")!;
    const thaylen = locationById.get("thaylen-city")!;
    fiberHarness.camera!.position.set(...thaylen.camera.position);
    controlsHarness.instance!.target.set(...thaylen.camera.target);
    const residentInspection = vi.fn();
    window.addEventListener(
      "atlas:inspect-residents",
      residentInspection,
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent("atlas:zoom", {
          detail: { factor: 0.38, level: "street" },
        }),
      );
    });

    const target = controlsHarness.instance!.target;
    const distanceToThaylen = Math.hypot(
      target.x - thaylen.coordinates.x,
      target.z - thaylen.coordinates.z,
    );
    const distanceToKharbranth = Math.hypot(
      target.x - kharbranth.coordinates.x,
      target.z - kharbranth.coordinates.z,
    );
    expect(distanceToThaylen).toBeLessThan(distanceToKharbranth);
    expect(residentInspection).not.toHaveBeenCalled();
    expect(useAtlasStore.getState().selectedGazetteerId).toBe(
      "kharbranth",
    );

    window.removeEventListener(
      "atlas:inspect-residents",
      residentInspection,
    );
  });

  it("keeps fitted mobile city semantics while rotating or panning", () => {
    fiberHarness.size = { width: 390, height: 844 };
    fiberHarness.camera = new THREE.PerspectiveCamera(
      54,
      fiberHarness.size.width / fiberHarness.size.height,
      0.1,
      500,
    );
    fiberHarness.camera.position.set(-2, 100, 78);
    useAtlasStore.setState({
      selectedId: "kharbranth",
      travelEpoch: 1,
    });
    render(<CameraRig />);
    runFrame();

    const naturalDetail = detailFromDistance(
      fiberHarness.camera!.position.distanceTo(
        controlsHarness.instance!.target,
      ),
    );
    expect(naturalDetail).toBe("region");
    expect(useAtlasStore.getState().detailLevel).toBe("city");

    act(() => {
      controlsHarness.onStart?.();
      controlsHarness.onEnd?.();
    });
    runFrame(0);

    expect(useAtlasStore.getState().detailLevel).toBe("city");
  });

  it("releases fitted mobile city semantics after a native dolly", () => {
    fiberHarness.size = { width: 390, height: 844 };
    fiberHarness.camera = new THREE.PerspectiveCamera(
      54,
      fiberHarness.size.width / fiberHarness.size.height,
      0.1,
      500,
    );
    fiberHarness.camera.position.set(-2, 100, 78);
    useAtlasStore.setState({
      selectedId: "kharbranth",
      travelEpoch: 1,
    });
    render(<CameraRig />);
    runFrame();

    const naturalDetail = detailFromDistance(
      fiberHarness.camera!.position.distanceTo(
        controlsHarness.instance!.target,
      ),
    );
    expect(naturalDetail).toBe("region");
    expect(useAtlasStore.getState().detailLevel).toBe("city");

    act(() => {
      controlsHarness.onStart?.();
      const target = controlsHarness.instance!.target;
      const offset = fiberHarness.camera!.position.clone().sub(target);
      fiberHarness.camera!.position
        .copy(target)
        .add(offset.multiplyScalar(1.02));
      controlsHarness.onEnd?.();
    });
    runFrame(0);

    expect(useAtlasStore.getState().detailLevel).toBe(naturalDetail);
  });
});
