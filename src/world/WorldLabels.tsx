import { Html } from "@react-three/drei";
import { easterEggs, locations } from "./locations";
import { useAtlasStore } from "../store/useAtlasStore";

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
            (detailLevel === "continent" ||
              detailLevel === "region" ||
              location.id === selectedId),
        )
        .map((location) => (
          <Html
            key={location.id}
            position={[
              location.coordinates.x,
              location.id === selectedId ? 3.5 : 2.1,
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
            position={[egg.coordinates.x, egg.height + 1.15, egg.coordinates.z]}
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
