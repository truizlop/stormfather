export type DetailLevel = "continent" | "region" | "city" | "street";

export type Culture =
  | "alethi"
  | "azish"
  | "shin"
  | "veden"
  | "singer"
  | "thaylen"
  | "purelaker"
  | "aimian"
  | "reshi";

export type LocationKind =
  | "continent"
  | "nation"
  | "city"
  | "landmark"
  | "lake"
  | "island"
  | "storm";

export interface WorldLocation {
  id: string;
  name: string;
  subtitle: string;
  kind: LocationKind;
  coordinates: { x: number; z: number };
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  arrivalDetail: DetailLevel;
  regionColor: string;
  accentColor: string;
  description: string;
  facts: readonly string[];
  culture: Culture;
  modelRoot?: string;
  population: number;
  activity: string;
}

export interface EasterEgg {
  id: string;
  coordinates: { x: number; z: number };
  height: number;
  title: string;
  message: string;
}
