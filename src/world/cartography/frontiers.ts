export type FrontierKind = "national" | "disputed" | "porous";

export interface Frontier {
  id: string;
  countries: readonly [string, string];
  kind: FrontierKind;
  points: readonly (readonly [number, number])[];
}

export interface CountryLabel {
  id: string;
  name: string;
  position: readonly [number, number];
  locationId?: string;
  emphasis?: "major" | "minor";
}

/**
 * Stylized map-space frontiers derived from the broad adjacencies on the supplied
 * Roshar reference map. They intentionally communicate political geography rather
 * than claiming survey-grade precision: Rosharan control changes, and several
 * edges follow mountains, watersheds, or sparsely governed land.
 */
export const frontiers: readonly Frontier[] = [
  {
    id: "shinovar-iri",
    countries: ["Shinovar", "Iri"],
    kind: "porous",
    points: [
      [-27, -11],
      [-26.2, -7],
      [-27, -2],
      [-27.6, 3],
      [-29.6, 8],
      [-32, 13.2],
    ],
  },
  {
    id: "iri-babatharnam",
    countries: ["Iri", "Babatharnam"],
    kind: "national",
    points: [
      [-29, -5.6],
      [-25, -3.2],
      [-21, -2.8],
      [-17.5, -1.3],
    ],
  },
  {
    id: "babatharnam-azir",
    countries: ["Babatharnam", "Azir"],
    kind: "national",
    points: [
      [-18, -1],
      [-18.4, 2.5],
      [-16.8, 5.4],
      [-15.5, 8],
    ],
  },
  {
    id: "azir-yezier",
    countries: ["Azir", "Yezier"],
    kind: "disputed",
    points: [
      [-18.7, 8.5],
      [-15.3, 10.5],
      [-12, 11],
      [-9, 10.3],
    ],
  },
  {
    id: "azir-emul",
    countries: ["Azir", "Emul"],
    kind: "national",
    points: [
      [-8.8, 9.8],
      [-5.7, 9.2],
      [-3, 10.5],
      [0.2, 12.7],
    ],
  },
  {
    id: "tashikk-tukar",
    countries: ["Tashikk", "Tukar"],
    kind: "national",
    points: [
      [-16, 15.3],
      [-12, 15],
      [-8.5, 16.1],
      [-5.5, 19.1],
    ],
  },
  {
    id: "emul-tukar",
    countries: ["Emul", "Tukar"],
    kind: "disputed",
    points: [
      [-5.3, 12],
      [-4.6, 15.4],
      [-3, 18.8],
      [0.4, 21],
    ],
  },
  {
    id: "tu-bayla-jah-keved",
    countries: ["Tu Bayla", "Jah Keved"],
    kind: "national",
    points: [
      [2.5, -9.6],
      [5.2, -7.3],
      [8.5, -6.2],
      [12.2, -5.4],
      [17.2, -5.4],
    ],
  },
  {
    id: "jah-keved-azir",
    countries: ["Jah Keved", "Azir"],
    kind: "porous",
    points: [
      [2, -7.8],
      [2.7, -3.2],
      [3.6, 1],
      [5.2, 5.7],
      [7.8, 10.8],
    ],
  },
  {
    id: "jah-keved-alethkar",
    countries: ["Jah Keved", "Alethkar"],
    kind: "national",
    points: [
      [18.4, -7],
      [18.9, -3],
      [20, 1.2],
      [21.6, 5.2],
      [24, 9.6],
    ],
  },
  {
    id: "jah-keved-herdaz",
    countries: ["Jah Keved", "Herdaz"],
    kind: "porous",
    points: [
      [16.5, -12.2],
      [20.5, -11.6],
      [24.5, -10.2],
      [27, -8],
    ],
  },
  {
    id: "herdaz-alethkar",
    countries: ["Herdaz", "Alethkar"],
    kind: "disputed",
    points: [
      [27, -8],
      [29.5, -6],
      [31.4, -3.8],
      [33, -0.8],
    ],
  },
  {
    id: "alethkar-unclaimed",
    countries: ["Alethkar", "Unclaimed Hills"],
    kind: "disputed",
    points: [
      [38.2, -6.8],
      [37.8, -2.5],
      [38.7, 1],
      [40.4, 4.4],
      [41, 8.5],
    ],
  },
  {
    id: "alethkar-frostlands",
    countries: ["Alethkar", "Frostlands"],
    kind: "national",
    points: [
      [24.5, 10],
      [28.5, 11.8],
      [33, 12.4],
      [37.8, 13.2],
    ],
  },
  {
    id: "emul-marat",
    countries: ["Emul", "Marat"],
    kind: "national",
    points: [
      [1, 14],
      [4.8, 15.2],
      [7.8, 18],
      [9.5, 21.5],
    ],
  },
  {
    id: "marat-thaylenah",
    countries: ["Marat", "Thaylenah"],
    kind: "porous",
    points: [
      [9.5, 21.5],
      [13.5, 21.2],
      [17.5, 21.5],
      [21, 22.7],
    ],
  },
] as const;

export const countryLabels: readonly CountryLabel[] = [
  {
    id: "shinovar",
    name: "Shinovar",
    position: [-36, 2],
    locationId: "shinovar",
    emphasis: "major",
  },
  { id: "iri", name: "Iri", position: [-29, -8], emphasis: "major" },
  {
    id: "azir",
    name: "Azir",
    position: [-12, 7],
    locationId: "azir",
    emphasis: "major",
  },
  { id: "tashikk", name: "Tashikk", position: [-13, 15], emphasis: "minor" },
  { id: "tukar", name: "Tukar", position: [-4, 20], emphasis: "minor" },
  { id: "emul", name: "Emul", position: [-2, 12.5], emphasis: "minor" },
  { id: "tu-bayla", name: "Tu Bayla", position: [1, -8], emphasis: "minor" },
  {
    id: "jah-keved",
    name: "Jah Keved",
    position: [10, -1.5],
    locationId: "jah-keved",
    emphasis: "major",
  },
  {
    id: "alethkar",
    name: "Alethkar",
    position: [29, 1],
    locationId: "alethkar",
    emphasis: "major",
  },
  { id: "herdaz", name: "Herdaz", position: [27, -12], emphasis: "minor" },
  {
    id: "thaylenah",
    name: "Thaylenah",
    position: [18, 23],
    locationId: "thaylen-city",
    emphasis: "major",
  },
  { id: "frostlands", name: "Frostlands", position: [31, 18], emphasis: "minor" },
] as const;

export const frontierStyle: Record<
  FrontierKind,
  {
    color: string;
    opacity: number;
    dashSize: number;
    gapSize: number;
    lineWidth: number;
  }
> = {
  national: {
    color: "#d2b26f",
    opacity: 0.82,
    dashSize: 0,
    gapSize: 0,
    lineWidth: 1.05,
  },
  disputed: {
    color: "#e18b63",
    opacity: 0.9,
    dashSize: 0.55,
    gapSize: 0.24,
    lineWidth: 1.22,
  },
  porous: {
    color: "#a8b77a",
    opacity: 0.7,
    dashSize: 0.22,
    gapSize: 0.42,
    lineWidth: 0.92,
  },
};
