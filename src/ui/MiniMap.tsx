import { useAtlasStore } from "../store/useAtlasStore";
import { locationById, locations } from "../world/locations";
import { worldToMinimap } from "../world/coordinates";
import { rosharOutline } from "../world/terrain/rosharOutline";
import { stormXAtTime } from "../world/weather/storm";

const outlinePoints = rosharOutline
  .map(([x, z]) => {
    const point = worldToMinimap({ x, z });
    return `${point.x},${point.y}`;
  })
  .join(" ");

const viewportSize = {
  continent: 76,
  region: 36,
  city: 18,
  street: 9,
};

export function MiniMap() {
  const selectedId = useAtlasStore((state) => state.selectedId);
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const simulationTime = useAtlasStore((state) => state.simulationTime);
  const selected = locationById.get(selectedId) ?? locationById.get("roshar")!;
  const marker = worldToMinimap(selected.coordinates);
  const storm = worldToMinimap({
    x: stormXAtTime(simulationTime),
    z: 0,
  });
  const size = viewportSize[detailLevel];

  return (
    <aside className="minimap panel" aria-label="Roshar minimap">
      <svg viewBox="0 0 100 100" role="img" aria-label="Current map position">
        <defs>
          <linearGradient id="map-land" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#526251" />
            <stop offset="1" stopColor="#313b36" />
          </linearGradient>
          <filter id="storm-glow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polygon
          points={outlinePoints}
          fill="url(#map-land)"
          stroke="#a58d62"
          strokeWidth="0.5"
        />
        <ellipse cx="39.5" cy="30" rx="4.7" ry="4" fill="#26737b" opacity="0.8" />
        {locations.slice(1).map((location) => {
          const point = worldToMinimap(location.coordinates);
          return (
            <circle
              key={location.id}
              cx={point.x}
              cy={point.y}
              r={location.id === selected.id ? 1.35 : 0.72}
              fill={
                location.id === selected.id
                  ? location.accentColor
                  : "rgba(236,214,168,.72)"
              }
            />
          );
        })}
        <line
          x1={storm.x}
          x2={storm.x}
          y1="4"
          y2="96"
          stroke="#64e7f0"
          strokeWidth="1.2"
          strokeDasharray="1.4 1.2"
          filter="url(#storm-glow)"
        />
        <rect
          x={Math.max(1, Math.min(99 - size, marker.x - size / 2))}
          y={Math.max(1, Math.min(99 - size, marker.y - size / 2))}
          width={size}
          height={size}
          fill="none"
          stroke="#f3e2b9"
          strokeWidth="0.85"
        />
        <circle
          cx={marker.x}
          cy={marker.y}
          r="1.5"
          fill="#071218"
          stroke="#68e6ef"
          strokeWidth="0.8"
        />
      </svg>
      <div className="minimap-caption">
        <span>{selected.name}</span>
        <strong>{detailLevel}</strong>
      </div>
    </aside>
  );
}
