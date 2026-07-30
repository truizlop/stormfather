import { useFrame } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { CityDetail } from "./cities/CityDetail";
import {
  NearContentReadySignal,
  ProgressiveCityLod,
} from "./cities/ProgressiveCityLod";
import {
  cityProximityCandidate,
  cityInspectionOwnerAtFocus,
  cityClusterLodPolicy,
  localCityPresenceId,
  nearestCityProximityOwner,
  resolvedCityProximityOwner,
} from "./cities/progressiveLod";
import { cityProfile } from "./cities/profiles";
import { useAtlasStore } from "../store/useAtlasStore";
import { Landmarks } from "./Landmarks";
import { gazetteerById } from "./gazetteer";
import {
  locations,
  modeledLocationForGazetteer,
} from "./locations";
import { landmarkSurfaceY } from "./terrain/localSurface";
import type { WorldLocation } from "./types";

const modeledLocations = locations.filter((location) => location.modelRoot);
const proximityCandidates = modeledLocations.map((location) =>
  cityProximityCandidate(location.id),
);

function NearCityLoadingFallback({
  location,
}: {
  location: WorldLocation;
}) {
  const profile = cityProfile(location.id, location.culture);
  const y = landmarkSurfaceY(
    location.id,
    location.coordinates.x,
    location.coordinates.z,
  );
  const towers = [
    [-0.8, -0.42, 0.58],
    [0, 0, 0.92],
    [0.82, 0.38, 0.66],
    [-0.34, 0.72, 0.48],
    [0.48, -0.72, 0.52],
  ] as const;

  return (
    <group
      name={`${location.id}-near-loading-city-proxy`}
      position={[location.coordinates.x, y, location.coordinates.z]}
    >
      <mesh
        position={[0, 0.08, 0]}
        scale={[2.55, 0.16, 2.12]}
        receiveShadow
      >
        <cylinderGeometry args={[1, 1.12, 1, 16]} />
        <meshStandardMaterial
          color={profile.palette[1] ?? profile.palette[0]}
          roughness={0.94}
        />
      </mesh>
      {towers.map(([x, z, height], index) => (
        <group
          key={`${x}-${z}`}
          position={[x, 0.16, z]}
          rotation={[0, index * 0.47, 0]}
        >
          <mesh
            position={[0, height / 2, 0]}
            scale={[0.48, height, 0.42]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={profile.palette[index % profile.palette.length]}
              roughness={0.9}
            />
          </mesh>
          <mesh
            position={[0, height + 0.12, 0]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[0.39, 0.24, 0.39]}
            castShadow
          >
            <coneGeometry args={[1, 1, 4]} />
            <meshStandardMaterial
              color={
                profile.roofPalette[index % profile.roofPalette.length]
              }
              roughness={0.86}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function NearCityContent({
  location,
}: {
  location: WorldLocation;
}) {
  return (
    <Suspense
      fallback={<NearCityLoadingFallback location={location} />}
    >
      <CityDetail locationId={location.id} />
      <Landmarks locationId={location.id} />
      <NearContentReadySignal />
    </Suspense>
  );
}

function ModeledCityCluster({
  location,
  activeOwnerId,
  selectedLocalLocationId,
}: {
  location: WorldLocation;
  activeOwnerId: string | null;
  selectedLocalLocationId?: string;
}) {
  const lodPolicy = cityClusterLodPolicy(
    location.id,
    activeOwnerId,
    selectedLocalLocationId,
  );
  const near = useMemo(
    () => <NearCityContent location={location} />,
    [location],
  );

  return (
    <ProgressiveCityLod
      locationId={location.id}
      nearWorldSpace
      {...lodPolicy}
      near={near}
    />
  );
}

export function CityClusters() {
  const cameraPosition = useRef(new THREE.Vector3());
  const cameraPositionTuple = useRef<[number, number, number]>([0, 0, 0]);
  const focusPositionTuple = useRef<[number, number, number]>([0, 0, 0]);
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectedGazetteerId = useAtlasStore(
    (state) => state.selectedGazetteerId,
  );
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const selectedGazetteer = selectedGazetteerId
    ? gazetteerById.get(selectedGazetteerId)
    : undefined;
  const selectedModeledLocation = selectedGazetteer
    ? modeledLocationForGazetteer(selectedGazetteer)
    : undefined;
  const selectedLocalLocationId =
    detailLevel === "city" || detailLevel === "street"
      ? (selectedModeledLocation?.id ??
        modeledLocations.find((location) => location.id === selectedId)
          ?.id)
      : undefined;
  const [proximityOwnerId, setProximityOwnerId] = useState<string | null>(
    null,
  );
  const proximityOwnerRef = useRef(proximityOwnerId);
  const [inspectionOwnerId, setInspectionOwnerId] = useState<string | null>(
    null,
  );
  const inspectionIntentRef = useRef<{
    locationId: string;
    focus: readonly [number, number, number] | null;
  } | null>(null);
  const activeOwnerId = localCityPresenceId(
    detailLevel,
    resolvedCityProximityOwner(proximityOwnerId, inspectionOwnerId),
  );

  useEffect(() => {
    const beginInspection = (event: Event) => {
      const requestedId = (
        event as CustomEvent<{
          locationId?: string;
          focus?: readonly [number, number, number];
        }>
      ).detail?.locationId;
      const requestedFocus = (
        event as CustomEvent<{
          focus?: readonly [number, number, number];
        }>
      ).detail?.focus;
      const fallbackId = useAtlasStore.getState().selectedId;
      const nextOwner = requestedId ?? fallbackId;
      if (!modeledLocations.some((location) => location.id === nextOwner)) {
        return;
      }
      inspectionIntentRef.current = {
        locationId: nextOwner,
        focus: requestedFocus ?? null,
      };
      setInspectionOwnerId(nextOwner);
    };
    const endInspection = () => {
      inspectionIntentRef.current = null;
      setInspectionOwnerId(null);
    };
    window.addEventListener("atlas:inspect-residents", beginInspection);
    window.addEventListener("atlas:inspect-city", endInspection);
    window.addEventListener("atlas:end-inspection", endInspection);
    return () => {
      window.removeEventListener("atlas:inspect-residents", beginInspection);
      window.removeEventListener("atlas:inspect-city", endInspection);
      window.removeEventListener("atlas:end-inspection", endInspection);
    };
  }, []);

  useEffect(() => {
    if (detailLevel !== "street" && inspectionIntentRef.current !== null) {
      inspectionIntentRef.current = null;
      setInspectionOwnerId(null);
    }
  }, [detailLevel]);

  useEffect(
    () => () => {
      const store = useAtlasStore.getState();
      if (store.proximityLocationId !== null) {
        store.setProximityLocation(null);
      }
    },
    [],
  );

  useFrame(({ camera: activeCamera, controls }) => {
    activeCamera.getWorldPosition(cameraPosition.current);
    cameraPositionTuple.current[0] = cameraPosition.current.x;
    cameraPositionTuple.current[1] = cameraPosition.current.y;
    cameraPositionTuple.current[2] = cameraPosition.current.z;
    const target = (
      controls as { target?: THREE.Vector3 } | null
    )?.target;
    const inspectionIntent = inspectionIntentRef.current;
    const retainedInspectionOwner = target
      ? cityInspectionOwnerAtFocus(
          inspectionIntent?.locationId ?? null,
          inspectionIntent?.focus ?? null,
          [target.x, target.y, target.z],
        )
      : null;
    if (
      inspectionIntent &&
      retainedInspectionOwner !== inspectionIntent.locationId
    ) {
      inspectionIntentRef.current = null;
      setInspectionOwnerId(null);
    }
    const nextOwner = target
      ? (() => {
          focusPositionTuple.current[0] = target.x;
          focusPositionTuple.current[1] = target.y;
          focusPositionTuple.current[2] = target.z;
          return nearestCityProximityOwner(
            cameraPositionTuple.current,
            proximityCandidates,
            {
              currentOwnerId: proximityOwnerRef.current,
              focusPosition: focusPositionTuple.current,
            },
          );
        })()
      : null;
    if (nextOwner !== proximityOwnerRef.current) {
      proximityOwnerRef.current = nextOwner;
      setProximityOwnerId(nextOwner);
    }
    const store = useAtlasStore.getState();
    const publishedOwner = localCityPresenceId(
      store.detailLevel,
      resolvedCityProximityOwner(
        nextOwner,
        retainedInspectionOwner,
      ),
    );
    if (store.proximityLocationId !== publishedOwner) {
      store.setProximityLocation(publishedOwner);
    }
  });

  return (
    <group name="Progressive city representations">
      {modeledLocations.map((location) => (
        <ModeledCityCluster
          key={location.id}
          location={location}
          activeOwnerId={activeOwnerId}
          selectedLocalLocationId={selectedLocalLocationId}
        />
      ))}
    </group>
  );
}
