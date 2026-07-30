import { MapControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { useAtlasStore } from "../store/useAtlasStore";
import {
  atlasCameraFov,
  drainQueuedZoomRequests,
  enqueueZoomRequest,
  fittedModeledArrivalDetailOwner,
  fittedModeledArrivalPose,
  gazetteerArrivalOffset,
  isMobileWorldOverview,
  type ModeledArrivalPose,
  type QueuedZoomRequest,
} from "./cameraArrival";
import {
  collisionSafeZoomPose,
  usesKharbranthStreetInspectionPose,
} from "./cameraSafety";
import {
  cityProximityCandidate,
  nearestCityFocusOwner,
  nearestCityProximityOwner,
} from "./cities/progressiveLod";
import { detailFromDistance } from "./coordinates";
import { gazetteerById, gazetteerMarkerWorld } from "./gazetteer";
import {
  locationById,
  locations,
  modeledLocationForGazetteer,
} from "./locations";
import { terrainHeightAt } from "./terrain/terrainHeight";
import type { DetailLevel } from "./types";
import { stormXAtTime } from "./weather/storm";

const modeledCameraCandidates = locations
  .filter((location) => location.modelRoot)
  .map((location) => cityProximityCandidate(location.id));

function updatePerspectiveFov(camera: THREE.Camera, fov: number) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  camera.fov = fov;
  camera.updateProjectionMatrix();
}

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const controls = useRef<MapControlsImpl>(null);
  const transition = useRef({
    progress: 1,
    startPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
  });
  const queuedZoomRequests = useRef<QueuedZoomRequest[]>([]);
  const fittedMobileArrival = useRef(false);
  const fittedArrivalPoseCache = useRef<{
    key: string;
    pose: ModeledArrivalPose | null;
  } | null>(null);
  const nativeGestureStartDistance = useRef<number | null>(null);
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectedGazetteerId = useAtlasStore(
    (state) => state.selectedGazetteerId,
  );
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const travelEpoch = useAtlasStore((state) => state.travelEpoch);
  const stormMode = useAtlasStore((state) => state.stormMode);
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const mobileWorldOverview = isMobileWorldOverview(
    viewportWidth,
    selectedId,
    selectedGazetteerId,
    detailLevel,
    proximityLocationId,
  );
  const cameraFov = atlasCameraFov(
    viewportWidth,
    mobileWorldOverview,
  );

  useEffect(() => {
    updatePerspectiveFov(camera, cameraFov);
  }, [camera, cameraFov]);

  useEffect(() => {
    // A later destination supersedes every zoom request made during the
    // previous trip. In particular, a queued Street click must never apply
    // after the user immediately chooses Urithiru, Home, or Highstorm.
    queuedZoomRequests.current = [];
    if (!controls.current || stormMode) return;
    window.dispatchEvent(new Event("atlas:end-inspection"));
    fittedMobileArrival.current = false;
    transition.current.startPosition.copy(camera.position);
    transition.current.startTarget.copy(controls.current.target);
    transition.current.progress = 0;
  }, [camera, stormMode, travelEpoch]);

  const applyZoomRequest = useCallback(
    ({ factor, level }: QueuedZoomRequest) => {
      const control = controls.current;
      if (!control) return;
      fittedMobileArrival.current = false;
      const store = useAtlasStore.getState();
      const cameraPoint = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ] as const;
      const focusPoint = [
        control.target.x,
        control.target.y,
        control.target.z,
      ] as const;
      // The viewed scene owns zoom. An exact search remains inspector state,
      // but once the user pans elsewhere it must not pull the camera back to
      // the stale place or apply that city's collision envelope.
      const viewedLocationId =
        nearestCityProximityOwner(
          cameraPoint,
          modeledCameraCandidates,
          {
            currentOwnerId: store.proximityLocationId,
            focusPosition: focusPoint,
          },
        ) ??
        nearestCityFocusOwner(focusPoint, modeledCameraCandidates);
      const localLocation = locationById.get(
        viewedLocationId ??
          store.proximityLocationId ??
          store.selectedId,
      );
      if (localLocation?.modelRoot) {
        const safeRequest = {
          location: localLocation,
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [control.target.x, control.target.y, control.target.z],
          factor,
          requestedLevel: level,
        } as const;
        const streetInspection =
          usesKharbranthStreetInspectionPose(safeRequest);
        const pose = collisionSafeZoomPose(safeRequest);
        const poseDistance = Math.hypot(
          pose.position[0] - pose.target[0],
          pose.position[1] - pose.target[1],
          pose.position[2] - pose.target[2],
        );
        control.minDistance =
          localLocation.id === "kharbranth" && poseDistance < 5.8
            ? 0.25
            : 5.8;
        camera.position.set(...pose.position);
        control.target.set(...pose.target);
        control.update();
        window.dispatchEvent(
          streetInspection
            ? new CustomEvent("atlas:inspect-residents", {
                detail: {
                  locationId: localLocation.id,
                  focus: pose.target,
                },
              })
            : new Event(
                level === "city"
                  ? "atlas:inspect-city"
                  : "atlas:end-inspection",
              ),
        );
        return;
      }
      window.dispatchEvent(new Event("atlas:end-inspection"));
      const offset = camera.position.clone().sub(control.target);
      const distance = THREE.MathUtils.clamp(
        offset.length() * factor,
        5.8,
        165,
      );
      offset.setLength(distance);
      camera.position.copy(control.target).add(offset);
      control.update();
    },
    [camera],
  );

  useEffect(() => {
    const handleZoom = (event: Event) => {
      const request = (
        event as CustomEvent<{
          factor: number;
          level?: DetailLevel;
        }>
      ).detail;
      if (transition.current.progress < 1) {
        queuedZoomRequests.current = enqueueZoomRequest(
          queuedZoomRequests.current,
          request,
        );
        return;
      }
      applyZoomRequest(request);
    };
    window.addEventListener("atlas:zoom", handleZoom);
    return () => {
      window.removeEventListener("atlas:zoom", handleZoom);
    };
  }, [applyZoomRequest]);

  useFrame((_, delta) => {
    const control = controls.current;
    if (!control) return;
    const store = useAtlasStore.getState();

    if (stormMode) {
      const stormX = stormXAtTime(store.simulationTime);
      // Ride the sunward leading edge instead of looking through the opaque
      // core. The oblique sightline keeps the stormwall in frame while still
      // revealing the land it is about to strike below.
      const desiredPosition = new THREE.Vector3(stormX + 25, 26, 34);
      const desiredTarget = new THREE.Vector3(stormX + 8.5, 1.8, -4);
      camera.position.lerp(desiredPosition, 1 - Math.exp(-delta * 1.4));
      control.target.lerp(desiredTarget, 1 - Math.exp(-delta * 1.6));
      control.update();
      if (store.detailLevel !== "region") store.setDetailLevel("region");
      return;
    }

    const location = locationById.get(selectedId);
    const gazetteerPlace = selectedGazetteerId
      ? gazetteerById.get(selectedGazetteerId)
      : undefined;
    const modeledGazetteerLocation = gazetteerPlace
      ? modeledLocationForGazetteer(gazetteerPlace)
      : undefined;
    const modeledArrivalLocation =
      modeledGazetteerLocation ?? (location?.modelRoot ? location : undefined);
    const gazetteerWorld = gazetteerPlace
      ? gazetteerMarkerWorld(gazetteerPlace)
      : null;
    if (!location && !gazetteerWorld) return;
    if (transition.current.progress < 1) {
      transition.current.progress = Math.min(
        1,
        transition.current.progress + delta * 0.62,
      );
      const t = transition.current.progress;
      const eased = t * t * (3 - 2 * t);
      const targetY = gazetteerWorld
        ? terrainHeightAt(gazetteerWorld[0], gazetteerWorld[1])
        : 0;
      let destination = new THREE.Vector3(...location!.camera.position);
      let target = new THREE.Vector3(...location!.camera.target);
      let usesFittedMobileArrival = false;
      if (gazetteerWorld && gazetteerPlace) {
        if (modeledGazetteerLocation) {
          destination = new THREE.Vector3(
            ...modeledGazetteerLocation.camera.position,
          );
          target = new THREE.Vector3(
            ...modeledGazetteerLocation.camera.target,
          );
        } else {
          const isStreetPlace = gazetteerPlace.minimumLod === "street";
          const offset = gazetteerArrivalOffset(
            gazetteerPlace,
            viewportWidth < 720,
          );
          destination = new THREE.Vector3(
            gazetteerWorld[0] + offset[0],
            targetY + offset[1],
            gazetteerWorld[1] + offset[2],
          );
          target = new THREE.Vector3(
            gazetteerWorld[0],
            targetY + (isStreetPlace ? 1.1 : 0.3),
            gazetteerWorld[1],
          );
        }
      }
      if (viewportWidth < 720 && modeledArrivalLocation) {
        const cacheKey = [
          modeledArrivalLocation.id,
          viewportWidth,
          viewportHeight,
          cameraFov,
        ].join(":");
        if (fittedArrivalPoseCache.current?.key !== cacheKey) {
          fittedArrivalPoseCache.current = {
            key: cacheKey,
            pose: fittedModeledArrivalPose(
              modeledArrivalLocation,
              viewportWidth,
              viewportHeight,
              cameraFov,
            ),
          };
        }
        const fittedPose = fittedArrivalPoseCache.current.pose;
        if (fittedPose) {
          destination.set(...fittedPose.position);
          target.set(...fittedPose.target);
          usesFittedMobileArrival = true;
        }
      }
      if (mobileWorldOverview) {
        destination.set(target.x, target.y + 174, target.z + 48);
      }
      camera.position.lerpVectors(
        transition.current.startPosition,
        destination,
        eased,
      );
      control.target.lerpVectors(
        transition.current.startTarget,
        target,
        eased,
      );
      control.update();
      if (transition.current.progress === 1) {
        fittedMobileArrival.current = usesFittedMobileArrival;
      }
      const queued = drainQueuedZoomRequests(
        transition.current.progress,
        queuedZoomRequests.current,
      );
      queuedZoomRequests.current = queued.pending;
      for (const request of queued.ready) applyZoomRequest(request);
    }

    const distance = camera.position.distanceTo(control.target);
    const distanceDetail = detailFromDistance(distance);
    const fittedDetailOwner =
      viewportWidth < 720 &&
      fittedMobileArrival.current &&
      modeledArrivalLocation &&
      distanceDetail !== "city" &&
      distanceDetail !== "street"
        ? fittedModeledArrivalDetailOwner(
            modeledArrivalLocation,
            {
              position: [camera.position.x, camera.position.y, camera.position.z],
              target: [control.target.x, control.target.y, control.target.z],
            },
            modeledCameraCandidates,
          )
        : null;
    const detail = fittedDetailOwner ? "city" : distanceDetail;
    if (store.detailLevel !== detail) store.setDetailLevel(detail);
  });

  return (
    <MapControls
      ref={controls}
      makeDefault
      onStart={() => {
        const control = controls.current;
        nativeGestureStartDistance.current = control
          ? camera.position.distanceTo(control.target)
          : null;
      }}
      onEnd={() => {
        const control = controls.current;
        const startDistance = nativeGestureStartDistance.current;
        nativeGestureStartDistance.current = null;
        if (
          !control ||
          !fittedMobileArrival.current ||
          startDistance === null
        ) {
          return;
        }
        const endDistance = camera.position.distanceTo(control.target);
        // Rotating and panning a portrait arrival must keep its authored city
        // alive. Only a real dolly/pinch releases the fitted semantic tier so
        // an intentional zoom-out can return naturally to region/continent.
        const dollyDelta = Math.abs(endDistance - startDistance);
        if (dollyDelta > Math.max(0.02, startDistance * 0.005)) {
          fittedMobileArrival.current = false;
        }
      }}
      enableDamping
      dampingFactor={0.075}
      minDistance={
        (proximityLocationId ?? selectedId) === "kharbranth" &&
        detailLevel === "street"
          ? 0.25
          : 5.8
      }
      maxDistance={viewportWidth < 720 ? 230 : 165}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI * 0.47}
      screenSpacePanning={false}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}
