import { create } from "zustand";
import type { DetailLevel } from "../world/types";

interface AtlasState {
  selectedId: string;
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
  selectedId: "shattered-plains",
  travelEpoch: 0,
  simulationTime: 12,
  isPlaying: true,
  detailLevel: "city",
  stormMode: false,
  nightMode: true,
  menuOpen: false,
  searchOpen: false,
  locationPanelOpen: true,
  frontiersVisible: true,
  toast: null,
  selectLocation: (id) =>
    set((state) => ({
      selectedId: id,
      travelEpoch: state.travelEpoch + 1,
      stormMode: id === "highstorm",
      menuOpen: false,
      searchOpen: false,
      locationPanelOpen: true,
    })),
  setSimulationTime: (simulationTime) => set({ simulationTime }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setDetailLevel: (detailLevel) => set({ detailLevel }),
  setStormMode: (stormMode) =>
    set((state) => ({
      stormMode,
      selectedId: stormMode ? "highstorm" : "shattered-plains",
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
