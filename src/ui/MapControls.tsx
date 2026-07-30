import { Crosshair, Home, Map, Minus, Navigation, Plus } from "lucide-react";
import { useAtlasStore } from "../store/useAtlasStore";

function zoom(factor: number) {
  window.dispatchEvent(
    new CustomEvent("atlas:zoom", { detail: { factor } }),
  );
}

export function MapControls() {
  const selectLocation = useAtlasStore((state) => state.selectLocation);
  const recenterSelection = useAtlasStore(
    (state) => state.recenterSelection,
  );
  const frontiersVisible = useAtlasStore((state) => state.frontiersVisible);
  const toggleFrontiers = useAtlasStore((state) => state.toggleFrontiers);

  return (
    <div className="map-controls" role="group" aria-label="Map controls">
      <div className="zoom-stack">
        <button
          className="map-control-zoom-in"
          type="button"
          aria-label="Zoom in"
          onClick={() => zoom(0.72)}
        >
          <Plus size={18} />
        </button>
        <span aria-hidden="true" />
        <button
          className="map-control-zoom-out"
          type="button"
          aria-label="Zoom out"
          onClick={() => zoom(1.38)}
        >
          <Minus size={18} />
        </button>
      </div>
      <div className="orientation-stack">
        <button
          className="map-control-frontiers"
          type="button"
          aria-label={
            frontiersVisible
              ? "Hide country frontiers"
              : "Show country frontiers"
          }
          aria-pressed={frontiersVisible}
          onClick={toggleFrontiers}
        >
          <Map size={17} />
        </button>
        <button
          className="map-control-reset-north"
          type="button"
          aria-label="Reset north"
          onClick={recenterSelection}
        >
          <Navigation size={18} />
        </button>
        <button
          className="map-control-home"
          type="button"
          aria-label="Return to continent"
          onClick={() => selectLocation("roshar")}
        >
          <Home size={17} />
        </button>
        <button
          className="map-control-recenter"
          type="button"
          aria-label="Center selected location"
          onClick={recenterSelection}
        >
          <Crosshair size={18} />
        </button>
      </div>
    </div>
  );
}
