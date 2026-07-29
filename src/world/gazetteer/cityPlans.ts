import {
  referencePixelToGazetteerWorld,
  sourceMapPixelToReferencePixel,
} from "./transform";
import type {
  GazetteerKind,
  GazetteerPlace,
  GazetteerSource,
  VisualizationArchetype,
} from "./types";

export const KHOLINAR_CITY_PLAN_SIZE = {
  width: 858,
  height: 1320,
} as const;

export const AZIMIR_CITY_PLAN_SIZE = {
  width: 600,
  height: 894,
} as const;

const KHOLINAR_REFERENCE_PIXEL = [1405, 540] as const;
const AZIMIR_REFERENCE_PIXEL = sourceMapPixelToReferencePixel([414.2, 331.3]);

const kholinarPlanSource: GazetteerSource = {
  title:
    "The Coppermind — Map of Kholinar (official Oathbringer interior map by Isaac Stewart)",
  url: "https://coppermind.net/wiki/File:Kholinar.jpg",
};

const kholinarSource: GazetteerSource = {
  title: "The Coppermind — Kholinar",
  url: "https://coppermind.net/wiki/Kholinar",
};

const kholinarPalaceSource: GazetteerSource = {
  title: "The Coppermind — Kholinar Palace",
  url: "https://coppermind.net/wiki/Kholinar_Palace",
};

const vorinismSource: GazetteerSource = {
  title: "The Coppermind — Vorinism and its devotaries",
  url: "https://coppermind.net/wiki/Vorinism",
};

const impossibleFallsSource: GazetteerSource = {
  title: "The Coppermind — Impossible Falls",
  url: "https://coppermind.net/wiki/Impossible_Falls",
};

const azimirPlanSource: GazetteerSource = {
  title:
    "The Coppermind — Plan of the City of Azimir (official Wind and Truth interior map by Isaac Stewart)",
  url: "https://coppermind.net/wiki/File:Plan_of_the_City_of_Azimir.jpg",
};

const azimirSource: GazetteerSource = {
  title: "The Coppermind — Azimir",
  url: "https://coppermind.net/wiki/Azimir",
};

const bronzePalaceSource: GazetteerSource = {
  title: "The Coppermind — Bronze Palace",
  url: "https://coppermind.net/wiki/Bronze_Palace",
};

const battleOfAzimirSource: GazetteerSource = {
  title: "The Coppermind — Battle of Azimir",
  url: "https://coppermind.net/wiki/Battle_of_Azimir",
};

const thunderclastSource: GazetteerSource = {
  title: "The Coppermind — Thunderclast",
  url: "https://coppermind.net/wiki/Thunderclast",
};

interface CityPlanPlaceInput {
  id: string;
  canonicalName: string;
  kind: GazetteerKind;
  visualization: VisualizationArchetype;
  pixel: readonly [number, number];
  alternateNames?: readonly string[];
  sources?: readonly GazetteerSource[];
}

function kholinarPlace(input: CityPlanPlaceInput): GazetteerPlace {
  return {
    id: input.id,
    canonicalName: input.canonicalName,
    parentLocationId: "kholinar",
    kind: input.kind,
    nationOrRegion: "Kholinar, Alethkar",
    certainty: "regional",
    minimumLod: "street",
    visualization: input.visualization,
    sourceMapPixel: null,
    referencePixel: KHOLINAR_REFERENCE_PIXEL,
    world: referencePixelToGazetteerWorld(KHOLINAR_REFERENCE_PIXEL),
    placementReference: {
      mapId: "kholinar-city-plan",
      title:
        "Map of Kholinar — supplied 858 × 1320 rendering of Isaac Stewart's official Oathbringer plan",
      pixel: input.pixel,
      size: KHOLINAR_CITY_PLAN_SIZE,
    },
    renderable: true,
    alternateNames: input.alternateNames,
    sources: [kholinarPlanSource, kholinarSource, ...(input.sources ?? [])],
  };
}

function azimirPlace(input: CityPlanPlaceInput): GazetteerPlace {
  return {
    id: input.id,
    canonicalName: input.canonicalName,
    parentLocationId: "azir",
    kind: input.kind,
    nationOrRegion: "Azimir, Azir",
    certainty: "regional",
    minimumLod: "street",
    visualization: input.visualization,
    sourceMapPixel: null,
    referencePixel: AZIMIR_REFERENCE_PIXEL,
    world: referencePixelToGazetteerWorld(AZIMIR_REFERENCE_PIXEL),
    placementReference: {
      mapId: "azimir-city-plan",
      title:
        "Plan of the City of Azimir — supplied 600 × 894 rendering of Isaac Stewart's official Wind and Truth plan",
      pixel: input.pixel,
      size: AZIMIR_CITY_PLAN_SIZE,
    },
    renderable: true,
    alternateNames: input.alternateNames,
    sources: [azimirPlanSource, azimirSource, ...(input.sources ?? [])],
  };
}

