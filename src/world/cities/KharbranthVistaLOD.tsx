import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAtlasStore } from "../../store/useAtlasStore";

const KHARBRANTH_REFERENCE = `${import.meta.env.BASE_URL}reference/kharbranth-concept.jpg`;
const KHARBRANTH_DEPTH = `${import.meta.env.BASE_URL}textures/kharbranth-vista-depth.png`;
const KHARBRANTH_RESIDENTS = `${import.meta.env.BASE_URL}reference/kharbranth-residents.jpg`;
const KHARBRANTH_RESIDENTS_DEPTH = `${import.meta.env.BASE_URL}textures/kharbranth-residents-depth.png`;
const REFERENCE_ASPECT = 16 / 9;

/**
 * A camera-facing relief is the far-city LOD for Kharbranth. It preserves the
 * dense generated façade information at the scale where individual geometry
 * would alias into blocks, then yields to the authored GLB when street LOD
 * takes over. The depth texture gives the image real relief and parallax.
 */
export function KharbranthVistaLOD() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const group = useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera);
  const [cityColorSource, cityDepthSource, peopleColorSource, peopleDepthSource] =
    useTexture([
      KHARBRANTH_REFERENCE,
      KHARBRANTH_DEPTH,
      KHARBRANTH_RESIDENTS,
      KHARBRANTH_RESIDENTS_DEPTH,
    ]);
  const textures = useMemo(() => {
    const configure = (source: THREE.Texture, colorSpace: THREE.ColorSpace) => {
      const texture = source.clone();
      texture.colorSpace = colorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      return texture;
    };
    return {
      cityColor: configure(cityColorSource, THREE.SRGBColorSpace),
      cityDepth: configure(cityDepthSource, THREE.NoColorSpace),
      peopleColor: configure(peopleColorSource, THREE.SRGBColorSpace),
      peopleDepth: configure(peopleDepthSource, THREE.NoColorSpace),
    };
  }, [
    cityColorSource,
    cityDepthSource,
    peopleColorSource,
    peopleDepthSource,
  ]);
  const [portraitInspection, setPortraitInspection] = useState(false);
  useEffect(() => {
    const showPortrait = () => setPortraitInspection(true);
    const hidePortrait = () => setPortraitInspection(false);
    window.addEventListener("atlas:inspect-residents", showPortrait);
    window.addEventListener("atlas:inspect-city", hidePortrait);
    window.addEventListener("atlas:end-inspection", hidePortrait);
    return () => {
      window.removeEventListener("atlas:inspect-residents", showPortrait);
      window.removeEventListener("atlas:inspect-city", hidePortrait);
      window.removeEventListener("atlas:end-inspection", hidePortrait);
    };
  }, []);
  const cameraDirection = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (!group.current) return;
    const reliefDistance = 2;
    camera.getWorldDirection(cameraDirection);
    group.current.position
      .copy(camera.position)
      .addScaledVector(cameraDirection, reliefDistance);
    group.current.quaternion.copy(camera.quaternion);
    if (camera instanceof THREE.PerspectiveCamera) {
      const visibleHeight =
        2 *
        Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) *
        reliefDistance;
      // A little overscan prevents a seam at the viewport corners while the
      // camera damping settles onto the matched hero pose.
      group.current.scale.setScalar(visibleHeight * 1.025);
    }
  });

  const cityMode =
    selectedId === "kharbranth" &&
    detailLevel === "city" &&
    !portraitInspection;
  const portraitMode =
    selectedId === "kharbranth" &&
    detailLevel === "street" &&
    portraitInspection;
  if (!cityMode && !portraitMode) return null;
  const color = portraitMode ? textures.peopleColor : textures.cityColor;
  const depth = portraitMode ? textures.peopleDepth : textures.cityDepth;

  return (
    <group
      ref={group}
      name={
        portraitMode
          ? "Kharbranth generated relief resident LOD"
          : "Kharbranth generated relief city LOD"
      }
    >
      <mesh renderOrder={100}>
        <planeGeometry args={[REFERENCE_ASPECT, 1, 128, 72]} />
        <meshStandardMaterial
          map={color}
          color="#000000"
          emissive="#ffffff"
          emissiveMap={color}
          emissiveIntensity={1.82}
          displacementMap={depth}
          displacementScale={0.022}
          displacementBias={-0.011}
          roughness={1}
          metalness={0}
          side={THREE.DoubleSide}
          transparent
          opacity={0.999}
          depthTest={false}
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

useTexture.preload(KHARBRANTH_REFERENCE);
useTexture.preload(KHARBRANTH_DEPTH);
useTexture.preload(KHARBRANTH_RESIDENTS);
useTexture.preload(KHARBRANTH_RESIDENTS_DEPTH);
