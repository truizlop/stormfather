import { create } from "zustand";
import type { DetailLevel } from "../world/types";
import { gazetteerById } from "../world/gazetteer/catalog";

interface AtlasState {
  selectedId: string;
  selectedGazetteerId: string | null;
  /**
   * The authored city currently under the camera's local-detail focus. Unlike
   * selectedId this is observational state: publishing it must never start a
   * camera trip or replace an exact gazetteer selection.
   */
  proximityLocationId: string | null;
  travelEpoch: number;
  simulationTime: number;
  isPlaying: boolean;
  detailLevel: DetailLevel;
  stormMode: boolean;
  nightMode: boolean;
  menuOpen: boolean;
  searchOpen: boolean;
  locationPanelOpen: boolean;
  frontiersVisible: boolean;
  toast: { title: string; message: string } | null;
  selectLocation: (id: string) => void;
  focusGazetteerPlace: (id: string) => void;
  recenterSelection: () => void;
  setProximityLocation: (id: string | null) => void;
  setSimulationTime: (time: number) => void;
  togglePlaying: () => void;
  setPlaying: (playing: boolean) => void;
  setDetailLevel: (level: DetailLevel) => void;
  setStormMode: (enabled: boolean) => void;
  toggleNightMode: () => void;
  toggleMenu: () => void;
  setSearchOpen: (open: boolean) => void;
  toggleLocationPanel: () => void;
  toggleFrontiers: () => void;
  showToast: (title: string, message: string) => void;
  dismissToast: () => void;
}

export const useAtlasStore = create<AtlasState>((set) => ({
  selectedId: "roshar",
  selectedGazetteerId: null,
  proximityLocationId: null,
  travelEpoch: 0,
  simulationTime: 12,
  isPlaying: true,
  detailLevel: "continent",
  stormMode: false,
  nightMode: false,
  menuOpen: false,
  searchOpen: false,
  locationPanelOpen: true,
  frontiersVisible: true,
  toast: null,
  selectLocation: (id) =>
    set((state) => ({
      selectedId: id,
      selectedGazetteerId: null,
      proximityLocationId: null,
      travelEpoch: state.travelEpoch + 1,
      stormMode: id === "highstorm",
      menuOpen: false,
      searchOpen: false,
      locationPanelOpen: true,
    })),
  focusGazetteerPlace: (id) =>
    set((state) => {
      const place = gazetteerById.get(id);
      return {
        // Standalone gazetteer places have no authored parent scene. Reset to
        // the neutral world selection so a previously visited detailed city
        // is not force-rendered and simulated off-screen behind this search.
        selectedId: place?.parentLocationId ?? "roshar",
        selectedGazetteerId: id,
        proximityLocationId: null,
        travelEpoch: state.travelEpoch + 1,
        stormMode: false,
        menuOpen: false,
        searchOpen: false,
        locationPanelOpen: true,
      };
    }),
  recenterSelection: () =>
    set((state) => ({
      // Keep the exact gazetteer place selected. Re-selecting the modeled
      // parent loses the searched city and used to send Vedenar back to
      // Urithiru, Azimir back to generic Azir, and Akinah back to generic
      // Aimia.
      travelEpoch: state.travelEpoch + 1,
      stormMode: false,
      menuOpen: false,
      searchOpen: false,
      locationPanelOpen: true,
    })),
  setProximityLocation: (proximityLocationId) =>
    set((state) =>
      state.proximityLocationId === proximityLocationId
        ? state
        : { proximityLocationId },
    ),
  setSimulationTime: (simulationTime) => set({ simulationTime }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setDetailLevel: (detailLevel) => set({ detailLevel }),
  setStormMode: (stormMode) =>
    set((state) => ({
      stormMode,
      selectedId: stormMode ? "highstorm" : "shattered-plains",
      selectedGazetteerId: null,
      proximityLocationId: null,
      travelEpoch: state.travelEpoch + 1,
    })),
  toggleNightMode: () => set((state) => ({ nightMode: !state.nightMode })),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  toggleLocationPanel: () =>
    set((state) => ({ locationPanelOpen: !state.locationPanelOpen })),
  toggleFrontiers: () =>
    set((state) => ({ frontiersVisible: !state.frontiersVisible })),
  showToast: (title, message) => set({ toast: { title, message } }),
  dismissToast: () => set({ toast: null }),
}));