export const kholinarCityPlanGazetteer: readonly GazetteerPlace[] = [
  kholinarPlace({
    id: "kholinar-monastery-dais",
    canonicalName: "Monastery Dais",
    kind: "institution",
    visualization: "monastery",
    pixel: [353, 756],
    sources: [kholinarPalaceSource],
  }),
  kholinarPlace({
    id: "kholinar-market-row",
    canonicalName: "Market Row",
    kind: "landmark",
    visualization: "market-city",
    pixel: [429, 606],
  }),
  kholinarPlace({
    id: "kholinar-dueling-arena",
    canonicalName: "Dueling Arena",
    kind: "institution",
    visualization: "warcamp",
    pixel: [430, 508],
  }),
  kholinarPlace({
    id: "kholinar-theater-square",
    canonicalName: "Theater Square",
    kind: "landmark",
    visualization: "market-city",
    pixel: [236, 430],
  }),
  kholinarPlace({
    id: "kholinar-sunmaker-park",
    canonicalName: "Sunmaker Park",
    kind: "landmark",
    visualization: "rock-formation",
    pixel: [511, 791],
  }),
  kholinarPlace({
    id: "kholinar-lanacin-monument",
    canonicalName: "Lanacin Monument",
    kind: "landmark",
    visualization: "rock-formation",
    pixel: [682, 443],
  }),
  kholinarPlace({
    id: "kholinar-devotary-of-insight",
    canonicalName: "Devotary of Insight",
    kind: "institution",
    visualization: "monastery",
    pixel: [447, 526],
    sources: [vorinismSource],
  }),
  kholinarPlace({
    id: "kholinar-impossible-falls",
    canonicalName: "Impossible Falls",
    kind: "landmark",
    visualization: "rock-formation",
    pixel: [708, 392],
    sources: [impossibleFallsSource],
  }),
  kholinarPlace({
    id: "kholinar-order-of-talenelat",
    canonicalName: "Order of Talenelat",
    kind: "institution",
    visualization: "monastery",
    pixel: [628, 648],
    sources: [vorinismSource],
  }),
  kholinarPlace({
    id: "kholinar-temple-jezerezeh",
    canonicalName: "Temple of Jezerezeh",
    kind: "institution",
    visualization: "monastery",
    pixel: [382, 357],
  }),
  kholinarPlace({
    id: "kholinar-temple-nalan",
    canonicalName: "Temple of Nalan",
    kind: "institution",
    visualization: "monastery",
    pixel: [718, 486],
  }),
  kholinarPlace({
    id: "kholinar-temple-chanaranach",
    canonicalName: "Temple of Chanaranach",
    kind: "institution",
    visualization: "monastery",
    pixel: [428, 374],
  }),
  kholinarPlace({
    id: "kholinar-temple-vedeledev",
    canonicalName: "Temple of Vedeledev",
    kind: "institution",
    visualization: "monastery",
    pixel: [579, 607],
  }),
  kholinarPlace({
    id: "kholinar-temple-pailiah",
    canonicalName: "Temple of Pailiah",
    kind: "institution",
    visualization: "monastery",
    pixel: [396, 406],
  }),
  kholinarPlace({
    id: "kholinar-temple-shalash",
    canonicalName: "Temple of Shalash",
    kind: "institution",
    visualization: "monastery",
    pixel: [258, 447],
  }),
  kholinarPlace({
    id: "kholinar-temple-battah",
    canonicalName: "Temple of Battah",
    kind: "institution",
    visualization: "monastery",
    pixel: [500, 646],
  }),
  kholinarPlace({
    id: "kholinar-temple-kelek",
    canonicalName: "Temple of Kelek",
    kind: "institution",
    visualization: "monastery",
    pixel: [382, 488],
  }),
  kholinarPlace({
    id: "kholinar-temple-talenelat",
    canonicalName: "Temple of Talenelat",
    kind: "institution",
    visualization: "monastery",
    pixel: [637, 635],
  }),
  kholinarPlace({
    id: "kholinar-temple-ishi",
    canonicalName: "Temple of Ishi",
    kind: "institution",
    visualization: "monastery",
    pixel: [523, 760],
  }),
];

export const azimirCityPlanGazetteer: readonly GazetteerPlace[] = [
  azimirPlace({
    id: "azimir-bronze-palace",
    canonicalName: "Bronze Palace",
    kind: "institution",
    visualization: "palace",
    pixel: [306, 384],
    sources: [bronzePalaceSource],
  }),
  azimirPlace({
    id: "azimir-grand-market",
    canonicalName: "Grand Market",
    kind: "institution",
    visualization: "market-city",
    pixel: [354, 473],
  }),
  azimirPlace({
    id: "azimir-hospital",
    canonicalName: "Azimir Hospital",
    kind: "institution",
    visualization: "hospital",
    pixel: [386, 489],
    alternateNames: ["Hospital"],
  }),
  azimirPlace({
    id: "azimir-watchpost-tower",
    canonicalName: "Watchpost Tower",
    kind: "landmark",
    visualization: "warcamp",
    pixel: [311, 519],
  }),
  azimirPlace({
    id: "azimir-path-of-the-thunderclast",
    canonicalName: "Path of the Thunderclast",
    kind: "landmark",
    visualization: "processional-way",
    pixel: [151, 544],
    sources: [battleOfAzimirSource, thunderclastSource],
  }),
];

export const cityPlanGazetteer: readonly GazetteerPlace[] = [
  ...kholinarCityPlanGazetteer,
  ...azimirCityPlanGazetteer,
];
