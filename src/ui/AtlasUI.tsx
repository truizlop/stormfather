import { useAtlasStore } from "../store/useAtlasStore";
import { Legend } from "./Legend";
import { LocationPanel } from "./LocationPanel";
import { MapControls } from "./MapControls";
import { MiniMap } from "./MiniMap";
import { MobileChrome } from "./MobileChrome";
import { SearchPalette } from "./SearchPalette";
import { ScaleReadout } from "./ScaleReadout";
import { StormTimeline } from "./StormTimeline";
import { Toast } from "./Toast";
import { TopBar } from "./TopBar";
import { TravelRail } from "./TravelRail";
import { useCompactLayout } from "./useCompactLayout";

export function AtlasUI() {
  const stormMode = useAtlasStore((state) => state.stormMode);
  const menuOpen = useAtlasStore((state) => state.menuOpen);
  const compactLayout = useCompactLayout();

  return (
    <div
      className={[
        "atlas-ui",
        stormMode ? "is-storm-mode" : "",
        compactLayout ? "is-compact-layout" : "is-desktop-layout",
        menuOpen ? "is-menu-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <TopBar />
      {compactLayout ? (
        <MobileChrome />
      ) : (
        <div className="desktop-ui">
          <TravelRail />
          <LocationPanel />
          {!stormMode && <Legend />}
          <MiniMap />
          {stormMode && <StormTimeline />}
        </div>
      )}
      <MapControls />
      {!stormMode && !menuOpen && <ScaleReadout />}
      <SearchPalette />
      <Toast />
      <p className="unofficial-note">
        Original, unofficial fan-made visualization
      </p>
    </div>
  );
}
