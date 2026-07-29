import type { Culture } from "../types";

export type RoofStyle = "flat" | "dome" | "pitched" | "carapace" | "ruin";
export type DistrictActivity =
  | "port"
  | "civic"
  | "warcamp"
  | "tower"
  | "farm"
  | "lake"
  | "ruins"
  | "fortress"
  | "market";

export interface CityProfile {
  id: string;
  culture: Culture;
  roof: RoofStyle;
  activity: DistrictActivity;
  density: number;
  radius: number;
  height: readonly [number, number];
  footprint: readonly [number, number];
  palette: readonly string[];
  roofPalette: readonly string[];
  modules: readonly string[];
}

const genericProfiles: Record<Culture, CityProfile> = {
  alethi: {
    id: "alethi",
    culture: "alethi",
    roof: "flat",
    activity: "fortress",
    density: 0.92,
    radius: 4.5,
    height: [0.34, 0.96],
    footprint: [0.2, 0.42],
    palette: ["#7d7566", "#645a4e", "#8c6849", "#454d4d"],
    roofPalette: ["#273e55", "#654134", "#9a7137"],
    modules: [
      "Module_Windbreak_House",
      "Module_Stone_Arch",
      "Module_Storm_Awning",
      "Module_Warcamp_Scaffold",
    ],
  },
  azish: {
    id: "azish",
    culture: "azish",
    roof: "dome",
    activity: "civic",
    density: 0.78,
    radius: 4.2,
    height: [0.32, 0.82],
    footprint: [0.23, 0.48],
    palette: ["#c5ad78", "#a67547", "#d3c7a1", "#784d5c"],
    roofPalette: ["#24555d", "#934d39", "#b18a43"],
    modules: [
      "Module_Azish_Arcade",
      "Module_Stone_Arch",
      "Module_Market_Stall",
    ],
  },
  shin: {
    id: "shin",
    culture: "shin",
    roof: "pitched",
    activity: "farm",
    density: 0.46,
    radius: 4.1,
    height: [0.28, 0.62],
    footprint: [0.28, 0.55],
    palette: ["#8a6847", "#b28f61", "#756344", "#9f7b51"],
    roofPalette: ["#733d2c", "#945436", "#5b4935"],
    modules: ["Module_Shin_Farmstead", "Module_Market_Stall"],
  },
  veden: {
    id: "veden",
    culture: "veden",
    roof: "pitched",
    activity: "market",
    density: 0.74,
    radius: 4.7,
    height: [0.32, 0.82],
    footprint: [0.23, 0.48],
    palette: ["#9b735c", "#79624f", "#a99a7d", "#6d4140"],
    roofPalette: ["#733a3f", "#385e60", "#9b6f43"],
    modules: [
      "Module_Terraced_House",
      "Module_Stone_Arch",
      "Module_Market_Stall",
    ],
  },
  singer: {
    id: "singer",
    culture: "singer",
    roof: "carapace",
    activity: "warcamp",
    density: 0.38,
    radius: 4.8,
    height: [0.24, 0.54],
    footprint: [0.24, 0.5],
    palette: ["#48433d", "#665749", "#3e4c50", "#7b6049"],
    roofPalette: ["#4e1f1d", "#1f2222", "#795143"],
    modules: [
      "Module_Warcamp_Scaffold",
      "Module_Rope_Bridge",
      "Module_Storm_Awning",
    ],
  },
  thaylen: {
    id: "thaylen",
    culture: "thaylen",
    roof: "pitched",
    activity: "port",
    density: 0.76,
    radius: 4.4,
    height: [0.3, 0.76],
    footprint: [0.22, 0.44],
    palette: ["#6f7672", "#8e846d", "#6c5a4a", "#547176"],
    roofPalette: ["#274f5a", "#784a38", "#a28451"],
    modules: [
      "Module_Thaylen_Warehouse",
      "Module_Dock_Crane",
      "Module_Market_Stall",
    ],
  },
  purelaker: {
    id: "purelaker",
    culture: "purelaker",
    roof: "dome",
    activity: "lake",
    density: 0.36,
    radius: 4.4,
    height: [0.22, 0.48],
    footprint: [0.24, 0.46],
    palette: ["#8c8067", "#b3a27b", "#756a54", "#9c704a"],
    roofPalette: ["#d0c6a9", "#b6ad94", "#827d70"],
    modules: ["Module_Purelake_Jetty", "Module_Market_Stall"],
  },
  aimian: {
    id: "aimian",
    culture: "aimian",
    roof: "ruin",
    activity: "ruins",
    density: 0.3,
    radius: 4.2,
    height: [0.25, 0.88],
    footprint: [0.18, 0.38],
    palette: ["#464b49", "#5c625d", "#726e62", "#34484b"],
    roofPalette: ["#2d3f42", "#5d5750", "#234e55"],
    modules: ["Module_Aimian_Ruin", "Module_Stone_Arch"],
  },
  reshi: {
    id: "reshi",
    culture: "reshi",
    roof: "carapace",
    activity: "lake",
    density: 0.35,
    radius: 4.2,
    height: [0.2, 0.5],
    footprint: [0.25, 0.5],
    palette: ["#53674c", "#776d4a", "#4e5d46", "#887452"],
    roofPalette: ["#3c5e43", "#775445", "#b08b51"],
    modules: ["Module_Purelake_Jetty", "Module_Market_Stall"],
  },
};

