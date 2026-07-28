import { Crosshair, Home, Minus, Navigation, Plus } from "lucide-react";
import { useAtlasStore } from "../store/useAtlasStore";

function zoom(factor: number) {
  window.dispatchEvent(
    new CustomEvent("atlas:zoom", { detail: { factor } }),
  );
}

export function MapControls() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectLocation = useAtlasStore((state) => state.selectLocation);

  return (
    <div className="map-controls" aria-label="Map controls">
      <div className="zoom-stack">
        <button type="button" aria-label="Zoom in" onClick={() => zoom(0.72)}>
          <Plus size={18} />
        </button>
        <span aria-hidden="true" />
        <button type="button" aria-label="Zoom out" onClick={() => zoom(1.38)}>
          <Minus size={18} />
        </button>
      </div>
      <div className="orientation-stack">
        <button
          type="button"
          aria-label="Reset north"
          onClick={() => selectLocation(selectedId)}
        >
          <Navigation size={18} />
        </button>
        <button
          type="button"
          aria-label="Return to continent"
          onClick={() => selectLocation("roshar")}
        >
          <Home size={17} />
        </button>
        <button
          type="button"
          aria-label="Center selected location"
          onClick={() => selectLocation(selectedId)}
        >
          <Crosshair size={18} />
        </button>
      </div>
    </div>
  );
}
