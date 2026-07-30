import { Stars } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Suspense } from "react";
import { useAtlasStore } from "../store/useAtlasStore";
import { CameraRig } from "./CameraRig";
import { CityClusters } from "./CityClusters";
import { isCompactViewport } from "./compactViewport";
import { SettlementLights } from "./SettlementLights";
import { SimulationClock } from "./SimulationClock";
import { WorldLabels } from "./WorldLabels";
import { WorldTraffic } from "./WorldTraffic";
import { CityActivities } from "./actors/CityActivities";
import { LivingPopulation } from "./actors/LivingPopulation";
import { ReactiveFlora } from "./actors/ReactiveFlora";
import { WindrunnerPatrols } from "./actors/WindrunnerPatrols";
import { CountryFrontiers } from "./cartography/CountryFrontiers";
import { RosharEcology } from "./ecology";
import {
  gazetteerById,
  gazetteerMarkerWorld,
  GazetteerMarkers,
} from "./gazetteer";
import { locationById } from "./locations";
import { RosharTerrain } from "./terrain/RosharTerrain";
import { Highstorm } from "./weather/Highstorm";

export function WorldScene() {
  const nightMode = useAtlasStore((state) => state.nightMode);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectedGazetteerId = useAtlasStore(
    (state) => state.selectedGazetteerId,
  );
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const compactViewport = useThree((state) =>
    isCompactViewport(state.size.width, state.size.height),
  );
  const selectedLocation = locationById.get(selectedId);
  const proximityLocation = proximityLocationId
    ? locationById.get(proximityLocationId)
    : undefined;
  const selectedGazetteer = selectedGazetteerId
    ? gazetteerById.get(selectedGazetteerId)
    : undefined;
  const selectedGazetteerWorld = selectedGazetteer
    ? gazetteerMarkerWorld(selectedGazetteer)
    : null;
  const focusWorld = proximityLocation
    ? ([
        proximityLocation.coordinates.x,
        proximityLocation.coordinates.z,
      ] as const)
    : detailLevel === "city" || detailLevel === "street"
      ? selectedGazetteerWorld ??
        (selectedLocation
          ? ([
              selectedLocation.coordinates.x,
              selectedLocation.coordinates.z,
            ] as const)
          : undefined)
      : undefined;
  const localAuthoredLocationId =
    proximityLocation?.modelRoot
      ? proximityLocation.id
      : (detailLevel === "city" || detailLevel === "street") &&
          selectedLocation?.modelRoot
        ? selectedLocation.id
        : undefined;

  return (
    <>
      <color attach="background" args={[nightMode ? "#071218" : "#62717a"]} />
      <fog
        attach="fog"
        args={[
          nightMode ? "#071218" : "#62717a",
          compactViewport ? 130 : 88,
          compactViewport ? 360 : 210,
        ]}
      />
      {nightMode && (
        <Stars
          radius={94}
          depth={42}
          count={900}
          factor={2}
          saturation={0.08}
          fade
          speed={0.12}
        />
      )}
      <ambientLight
        intensity={nightMode ? 0.48 : 0.82}
        color={nightMode ? "#7ea0b0" : "#cfe2ea"}
      />
      <hemisphereLight
        intensity={nightMode ? 0.56 : 0.92}
        color={nightMode ? "#8cb1c4" : "#cde9f2"}
        groundColor="#18221d"
      />
      <directionalLight
        position={nightMode ? [-32, 48, 36] : [-38, 52, 22]}
        intensity={nightMode ? 2.15 : 2.85}
        color={nightMode ? "#f1c581" : "#fff1ca"}
        castShadow
        shadow-mapSize={compactViewport ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-64}
        shadow-camera-right={64}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-bias={-0.00012}
      />
      <RosharTerrain />
      <CountryFrontiers />
      <GazetteerMarkers
        detailLevel={detailLevel}
        selectedId={selectedGazetteerId ?? selectedId}
        selectedGazetteerId={selectedGazetteerId}
        localAuthoredLocationId={localAuthoredLocationId}
        focusWorld={focusWorld}
      />
      <CityClusters />
      <SettlementLights />
      <WorldTraffic />
      <ReactiveFlora />
      {/* These camera-owned layers share the large authored landmark kit.
          Keep their cold-load suspension local so terrain, city proxies, and
          CityClusters' non-null fallback remain visible during an approach. */}
      <Suspense fallback={null}>
        <CityActivities />
      </Suspense>
      <Suspense fallback={null}>
        <LivingPopulation />
      </Suspense>
      <WindrunnerPatrols />
      <Suspense fallback={null}>
        <RosharEcology />
      </Suspense>
      <Highstorm />
      <WorldLabels />
      <SimulationClock />
      <CameraRig />
    </>
  );
}
