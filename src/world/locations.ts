import type { EasterEgg, WorldLocation } from "./types";
import {
  destinationAnchors,
  detailedLocationAnchors,
} from "./cartography/geography";

function coordinateFor(id: keyof typeof destinationAnchors) {
  const detailAnchor =
    id in detailedLocationAnchors
      ? detailedLocationAnchors[
          id as keyof typeof detailedLocationAnchors
        ]
      : undefined;
  const [x, z] = detailAnchor ?? destinationAnchors[id];
  return { x, z };
}

const locationData = [
  {
    id: "roshar",
    name: "Roshar",
    subtitle: "The storm-shaped continent",
    kind: "continent",
    coordinates: coordinateFor("roshar"),
    camera: { position: [-2, 100, 78], target: [-2, 0, 0] },
    arrivalDetail: "continent",
    regionColor: "#59654d",
    accentColor: "#caaa6b",
    description:
      "A continent of stone, shallow seas, mountain shelters and living ecologies shaped by storms.",
    facts: [
      "Southern hemisphere",
      "Highstorms travel east to west",
      "Flora and cities shelter from the wind",
    ],
    culture: "alethi",
    population: 8_400_000,
    activity: "Continental trade",
  },
  {
    id: "alethkar",
    name: "Alethkar",
    subtitle: "The eastern highkingdom",
    kind: "nation",
    coordinates: coordinateFor("alethkar"),
    camera: { position: [45, 28, 28], target: [34, 1, 0] },
    arrivalDetail: "region",
    regionColor: "#6b6345",
    accentColor: "#d7aa4f",
    description:
      "A vast eastern nation of fortified lait cities, windward walls and caravan roads.",
    facts: ["Capital: Kholinar", "Vorin kingdoms", "Storm-facing fortifications"],
    culture: "alethi",
    population: 2_120_000,
    activity: "Caravans on the kingways",
  },
  {
    id: "azir",
    name: "Azir",
    subtitle: "Heart of the Makabaki kingdoms",
    kind: "nation",
    coordinates: coordinateFor("azir"),
    camera: {
      position: [-7.95, 22, 29.74],
      target: [-19.07, 1, 8.86],
    },
    arrivalDetail: "city",
    regionColor: "#8d6335",
    accentColor: "#e0b05c",
    description:
      "An orderly realm of civic courts, public records, domed halls and exacting administration.",
    facts: ["Capital: Azimir", "Imperial bureaucracy", "Domed civic architecture"],
    culture: "azish",
    modelRoot: "Landmark_Azimir",
    population: 810_000,
    activity: "Petitions and markets",
  },
  {
    id: "shattered-plains",
    name: "Shattered Plains",
    subtitle: "Cymatic chasms of Natanatan",
    kind: "landmark",
    coordinates: coordinateFor("shattered-plains"),
    // Frame the complete cymatic field around Stormseat. The previous
    // warcamp-biased target cropped the eastern plateaus behind the travel
    // panel and made the old chasm-floor presentation disk dominate.
    camera: {
      position: [50.5, 11, 3],
      target: [40, 1.55, 13.76],
    },
    arrivalDetail: "city",
    regionColor: "#504a3e",
    accentColor: "#6ee6f2",
    description:
      "Four-fold patterns of plateaus and flooded chasms radiate around the ruins of Stormseat.",
    facts: ["Central ruins: Stormseat", "Warcamps to the west", "Chasms deepen eastward"],
    culture: "singer",
    modelRoot: "Landmark_Shattered_Plains",
    population: 7_350,
    activity: "Bridges, scouts and chasm patrols",
  },
  {
    id: "urithiru",
    name: "Urithiru",
    subtitle: "The tower above the storms",
    kind: "city",
    coordinates: coordinateFor("urithiru"),
    // The east-elevation hero view is wide enough to keep the whole mountain
    // city in frame; the selected-city semantic override keeps the authored
    // ten-stratum model active instead of substituting its proxy silhouette.
    camera: { position: [8.5, 19.5, 9.5], target: [-7.3, 8.5, 6.4] },
    arrivalDetail: "city",
    regionColor: "#575a59",
    accentColor: "#7ee7ed",
    description:
      "A terraced tower-city built into the mountains, linked to ten distant destinations by local Oathgate portals.",
    facts: [
      "Layered stone strata",
      "Ten destination-labelled Oathgates",
      "Sheltered above the storms",
    ],
    culture: "alethi",
    modelRoot: "Landmark_Urithiru",
    population: 42_000,
    activity: "Oathgate arrivals",
  },
  {
    id: "shinovar",
    name: "Shinovar",
    subtitle: "The sheltered western valleys",
    kind: "nation",
    coordinates: coordinateFor("shinovar"),
    camera: { position: [-29, 18, 17], target: [-39, 1, -2.5] },
    arrivalDetail: "city",
    regionColor: "#3f6c32",
    accentColor: "#9ecb69",
    description:
      "Mountains shelter soft soil, grass, farms and upright trees unfamiliar to eastern Roshar.",
    facts: ["Soil and conventional grass", "Earthen buildings", "Highstorms arrive weakened"],
    culture: "shin",
    modelRoot: "Landmark_Shinovar",
    population: 340_000,
    activity: "Farms and village roads",
  },
  {
    id: "jah-keved",
    name: "Jah Keved",
    subtitle: "Valleys beneath the Horneater Peaks",
    kind: "nation",
    coordinates: coordinateFor("jah-keved"),
    camera: { position: [24, 24, 17], target: [14, 1, -4] },
    arrivalDetail: "region",
    regionColor: "#756b43",
    accentColor: "#d39c62",
    description:
      "A broad Veden kingdom of river valleys, estates and mountain passes west of Alethkar.",
    facts: ["Capital: Vedenar", "Horneater Peaks", "River estates and vineyards"],
    culture: "veden",
    population: 1_350_000,
    activity: "River trade",
  },
  {
    id: "purelake",
    name: "Purelake",
    subtitle: "The warm inland shallows",
    kind: "lake",
    coordinates: coordinateFor("purelake"),
    camera: { position: [0, 14, 10], target: [-9.6, 0.2, -3.8] },
    arrivalDetail: "city",
    regionColor: "#2f777b",
    accentColor: "#72dadd",
    description:
      "Warm crystal-clear water, usually only calf-deep, surrounds rafts and rockbud-like villages.",
    facts: ["Water drains before storms", "Domed homes on low stilts", "Spren-bonded fish"],
    culture: "purelaker",
    modelRoot: "Landmark_Purelake",
    population: 28_000,
    activity: "Fishing rafts on the shallows",
  },
  {
    id: "aimia",
    name: "Aimia",
    subtitle: "The scoured western isles",
    kind: "island",
    coordinates: coordinateFor("aimia"),
    camera: {
      position: [-43.72, 19, 20.96],
      target: [-53.44, 3.6, 6.4],
    },
    arrivalDetail: "city",
    regionColor: "#3f4f55",
    accentColor: "#8bd3dc",
    description:
      "Cold, barren islands and storm-wrapped ruins lie beyond the Aimian Sea.",
    facts: ["Akinah's undersea caverns", "Soulcast defensive spikes", "Ruins after the Scouring"],
    culture: "aimian",
    modelRoot: "Landmark_Akinah",
    population: 18,
    activity: "A watchful silence",
  },
  {
    id: "kharbranth",
    name: "Kharbranth",
    subtitle: "The City of Bells",
    kind: "city",
    coordinates: coordinateFor("kharbranth"),
    camera: { position: [0, 13.5, 31.5], target: [10.2, 2.8, 18.4] },
    arrivalDetail: "street",
    regionColor: "#426268",
    accentColor: "#dcb66d",
    description:
      "Color-coded buildings climb the Ralinsa's switchbacks from a sheltered natural harbor.",
    facts: ["The Palanaeum", "Bells throughout the city", "Renowned hospitals"],
    culture: "alethi",
    modelRoot: "Landmark_Kharbranth",
    population: 125_000,
    activity: "Crowded docks and night markets",
  },
  {
    id: "kholinar",
    name: "Kholinar",
    subtitle: "The city of windblades",
    kind: "city",
    coordinates: coordinateFor("kholinar"),
    camera: { position: [37, 14, 10], target: [29, 1, -4] },
    arrivalDetail: "street",
    regionColor: "#65533b",
    accentColor: "#d7aa4f",
    description:
      "Alethkar's capital fills three ravine-separated wards behind stormward walls, centered on the palace and its Sunwalk.",
    facts: [
      "The Sunwalk and Monastery Dais",
      "Ten temple precincts",
      "The Impossible Falls",
    ],
    culture: "alethi",
    modelRoot: "Landmark_Kholinar",
    population: 280_000,
    activity: "Markets beneath the windblades",
  },
  {
    id: "thaylen-city",
    name: "Thaylen City",
    subtitle: "Harbor of merchants",
    kind: "city",
    coordinates: coordinateFor("thaylen-city"),
    camera: { position: [18, 17, 35], target: [9, 1, 24] },
    arrivalDetail: "city",
    regionColor: "#4f615c",
    accentColor: "#bcaa84",
    description:
      "A southern mercantile port built around sheltered water and far-reaching trade.",
    facts: ["Thaylenah", "Ocean trade", "Merchant fleets"],
    culture: "thaylen",
    modelRoot: "Landmark_ThaylenCity",
    population: 95_000,
    activity: "Ships entering harbor",
  },
] as const satisfies readonly WorldLocation[];

