import { Castle, Circle, MapPin, Route, Sparkles } from "lucide-react";
import { useAtlasStore } from "../store/useAtlasStore";

export function Legend() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const frontiersVisible = useAtlasStore((state) => state.frontiersVisible);
  const toggleFrontiers = useAtlasStore((state) => state.toggleFrontiers);
  return (
    <aside className="legend panel">
      <span className="section-label">Legend</span>
      <div className="legend-items">
        <span>
          <MapPin /> City / capital
        </span>
        <span>
          <Circle /> Settlement
        </span>
        <span>
          <Castle /> Stronghold
        </span>
        <span>
          <Route /> Caravan route
        </span>
        <span>
          <Sparkles /> Spren cluster
        </span>
      </div>
      <button
        className="frontier-legend-toggle"
        type="button"
        aria-pressed={frontiersVisible}
        onClick={toggleFrontiers}
      >
        <span className="frontier-samples" aria-hidden="true">
          <i className="national" />
          <i className="disputed" />
          <i className="porous" />
        </span>
        <span>{frontiersVisible ? "Frontiers visible" : "Frontiers hidden"}</span>
      </button>
      <footer>
        <strong>{detailLevel.toUpperCase()}</strong>
        <span>Live terrain detail</span>
      </footer>
    </aside>
  );
}
