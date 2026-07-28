import { MapControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { useAtlasStore } from "../store/useAtlasStore";
import { detailFromDistance } from "./coordinates";
import { locationById } from "./locations";
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
    return () => window.removeEventListener("atlas:zoom", handleZoom);
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
    if (!location) return;
    if (transition.current.progress < 1) {
      transition.current.progress = Math.min(
        1,
        transition.current.progress + delta * 0.62,
      );
      const t = transition.current.progress;
      const eased = t * t * (3 - 2 * t);
      const destination = new THREE.Vector3(...location.camera.position);
      const target = new THREE.Vector3(...location.camera.target);
      if (viewportWidth < 720 && location.id === "roshar") {
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
      minDistance={5.8}
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
