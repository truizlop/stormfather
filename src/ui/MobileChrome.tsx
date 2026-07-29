import { ChevronRight, CloudLightning, Layers3, Pause, Play } from "lucide-react";
import { useAtlasStore } from "../store/useAtlasStore";
import { gazetteerById } from "../world/gazetteer";
import { locationById, travelLocations } from "../world/locations";
import { stormPhase, stormXAtTime } from "../world/weather/storm";
import { locationIcons } from "./icons";

export function MobileChrome() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectedGazetteerId = useAtlasStore(
    (state) => state.selectedGazetteerId,
  );
  const selectLocation = useAtlasStore((state) => state.selectLocation);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const simulationTime = useAtlasStore((state) => state.simulationTime);
  const isPlaying = useAtlasStore((state) => state.isPlaying);
  const togglePlaying = useAtlasStore((state) => state.togglePlaying);
  const stormMode = useAtlasStore((state) => state.stormMode);
  const menuOpen = useAtlasStore((state) => state.menuOpen);
  const selected =
    locationById.get(selectedId) ?? locationById.get("shattered-plains")!;
  const selectedGazetteer = selectedGazetteerId
    ? gazetteerById.get(selectedGazetteerId)
    : undefined;
  const stormCoordinateX = selectedGazetteer?.world?.[0] ?? selected.coordinates.x;
  const phase = stormPhase(
    stormXAtTime(simulationTime),
    stormCoordinateX,
  );

  return (
    <div className={`mobile-chrome ${menuOpen ? "is-menu-open" : ""}`}>
      <section className="mobile-location-strip panel">
        <div>
          <h2>
            {stormMode
              ? "Highstorm"
              : selectedGazetteer?.canonicalName ?? selected.name}
          </h2>
          <p>
            {stormMode
              ? "Following the stormwall"
              : selectedGazetteer
                ? `${selectedGazetteer.kind} · ${selectedGazetteer.nationOrRegion} · ${selectedGazetteer.certainty}`
                : selected.subtitle}
          </p>
          <span>
            <CloudLightning size={13} />
            {phase === "storm"
              ? "The stormwall is here"
              : phase === "warning"
                ? "Highstorm approaching from the east"
                : "Stormward watch active"}
          </span>
        </div>
      </section>
      <section className="mobile-sheet panel">
        <span className="sheet-handle" aria-hidden="true" />
        <div className="mobile-travel-list">
          <button
            type="button"
            className={stormMode ? "is-selected" : ""}
            onClick={() => selectLocation("highstorm")}
          >
            <CloudLightning />
            <span>Highstorm</span>
          </button>
          {travelLocations.map((location) => {
            const Icon = locationIcons[location.id];
            return (
              <button
                key={location.id}
                type="button"
                className={
                  !selectedGazetteerId && selectedId === location.id
                    ? "is-selected"
                    : ""
                }
                onClick={() => selectLocation(location.id)}
              >
                <Icon />
                <span>{location.name}</span>
              </button>
            );
          })}
        </div>
        <button
          className="mobile-explore"
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("atlas:zoom", { detail: { factor: 0.46 } }),
            )
          }
        >
          <span>
            {stormMode
              ? "Ride the storm"
              : selectedGazetteer
                ? "Inspect mapped place"
                : "Explore location"}
          </span>
          <strong>{detailLevel}</strong>
          <ChevronRight />
        </button>
        <footer>
          <span>
            <Layers3 size={15} /> LOD {detailLevel}
          </span>
          <button
            type="button"
            aria-label={isPlaying ? "Pause simulation" : "Resume simulation"}
            onClick={togglePlaying}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </footer>
      </section>
    </div>
  );
}
