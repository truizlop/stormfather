import { Suspense } from "react";
import { CityDetail } from "./cities/CityDetail";
import { ProgressiveCityLod } from "./cities/ProgressiveCityLod";
import { useAtlasStore } from "../store/useAtlasStore";
import { Landmarks } from "./Landmarks";
import { locations } from "./locations";

const modeledLocations = locations.filter((location) => location.modelRoot);

export function CityClusters() {
  const selectedId = useAtlasStore((state) => state.selectedId);

  return (
    <group name="Progressive city representations">
      {modeledLocations.map((location) => (
        <ProgressiveCityLod
          key={location.id}
          locationId={location.id}
          nearWorldSpace
          near={
            location.id === selectedId ? (
              <Suspense fallback={null}>
                <CityDetail />
                <Landmarks />
              </Suspense>
            ) : null
          }
        />
      ))}
    </group>
  );
}
