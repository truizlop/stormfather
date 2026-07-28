import { Castle, Circle, MapPin, Route, Sparkles } from "lucide-react";
import { useAtlasStore } from "../store/useAtlasStore";

export function Legend() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
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
      <footer>
        <strong>{detailLevel.toUpperCase()}</strong>
        <span>Live terrain detail</span>
      </footer>
    </aside>
  );
}
