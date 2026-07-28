import { useAtlasStore } from "../store/useAtlasStore";
import { Legend } from "./Legend";
import { LocationPanel } from "./LocationPanel";
import { MapControls } from "./MapControls";
import { MiniMap } from "./MiniMap";
import { MobileChrome } from "./MobileChrome";
import { SearchPalette } from "./SearchPalette";
import { StormTimeline } from "./StormTimeline";
import { Toast } from "./Toast";
import { TopBar } from "./TopBar";
import { TravelRail } from "./TravelRail";

export function AtlasUI() {
  const stormMode = useAtlasStore((state) => state.stormMode);
  return (
    <div className={`atlas-ui ${stormMode ? "is-storm-mode" : ""}`}>
      <TopBar />
      <div className="desktop-ui">
        <TravelRail />
        <LocationPanel />
        {!stormMode && <Legend />}
        <MiniMap />
        {stormMode && <StormTimeline />}
      </div>
      <MapControls />
      <MobileChrome />
      <SearchPalette />
      <Toast />
      <p className="unofficial-note">
        Original, unofficial fan-made visualization
      </p>
    </div>
  );
}
