import { MapControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { useAtlasStore } from "../store/useAtlasStore";
import { kharbranthRoadOffset } from "./cities/landmarkMetrics";
import { detailFromDistance } from "./coordinates";
import { gazetteerById, gazetteerMarkerWorld } from "./gazetteer";
import { locationById } from "./locations";
import { localSurfaceY } from "./terrain/localSurface";
import { terrainHeightAt } from "./terrain/terrainHeight";
import { stormXAtTime } from "./weather/storm";

function updatePerspectiveFov(camera: THREE.Camera, fov: number) {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  camera.fov = fov;
  camera.updateProjectionMatrix();
}

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const viewportWidth = useThree((state) => state.size.width);
  const controls = useRef<MapControlsImpl>(null);
  const transition = useRef({
    progress: 1,
    startPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
  });
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectedGazetteerId = useAtlasStore(
    (state) => state.selectedGazetteerId,
  );
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const travelEpoch = useAtlasStore((state) => state.travelEpoch);
  const stormMode = useAtlasStore((state) => state.stormMode);

  useEffect(() => {
    updatePerspectiveFov(
      camera,
      viewportWidth < 720 && selectedId === "roshar" ? 72 : 42,
    );
  }, [camera, selectedId, viewportWidth]);

  useEffect(() => {
    if (!controls.current || stormMode) return;
    transition.current.startPosition.copy(camera.position);
    transition.current.startTarget.copy(controls.current.target);
    transition.current.progress = 0;
  }, [camera, stormMode, travelEpoch]);

  useEffect(() => {
    const handleZoom = (event: Event) => {
      const control = controls.current;
      if (!control) return;
      const factor = (event as CustomEvent<{ factor: number }>).detail.factor;
      // Direct zoom input takes ownership from any still-running travel tween.
      transition.current.progress = 1;
      const selected = useAtlasStore.getState().selectedId;
      const selectedLocation = locationById.get(selected);
      if (
        selectedLocation?.id === "kharbranth" &&
        factor <= 0.5
      ) {
        control.minDistance = 0.25;
        const lowerRoadZ =
          selectedLocation.coordinates.z + kharbranthRoadOffset(0);
        const streetY = localSurfaceY(
          selectedLocation.id,
          selectedLocation.coordinates.x,
          lowerRoadZ,
        );
        camera.position.set(
          selectedLocation.coordinates.x - 0.55,
          streetY + 0.46,
          lowerRoadZ + 1.95,
        );
        control.target.set(
          selectedLocation.coordinates.x,
          streetY + 0.09,
          lowerRoadZ + 1.1,
        );
        control.update();
        return;
      }
      const offset = camera.position.clone().sub(control.target);
      const distance = THREE.MathUtils.clamp(
        offset.length() * factor,
        5.8,
        165,
      );
      offset.setLength(distance);
      camera.position.copy(control.target).add(offset);
      control.update();
    };
    window.addEventListener("atlas:zoom", handleZoom);
    return () => {
      window.removeEventListener("atlas:zoom", handleZoom);
    };
  }, [camera]);

  useFrame((_, delta) => {
    const control = controls.current;
    if (!control) return;
    const store = useAtlasStore.getState();

    if (stormMode) {
      const stormX = stormXAtTime(store.simulationTime);
      const desiredPosition = new THREE.Vector3(stormX + 7, 29, 23);
      const desiredTarget = new THREE.Vector3(stormX - 13.5, 1, 0);
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
      if (gazetteerWorld && gazetteerPlace) {
        const isStreetPlace = gazetteerPlace.minimumLod === "street";
        const isRegionalPlace = gazetteerPlace.minimumLod === "region";
        const offset = isStreetPlace
          ? viewportWidth < 720
            ? [6, 8, 7]
            : [4, 6, 5]
          : isRegionalPlace
            ? viewportWidth < 720
              ? [24, 34, 30]
              : [18, 28, 22]
            : viewportWidth < 720
              ? [9, 16, 12]
              : [7, 12, 9];
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
      if (viewportWidth < 720 && location?.id === "roshar") {
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
    }

    const distance = camera.position.distanceTo(control.target);
    const detail = detailFromDistance(distance);
    if (store.detailLevel !== detail) store.setDetailLevel(detail);
  });

  return (
    <MapControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.075}
      minDistance={
        selectedId === "kharbranth" && detailLevel === "street" ? 0.25 : 5.8
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
