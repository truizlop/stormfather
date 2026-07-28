import {
  Menu,
  Moon,
  Pause,
  Play,
  Search,
  Sun,
} from "lucide-react";
import { useAtlasStore } from "../store/useAtlasStore";
import type { DetailLevel } from "../world/types";
import { BrandMark } from "./BrandMark";

const detailLevels: readonly DetailLevel[] = [
  "continent",
  "region",
  "city",
  "street",
];

function zoomTo(level: DetailLevel) {
  const factor: Record<DetailLevel, number> = {
    continent: 8,
    region: 2.3,
    city: 0.65,
    street: 0.38,
  };
  window.dispatchEvent(
    new CustomEvent("atlas:zoom", { detail: { factor: factor[level] } }),
  );
}

export function TopBar() {
  const detailLevel = useAtlasStore((state) => state.detailLevel);
  const isPlaying = useAtlasStore((state) => state.isPlaying);
  const nightMode = useAtlasStore((state) => state.nightMode);
  const togglePlaying = useAtlasStore((state) => state.togglePlaying);
  const toggleNightMode = useAtlasStore((state) => state.toggleNightMode);
  const toggleMenu = useAtlasStore((state) => state.toggleMenu);

  return (
    <header className="top-bar">
      <div className="brand-lockup">
        <BrandMark className="brand-mark" />
        <span>Roshar</span>
      </div>
      <nav className="lod-nav" aria-label="Map detail">
        {detailLevels.map((level) => (
          <button
            key={level}
            className={level === detailLevel ? "is-active" : ""}
            type="button"
            onClick={() => zoomTo(level)}
          >
            {level}
          </button>
        ))}
      </nav>
      <div className="top-actions">
        <button type="button" aria-label="Search locations" disabled>
          <Search size={16} />
        </button>
        <button
          type="button"
          aria-label={nightMode ? "Switch to daylight" : "Switch to night"}
          onClick={toggleNightMode}
        >
          {nightMode ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <button
          className="play-control"
          type="button"
          aria-label={isPlaying ? "Pause simulation" : "Resume simulation"}
          onClick={togglePlaying}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          className="mobile-menu-trigger"
          type="button"
          aria-label="Open travel menu"
          onClick={toggleMenu}
        >
          <Menu size={21} />
        </button>
      </div>
    </header>
  );
}
