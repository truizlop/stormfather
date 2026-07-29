import { Stars } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useAtlasStore } from "../store/useAtlasStore";
import { CameraRig } from "./CameraRig";
import { CityClusters } from "./CityClusters";
import { Landmarks } from "./Landmarks";
import { SettlementLights } from "./SettlementLights";
import { SimulationClock } from "./SimulationClock";
import { WorldLabels } from "./WorldLabels";
import { WorldTraffic } from "./WorldTraffic";
import { CityActivities } from "./actors/CityActivities";
import { LivingPopulation } from "./actors/LivingPopulation";
import { ReactiveFlora } from "./actors/ReactiveFlora";
import { CountryFrontiers } from "./cartography/CountryFrontiers";
import { KharbranthVistaLOD } from "./cities/KharbranthVistaLOD";
import { RosharTerrain } from "./terrain/RosharTerrain";
import { Highstorm } from "./weather/Highstorm";

export function WorldScene() {
  const nightMode = useAtlasStore((state) => state.nightMode);
  const viewportWidth = useThree((state) => state.size.width);

  return (
    <>
      <color attach="background" args={[nightMode ? "#071218" : "#62717a"]} />
      <fog
        attach="fog"
        args={[
          nightMode ? "#071218" : "#62717a",
          viewportWidth < 720 ? 130 : 88,
          viewportWidth < 720 ? 360 : 210,
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
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-64}
        shadow-camera-right={64}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-bias={-0.00012}
      />
      <RosharTerrain />
      <CountryFrontiers />
      <CityClusters />
      <Landmarks />
      <SettlementLights />
      <WorldTraffic />
      <ReactiveFlora />
      <CityActivities />
      <LivingPopulation />
      <Highstorm />
      <KharbranthVistaLOD />
      <WorldLabels />
      <SimulationClock />
      <CameraRig />
    </>
  );
}
