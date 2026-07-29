import {
  countryLabelAnchors,
  referencePixelToWorld,
  type GeographyPoint,
} from "./geography";

export type FrontierKind = "national" | "disputed" | "porous";

export interface Frontier {
  id: string;
  countries: readonly [string, string];
  kind: FrontierKind;
  points: readonly GeographyPoint[];
}

export interface CountryLabel {
  id: string;
  name: string;
  position: GeographyPoint;
  locationId?: string;
  emphasis?: "major" | "minor";
}

function referenceFrontier(
  pixels: readonly (readonly [number, number])[],
): readonly GeographyPoint[] {
  return pixels.map(referencePixelToWorld);
}

/**
 * Political lines follow the dotted/red boundaries of the project-owner-supplied
 * reference map. Borders that track a broad mountain watershed remain marked
 * porous rather than pretending to be physical walls.
 */
export const frontiers: readonly Frontier[] = [
  {
    id: "shinovar-iri",
    countries: ["Shinovar", "Iri"],
    kind: "porous",
    points: referenceFrontier([
      [430, 355],
      [420, 455],
      [425, 555],
      [440, 655],
      [465, 750],
    ]),
  },
  {
    id: "iri-babatharnam",
    countries: ["Iri", "Babatharnam"],
    kind: "national",
    points: referenceFrontier([
      [475, 430],
      [535, 445],
      [600, 448],
      [665, 458],
      [720, 482],
    ]),
  },
  {
    id: "babatharnam-azir",
    countries: ["Babatharnam", "Azir"],
    kind: "national",
    points: referenceFrontier([
      [670, 500],
      [680, 545],
      [675, 585],
      [660, 625],
    ]),
  },
  {
    id: "azir-yezier",
    countries: ["Azir", "Yezier"],
    kind: "disputed",
    points: referenceFrontier([
      [505, 675],
      [545, 705],
      [590, 725],
      [640, 732],
      [690, 725],
    ]),
  },
  {
    id: "azir-emul",
    countries: ["Azir", "Emul"],
    kind: "national",
    points: referenceFrontier([
      [690, 725],
      [730, 745],
      [765, 780],
      [800, 815],
    ]),
  },
  {
    id: "tashikk-tukar",
    countries: ["Tashikk", "Tukar"],
    kind: "national",
    points: referenceFrontier([
      [530, 810],
      [575, 825],
      [620, 840],
      [665, 870],
    ]),
  },
  {
    id: "emul-tukar",
    countries: ["Emul", "Tukar"],
    kind: "disputed",
    points: referenceFrontier([
      [735, 775],
      [730, 820],
      [745, 865],
      [775, 905],
    ]),
  },
  {
    id: "tu-bayla-jah-keved",
    countries: ["Tu Bayla", "Jah Keved"],
    kind: "national",
    points: referenceFrontier([
      [1055, 510],
      [1065, 555],
      [1070, 605],
      [1080, 655],
      [1095, 700],
    ]),
  },
  {
    id: "jah-keved-azir",
    countries: ["Jah Keved", "Azir"],
    kind: "porous",
    points: referenceFrontier([
      [930, 600],
      [920, 650],
      [925, 700],
      [945, 750],
      [975, 800],
    ]),
  },
  {
    id: "jah-keved-alethkar",
    countries: ["Jah Keved", "Alethkar"],
    kind: "national",
    points: referenceFrontier([
      [1345, 420],
      [1330, 500],
      [1310, 585],
      [1290, 675],
      [1305, 760],
      [1340, 805],
    ]),
  },
  {
    id: "jah-keved-herdaz",
    countries: ["Jah Keved", "Herdaz"],
    kind: "porous",
    points: referenceFrontier([
      [1245, 410],
      [1280, 405],
      [1315, 415],
      [1345, 430],
    ]),
  },
  {
    id: "herdaz-alethkar",
    countries: ["Herdaz", "Alethkar"],
    kind: "disputed",
    points: referenceFrontier([
      [1365, 360],
      [1370, 390],
      [1365, 420],
      [1345, 450],
    ]),
  },
  {
    id: "alethkar-unclaimed",
    countries: ["Alethkar", "Unclaimed Hills"],
    kind: "disputed",
    points: referenceFrontier([
      [1640, 455],
      [1625, 525],
      [1635, 600],
      [1655, 670],
      [1680, 740],
    ]),
  },
  {
    id: "alethkar-frostlands",
    countries: ["Alethkar", "Frostlands"],
    kind: "national",
    points: referenceFrontier([
      [1295, 805],
      [1360, 820],
      [1430, 825],
      [1505, 820],
      [1580, 815],
    ]),
  },
  {
    id: "emul-marat",
    countries: ["Emul", "Marat"],
    kind: "national",
    points: referenceFrontier([
      [870, 790],
      [910, 820],
      [950, 850],
      [1000, 880],
    ]),
  },
  {
    id: "marat-thaylenah",
    countries: ["Marat", "Thaylenah"],
    kind: "porous",
    points: referenceFrontier([
      [1000, 880],
      [1045, 900],
      [1090, 920],
      [1140, 940],
    ]),
  },
] as const;

