import {
  ChevronRight,
  CloudLightning,
  Layers3,
  Map,
  Moon,
  Pause,
  Play,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { useAtlasStore } from "../store/useAtlasStore";
import { gazetteerById } from "../world/gazetteer";
import { locationById, locations } from "../world/locations";
import type { DetailLevel } from "../world/types";
import { stormPhase, stormXAtTime } from "../world/weather/storm";
import { locationIcons } from "./icons";

interface DetailStep {
  level: DetailLevel;
  factor: number;
  label: string;
}

const detailSteps: Record<DetailLevel, DetailStep> = {
  continent: { level: "region", factor: 0.46, label: "Explore region" },
  region: { level: "city", factor: 0.46, label: "Explore city" },
  city: { level: "street", factor: 0.58, label: "Explore streets" },
  street: { level: "street", factor: 0.72, label: "Look closer" },
};

function nextMobileDetail(detailLevel: DetailLevel): DetailStep {
  return detailSteps[detailLevel];
}

function zoomToNextDetail(detailLevel: DetailLevel) {
  const step = nextMobileDetail(detailLevel);
  window.dispatchEvent(
    new CustomEvent("atlas:zoom", {
      detail: { factor: step.factor, level: step.level },
    }),
  );
}

function destinationDescription(kind: string, subtitle: string) {
  const label = kind === "nation" ? "Kingdom" : kind;
  return `${label} · ${subtitle}`;
}

export function MobileChrome() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectedGazetteerId = useAtlasStore(
    (state) => state.selectedGazetteerId,
  );
  const selectLocation = useAtlasStore((state) => state.selectLocation);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const simulationTimeBucket = useAtlasStore((state) =>
    Math.floor(state.simulationTime),
  );
  const isPlaying = useAtlasStore((state) => state.isPlaying);
  const togglePlaying = useAtlasStore((state) => state.togglePlaying);
  const stormMode = useAtlasStore((state) => state.stormMode);
  const nightMode = useAtlasStore((state) => state.nightMode);
  const toggleNightMode = useAtlasStore((state) => state.toggleNightMode);
  const frontiersVisible = useAtlasStore((state) => state.frontiersVisible);
  const toggleFrontiers = useAtlasStore((state) => state.toggleFrontiers);
  const menuOpen = useAtlasStore((state) => state.menuOpen);
  const setMenuOpen = useAtlasStore((state) => state.setMenuOpen);
  const setSearchOpen = useAtlasStore((state) => state.setSearchOpen);

  const selected =
    locationById.get(selectedId) ?? locationById.get("shattered-plains")!;
  const selectedGazetteer = selectedGazetteerId
    ? gazetteerById.get(selectedGazetteerId)
    : undefined;
  const selectedName = stormMode
    ? "Highstorm"
    : selectedGazetteer?.canonicalName ?? selected.name;
  const selectedSubtitle = stormMode
    ? "Ride the stormwall east to west"
    : selectedGazetteer
      ? `${selectedGazetteer.category} · ${selectedGazetteer.nationOrRegion}`
      : selected.subtitle;
  const SelectedIcon = stormMode
    ? CloudLightning
    : (locationIcons[selected.id] ?? Map);
  const stormCoordinateX =
    selectedGazetteer?.world?.[0] ?? selected.coordinates.x;
  const phase = stormPhase(
    stormXAtTime(simulationTimeBucket),
    stormCoordinateX,
  );
  const detailStep = nextMobileDetail(detailLevel);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen, setMenuOpen]);

  return (
    <div className={`mobile-chrome ${menuOpen ? "is-menu-open" : ""}`}>
      {!menuOpen && (
        <section
          id="mobile-travel-sheet"
          className="mobile-dock panel"
          aria-label={`Selected location: ${selectedName}`}
          aria-live="polite"
        >
          <button
            className="mobile-dock-summary"
            type="button"
            aria-label={`Open travel menu. Selected location: ${selectedName}`}
            onClick={() => setMenuOpen(true)}
          >
            <span
              className={`mobile-dock-icon ${
                stormMode ? "is-storm-mode" : ""
              }`}
              aria-hidden="true"
            >
              <SelectedIcon size={22} />
            </span>
            <span className="mobile-dock-copy">
              <strong>{selectedName}</strong>
              <span>{selectedSubtitle}</span>
              <small>
                {stormMode
                  ? phase === "storm"
                    ? "Stormwall overhead"
                    : phase === "warning"
                      ? "Stormwall approaching"
                      : "Stormward watch"
                  : `${detailLevel} detail`}
              </small>
            </span>
          </button>
          <button
            className="mobile-explore"
            type="button"
            onClick={() => zoomToNextDetail(detailLevel)}
          >
            <span>{stormMode ? "Ride storm" : detailStep.label}</span>
            <ChevronRight size={18} />
          </button>
        </section>
      )}

      {menuOpen && (
        <div
          className="mobile-sheet-backdrop"
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <section
            id="mobile-travel-sheet"
            className="mobile-sheet panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-travel-title"
          >
            <header className="mobile-sheet-header">
              <span className="mobile-sheet-mark" aria-hidden="true">
                <Map size={20} />
              </span>
              <span>
                <small>Atlas of the stormlands</small>
                <h2 id="mobile-travel-title">Travel Roshar</h2>
              </span>
              <button
                type="button"
                aria-label="Close travel menu"
                onClick={() => setMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </header>

            <button
              className="mobile-travel-search"
              type="button"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} />
              <span>Find a city, kingdom, or landmark</span>
              <kbd>Search</kbd>
            </button>

            <nav
              className="mobile-destination-list"
              aria-label="Travel destinations"
            >
              <button
                type="button"
                className={`mobile-destination is-highstorm ${
                  stormMode ? "is-selected" : ""
                }`}
                aria-current={stormMode ? "location" : undefined}
                onClick={() => selectLocation("highstorm")}
              >
                <span className="mobile-destination-icon" aria-hidden="true">
                  <CloudLightning size={20} />
                </span>
                <span>
                  <strong>Highstorm</strong>
                  <small>Track the living stormwall from above</small>
                </span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
              {locations.map((location) => {
                const Icon = locationIcons[location.id] ?? Map;
                const isSelected =
                  !stormMode &&
                  !selectedGazetteerId &&
                  selectedId === location.id;
                return (
                  <button
                    key={location.id}
                    type="button"
                    className={`mobile-destination ${
                      isSelected ? "is-selected" : ""
                    }`}
                    aria-current={isSelected ? "location" : undefined}
                    onClick={() => selectLocation(location.id)}
                  >
                    <span
                      className="mobile-destination-icon"
                      aria-hidden="true"
                    >
                      <Icon size={20} />
                    </span>
                    <span>
                      <strong>{location.name}</strong>
                      <small>
                        {destinationDescription(
                          location.kind,
                          location.subtitle,
                        )}
                      </small>
                    </span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                );
              })}
            </nav>

            <footer className="mobile-sheet-footer">
              <button
                type="button"
                aria-label={
                  frontiersVisible
                    ? "Hide country frontiers"
                    : "Show country frontiers"
                }
                aria-pressed={frontiersVisible}
                onClick={toggleFrontiers}
              >
                <Layers3 size={17} />
                <span>Frontiers</span>
              </button>
              <button
                type="button"
                aria-label={
                  nightMode ? "Switch to daylight" : "Switch to night"
                }
                aria-pressed={nightMode}
                onClick={toggleNightMode}
              >
                {nightMode ? <Moon size={17} /> : <Sun size={17} />}
                <span>{nightMode ? "Daylight" : "Night"}</span>
              </button>
              <button
                type="button"
                aria-label={
                  isPlaying ? "Pause simulation" : "Resume simulation"
                }
                aria-pressed={!isPlaying}
                onClick={togglePlaying}
              >
                {isPlaying ? <Pause size={17} /> : <Play size={17} />}
                <span>{isPlaying ? "Pause" : "Resume"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  zoomToNextDetail(detailLevel);
                }}
              >
                <ChevronRight size={17} />
                <span>{detailStep.level}</span>
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
