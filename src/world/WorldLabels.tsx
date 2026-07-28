import { Html } from "@react-three/drei";
import { easterEggs, locations } from "./locations";
import { useAtlasStore } from "../store/useAtlasStore";
import { localSurfaceY } from "./terrain/localSurface";

export function WorldLabels() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const selectedId = useAtlasStore((state) => state.selectedId);
  const showToast = useAtlasStore((state) => state.showToast);

  return (
    <>
      {locations
        .filter(
          (location) =>
            location.id !== "roshar" &&
            location.kind !== "nation" &&
            (detailLevel === "continent" ||
              detailLevel === "region" ||
              (location.id === selectedId && detailLevel !== "street")),
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
              ) + (location.id === selectedId ? 2.25 : 0.9),
              location.coordinates.z,
            ]}
            center
            distanceFactor={detailLevel === "continent" ? 34 : 18}
            zIndexRange={[10, 0]}
            className="world-label-anchor"
          >
            <div
              className={`world-label ${
                location.id === selectedId ? "is-selected" : ""
              }`}
            >
              {location.name}
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
                selectedId,
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