const overrides: Record<string, Partial<CityProfile>> = {
  kharbranth: {
    id: "kharbranth",
    activity: "port",
    roof: "flat",
    density: 1.08,
    radius: 6.4,
    height: [0.34, 1.08],
    footprint: [0.18, 0.38],
    palette: ["#bd7654", "#c19548", "#4a8d8a", "#d0c3a5", "#9b5f65"],
    roofPalette: ["#2d7478", "#9c513c", "#b9843d", "#d0bd82"],
    modules: [
      "Module_Storm_Awning",
      "Module_Terraced_House",
      "Module_Stone_Arch",
      "Module_Market_Stall",
      "Module_Thaylen_Warehouse",
      "Module_Dock_Crane",
    ],
  },
  "shattered-plains": {
    id: "shattered-plains",
    activity: "warcamp",
    roof: "carapace",
    density: 0.64,
    radius: 4.4,
    height: [0.2, 0.46],
    footprint: [0.2, 0.45],
    palette: ["#403f3b", "#5a5147", "#6f6253", "#30383d"],
    roofPalette: ["#273f57", "#753a35", "#9b7440"],
    modules: [
      "Module_Rope_Bridge",
      "Module_Warcamp_Scaffold",
      "Module_Storm_Awning",
      "Module_Market_Stall",
    ],
  },
  urithiru: {
    id: "urithiru",
    activity: "tower",
    density: 0.52,
    radius: 4.2,
    height: [0.25, 0.6],
    modules: [
      "Module_Urithiru_Gallery",
      "Module_Stone_Arch",
      "Module_Market_Stall",
    ],
  },
  kholinar: {
    id: "kholinar",
    activity: "fortress",
    density: 1.02,
    radius: 4.8,
    modules: [
      "Module_Windbreak_House",
      "Module_Stone_Arch",
      "Module_Storm_Awning",
    ],
  },
  azir: {
    id: "azimir",
    density: 0.94,
    radius: 4.7,
  },
  purelake: {
    id: "purelake",
    density: 0.27,
    radius: 4.8,
    height: [0.16, 0.31],
    footprint: [0.28, 0.52],
    palette: ["#c1ac80", "#9c835e", "#d0c19b", "#8e7656"],
    roofPalette: ["#e0d8c2", "#c8bea6", "#aaa08c"],
    modules: ["Module_Purelake_Jetty", "Module_Market_Stall"],
  },
  shinovar: {
    id: "shinovar",
    density: 0.52,
    radius: 4.8,
  },
  aimia: {
    id: "akinah",
    density: 0.45,
    radius: 4.6,
    modules: ["Module_Aimian_Ruin", "Module_Stone_Arch"],
  },
  "thaylen-city": {
    id: "thaylen-city",
    density: 0.96,
    radius: 4.7,
    modules: [
      "Module_Thaylen_Warehouse",
      "Module_Dock_Crane",
      "Module_Market_Stall",
    ],
  },
};

export function cityProfile(locationId: string, culture: Culture): CityProfile {
  const base = genericProfiles[culture];
  return { ...base, ...(overrides[locationId] ?? {}) };
}
