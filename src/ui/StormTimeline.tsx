import { FastForward, Pause, Play } from "lucide-react";
import { useAtlasStore } from "../store/useAtlasStore";
import { locations } from "../world/locations";
import {
  STORM_CYCLE_SECONDS,
  stormXAtTime,
} from "../world/weather/storm";

const timelineLocations = locations
  .filter((location) =>
    ["shattered-plains", "alethkar", "jah-keved", "shinovar"].includes(
      location.id,
    ),
  )
  .sort((a, b) => b.coordinates.x - a.coordinates.x);

export function StormTimeline() {
  const simulationTime = useAtlasStore((state) => state.simulationTime);
  const isPlaying = useAtlasStore((state) => state.isPlaying);
  const togglePlaying = useAtlasStore((state) => state.togglePlaying);
  const setSimulationTime = useAtlasStore((state) => state.setSimulationTime);
  const progress = (simulationTime % STORM_CYCLE_SECONDS) / STORM_CYCLE_SECONDS;
  const stormX = stormXAtTime(simulationTime);

  return (
    <div className="storm-timeline panel">
      <button
        type="button"
        aria-label={isPlaying ? "Pause storm" : "Resume storm"}
        onClick={togglePlaying}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="timeline-track">
        <input
          type="range"
          min="0"
          max={STORM_CYCLE_SECONDS}
          step="0.1"
          value={simulationTime % STORM_CYCLE_SECONDS}
          aria-label="Highstorm path"
          onChange={(event) => setSimulationTime(Number(event.target.value))}
        />
        <div className="timeline-labels">
          {timelineLocations.map((location) => (
            <span key={location.id}>{location.name}</span>
          ))}
        </div>
      </div>
      <output>{Math.round(stormX)}°</output>
      <button
        type="button"
        aria-label="Advance storm"
        onClick={() => setSimulationTime(simulationTime + 12)}
      >
        <FastForward size={16} />
      </button>
      <span
        className="timeline-progress"
        style={{ "--storm-progress": progress } as React.CSSProperties}
      />
    </div>
  );
}