export type LocationId = (typeof locationData)[number]["id"];

export const locations: readonly WorldLocation[] = locationData;

export const travelLocations = locations.slice(0, 10);
export const secondaryLocations = locations.slice(10);

export const locationById = new Map<string, WorldLocation>(
  locations.map((location) => [location.id, location]),
);

export const easterEggs: readonly EasterEgg[] = [
  {
    id: "wandersail",
    coordinates: { x: -15, z: -22 },
    height: 0.5,
    title: "A peculiar ship",
    message: "A weathered sail points toward islands that may not be islands at all.",
  },
  {
    id: "flute",
    coordinates: { x: 30, z: -4 },
    height: 1.4,
    title: "A forgotten flute",
    message: "Someone very old is going to be annoyed about this.",
  },
  {
    id: "stick",
    coordinates: { x: 14, z: -4 },
    height: 0.8,
    title: "A remarkably stubborn stick",
    message: "It remains, emphatically, a stick.",
  },
  {
    id: "chicken",
    coordinates: { x: 10, z: 24 },
    height: 0.9,
    title: "An unusual chicken",
    message: "Locals insist every bird is a chicken. This one looks unconvinced.",
  },
  {
    id: "bridge-four",
    coordinates: { x: 40.2, z: 14.4 },
    height: 0.7,
    title: "Four scratched glyphs",
    message: "The mark is small, but the chasm wind seems to salute it.",
  },
  {
    id: "cremling",
    coordinates: { x: -55.2, z: 5.8 },
    height: 0.65,
    title: "One cremling too many",
    message: "For a heartbeat, the swarm appears to look back.",
  },
  {
    id: "black-sand",
    coordinates: { x: -21.8, z: 5.8 },
    height: 0.65,
    title: "Black sand in a brass vial",
    message: "The grains lean toward something you cannot see.",
  },
  {
    id: "pancake",
    coordinates: { x: -9.2, z: -3.5 },
    height: 0.7,
    title: "A suspiciously perfect pancake",
    message: "Lift would approve. Probably.",
  },
  {
    id: "sword-nimi",
    coordinates: { x: -38.8, z: -2.1 },
    height: 0.75,
    title: "A talkative-looking scabbard",
    message: "The safest choice is to keep walking.",
  },
  {
    id: "worldhopper",
    coordinates: { x: -7.1, z: 6.7 },
    height: 2.1,
    title: "The wrong kind of coin",
    message: "Its face belongs to no Rosharan ruler.",
  },
];
