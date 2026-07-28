import {
  ChevronLeft,
  CloudLightning,
  Compass,
  MoveLeft,
  Wind,
} from "lucide-react";
import { useAtlasStore } from "../store/useAtlasStore";
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

export function LocationPanel() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const simulationTime = useAtlasStore((state) => state.simulationTime);
  const stormMode = useAtlasStore((state) => state.stormMode);
  const isOpen = useAtlasStore((state) => state.locationPanelOpen);
  const toggleLocationPanel = useAtlasStore(
    (state) => state.toggleLocationPanel,
  );
  if (!isOpen) return null;
  if (stormMode) return <StormPanel />;

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
