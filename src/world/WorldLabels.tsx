import { Html } from "@react-three/drei";
import {
  easterEggs,
  locationDisplayName,
  locations,
} from "./locations";
import { useAtlasStore } from "../store/useAtlasStore";
import { localSurfaceY } from "./terrain/localSurface";
import { gazetteerById } from "./gazetteer";
import { localCityPresenceId } from "./cities/progressiveLod";

export function WorldLabels() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectedGazetteerId = useAtlasStore(
    (state) => state.selectedGazetteerId,
  );
  const proximityLocationId = useAtlasStore(
    (state) => state.proximityLocationId,
  );
  const showToast = useAtlasStore((state) => state.showToast);
  const selectedGazetteer = selectedGazetteerId
    ? gazetteerById.get(selectedGazetteerId)
    : undefined;
  const activeLocationId =
    localCityPresenceId(detailLevel, proximityLocationId) ??
    selectedId;

  return (
    <>
      {locations
        .filter(
          (location) =>
            location.id !== "roshar" &&
            location.kind !== "nation" &&
            (detailLevel === "continent" ||
              detailLevel === "region" ||
              (location.id === activeLocationId &&
                detailLevel !== "street")),
        )
        .map((location) => (
          <Html
            key={location.id}
            position={[
              location.coordinates.x,
              localSurfaceY(
                location.id,
                location.coordinates.x,
                location.coordinates.z,
              ) + (location.id === activeLocationId ? 2.25 : 0.9),
              location.coordinates.z,
            ]}
            center
            distanceFactor={detailLevel === "continent" ? 34 : 18}
            zIndexRange={[10, 0]}
            className="world-label-anchor"
          >
            <div
              className={`world-label ${
                location.id === activeLocationId ? "is-selected" : ""
              }`}
            >
              {locationDisplayName(
                location,
                location.id === activeLocationId
                  ? selectedGazetteer
                  : undefined,
              )}
            </div>
          </Html>
        ))}
      {(detailLevel === "city" || detailLevel === "street") &&
        easterEggs.map((egg) => (
          <Html
            key={egg.id}
            position={[
              egg.coordinates.x,
              localSurfaceY(
                activeLocationId,
                egg.coordinates.x,
                egg.coordinates.z,
              ) +
                egg.height +
                0.45,
              egg.coordinates.z,
            ]}
            center
            distanceFactor={12}
            zIndexRange={[30, 10]}
          >
            <button
              className="easter-egg"
              type="button"
              aria-label={`Inspect ${egg.title}`}
              onClick={() => showToast(egg.title, egg.message)}
            >
              <span aria-hidden="true">✦</span>
            </button>
          </Html>
        ))}
    </>
  );
}
