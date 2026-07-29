import {
  ChevronLeft,
  CloudLightning,
  Compass,
  MoveLeft,
  Wind,
} from "lucide-react";
import { useAtlasStore } from "../store/useAtlasStore";
import { gazetteerById } from "../world/gazetteer";
import type { GazetteerPlace } from "../world/gazetteer";
import { locationById } from "../world/locations";
import {
  stormPhase,
  stormXAtTime,
  timeUntilStorm,
} from "../world/weather/storm";
import { locationIcons } from "./icons";

function formatPopulation(population: number) {
  return new Intl.NumberFormat("en", {
    notation: population > 999_999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(population);
}

function StormPanel() {
  const simulationTime = useAtlasStore((state) => state.simulationTime);
  const setStormMode = useAtlasStore((state) => state.setStormMode);
  const stormX = stormXAtTime(simulationTime);
  const next =
    [...locationById.values()]
      .filter(
        (location) =>
          location.id !== "roshar" && location.coordinates.x < stormX,
      )
      .sort(
        (a, b) =>
          stormX - a.coordinates.x - (stormX - b.coordinates.x),
      )[0] ?? null;

  return (
    <aside className="location-panel panel storm-panel">
      <div className="location-title">
        <CloudLightning size={25} strokeWidth={1.25} />
        <div>
          <h2>Highstorm</h2>
          <p>Following the stormwall</p>
        </div>
        <button
          type="button"
          aria-label="Exit storm view"
          onClick={() => setStormMode(false)}
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      <dl className="telemetry">
        <div>
          <dt>Phase</dt>
          <dd>Advancing</dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>
            <MoveLeft size={14} /> East → West
          </dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>
            <Wind size={14} /> 28 leagues / hour
          </dd>
        </div>
        <div>
          <dt>Next location</dt>
          <dd>{next?.name ?? "The western ocean"}</dd>
        </div>
      </dl>
      <button
        className="primary-outline"
        type="button"
        onClick={() => setStormMode(false)}
      >
        Exit storm view
      </button>
    </aside>
  );
}

function GazetteerPanel({ place }: { place: GazetteerPlace }) {
  const toggleLocationPanel = useAtlasStore(
    (state) => state.toggleLocationPanel,
  );
  const placement =
    place.certainty === "precise"
      ? "Explicit cartographic point"
      : place.certainty === "regional"
        ? "Regional placement"
        : "No responsible exterior point";

  return (
    <aside className="location-panel panel gazetteer-panel">
      <div className="location-title">
        <Compass size={26} strokeWidth={1.25} />
        <div>
          <h2>{place.canonicalName}</h2>
          <p>
            {place.kind} · {place.nationOrRegion}
          </p>
        </div>
        <button
          type="button"
          aria-label="Collapse place details"
          onClick={toggleLocationPanel}
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      <section>
        <span className="section-label">Cartographic record</span>
        <dl className="activity-details">
          <div>
            <dt>Placement</dt>
            <dd>{placement}</dd>
          </div>
          <div>
            <dt>Map treatment</dt>
            <dd>{place.visualization.replaceAll("-", " ")}</dd>
          </div>
          {place.referencePixel && (
            <div>
              <dt>Reference point</dt>
              <dd>
                {place.referencePixel[0].toFixed(1)},{" "}
                {place.referencePixel[1].toFixed(1)}
              </dd>
            </div>
          )}
        </dl>
      </section>
      {place.alternateNames && place.alternateNames.length > 0 && (
        <div className="location-facts">
          {place.alternateNames.map((name) => (
            <span key={name}>Also: {name}</span>
          ))}
        </div>
      )}
      <section className="gazetteer-sources">
        <span className="section-label">Sources</span>
        {place.sources.slice(0, 3).map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            {source.title}
          </a>
        ))}
      </section>
    </aside>
  );
}

export function LocationPanel() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectedGazetteerId = useAtlasStore(
    (state) => state.selectedGazetteerId,
  );
  const simulationTime = useAtlasStore((state) => state.simulationTime);
  const stormMode = useAtlasStore((state) => state.stormMode);
  const isOpen = useAtlasStore((state) => state.locationPanelOpen);
  const toggleLocationPanel = useAtlasStore(
    (state) => state.toggleLocationPanel,
  );
  if (!isOpen) return null;
  if (stormMode) return <StormPanel />;

  const gazetteerPlace = selectedGazetteerId
    ? gazetteerById.get(selectedGazetteerId)
    : undefined;
  if (gazetteerPlace) return <GazetteerPanel place={gazetteerPlace} />;

  const location = locationById.get(selectedId);
  if (!location) return null;
  const Icon = locationIcons[location.id] ?? Compass;
  const stormX = stormXAtTime(simulationTime);
  const phase = stormPhase(stormX, location.coordinates.x);
  const until = timeUntilStorm(stormX, location.coordinates.x);

  return (
    <aside className="location-panel panel">
      <div className="location-title">
        <Icon size={26} strokeWidth={1.25} />
        <div>
          <h2>{location.name}</h2>
          <p>{location.subtitle}</p>
        </div>
        <button
          type="button"
          aria-label="Collapse location details"
          onClick={toggleLocationPanel}
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      <p className="location-description">{location.description}</p>
      <section className="weather-section">
        <span className="section-label">Weather</span>
        <div className="weather-reading">
          <Wind size={27} strokeWidth={1.2} />
          <strong>
            {phase === "storm"
              ? "Stormwall"
              : phase === "warning"
                ? "Rising winds"
                : phase === "wake"
                  ? "Stormwake"
                  : "Steady winds"}
          </strong>
          <span>{phase === "storm" ? "6°" : "18°"}</span>
        </div>
        <dl className="weather-details">
          <div>
            <dt>Storm proximity</dt>
            <dd className={`phase-${phase}`}>
              {until === null
                ? "Passed"
                : until < 12
                  ? "Imminent"
                  : `${Math.ceil(until)} min`}
            </dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>East → West</dd>
          </div>
        </dl>
      </section>
      <section>
        <span className="section-label">Population activity</span>
        <dl className="activity-details">
          <div>
            <dt>Inhabitants</dt>
            <dd>{formatPopulation(location.population)}</dd>
          </div>
          <div>
            <dt>Activity</dt>
            <dd>{phase === "storm" ? "Seeking shelter" : location.activity}</dd>
          </div>
        </dl>
      </section>
      <div className="location-facts">
        {location.facts.map((fact) => (
          <span key={fact}>{fact}</span>
        ))}
      </div>
    </aside>
  );
}
