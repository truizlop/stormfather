import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useState } from "react";
import { useAtlasStore } from "../store/useAtlasStore";
import { travelLocations } from "../world/locations";
import { locationIcons } from "./icons";

export function TravelRail() {
  const [collapsed, setCollapsed] = useState(false);
  const selectedId = useAtlasStore((state) => state.selectedId);
  const selectLocation = useAtlasStore((state) => state.selectLocation);
  const stormMode = useAtlasStore((state) => state.stormMode);

  return (
    <aside
      className={`travel-rail panel ${collapsed ? "is-collapsed" : ""}`}
      aria-label="Travel destinations"
    >
      <div className="panel-heading">
        <h2>Travel</h2>
        <button
          type="button"
          aria-label={
            collapsed
              ? "Expand travel destinations"
              : "Collapse travel destinations"
          }
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>
      <div className="travel-list">
        {travelLocations.map((location) => {
          const Icon = locationIcons[location.id];
          const selected = selectedId === location.id && !stormMode;
          return (
            <button
              key={location.id}
              type="button"
              className={`travel-row ${selected ? "is-selected" : ""}`}
              onClick={() => selectLocation(location.id)}
              aria-current={selected ? "location" : undefined}
            >
              <Icon size={16} strokeWidth={1.45} />
              <span>{location.name}</span>
              <Star size={13} strokeWidth={1.2} />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`storm-destination ${stormMode ? "is-selected" : ""}`}
        onClick={() => selectLocation("highstorm")}
      >
        <span className="storm-spiral" aria-hidden="true">
          ◉
        </span>
        <span>
          <strong>Highstorm</strong>
          <small>Track the coming storm</small>
        </span>
        <Star size={14} fill="currentColor" />
      </button>
    </aside>
  );
}