export const countryLabels: readonly CountryLabel[] = [
  {
    id: "shinovar",
    name: "Shinovar",
    position: countryLabelAnchors.shinovar,
    locationId: "shinovar",
    emphasis: "major",
  },
  {
    id: "iri",
    name: "Iri",
    position: countryLabelAnchors.iri,
    emphasis: "major",
  },
  {
    id: "azir",
    name: "Azir",
    position: countryLabelAnchors.azir,
    locationId: "azir",
    emphasis: "major",
  },
  {
    id: "tashikk",
    name: "Tashikk",
    position: countryLabelAnchors.tashikk,
    emphasis: "minor",
  },
  {
    id: "tukar",
    name: "Tukar",
    position: countryLabelAnchors.tukar,
    emphasis: "minor",
  },
  {
    id: "emul",
    name: "Emul",
    position: countryLabelAnchors.emul,
    emphasis: "minor",
  },
  {
    id: "tu-bayla",
    name: "Tu Bayla",
    position: countryLabelAnchors["tu-bayla"],
    emphasis: "minor",
  },
  {
    id: "jah-keved",
    name: "Jah Keved",
    position: countryLabelAnchors["jah-keved"],
    locationId: "jah-keved",
    emphasis: "major",
  },
  {
    id: "alethkar",
    name: "Alethkar",
    position: countryLabelAnchors.alethkar,
    locationId: "alethkar",
    emphasis: "major",
  },
  {
    id: "herdaz",
    name: "Herdaz",
    position: countryLabelAnchors.herdaz,
    emphasis: "minor",
  },
  {
    id: "thaylenah",
    name: "Thaylenah",
    position: countryLabelAnchors.thaylenah,
    locationId: "thaylen-city",
    emphasis: "major",
  },
  {
    id: "frostlands",
    name: "Frostlands",
    position: countryLabelAnchors.frostlands,
    emphasis: "minor",
  },
] as const;

export const frontierStyle: Record<
  FrontierKind,
  {
    color: string;
    haloColor: string;
    haloOpacity: number;
    opacity: number;
    dashSize: number;
    gapSize: number;
    lineWidth: number;
  }
> = {
  national: {
    color: "#dc805d",
    haloColor: "#241b17",
    haloOpacity: 0.54,
    opacity: 0.94,
    dashSize: 0,
    gapSize: 0,
    lineWidth: 1.88,
  },
  disputed: {
    color: "#efbc6b",
    haloColor: "#281817",
    haloOpacity: 0.58,
    opacity: 0.95,
    dashSize: 0.55,
    gapSize: 0.24,
    lineWidth: 1.62,
  },
  porous: {
    color: "#bbc991",
    haloColor: "#19201a",
    haloOpacity: 0.5,
    opacity: 0.82,
    dashSize: 0.22,
    gapSize: 0.42,
    lineWidth: 1.22,
  },
};
