import { referencePixelToGazetteerWorld } from "./transform";
import { defaultGazetteerCategory } from "./types";
import type {
  GazetteerKind,
  GazetteerPlace,
  GazetteerSource,
  VisualizationArchetype,
} from "./types";

export const SHINOVAR_MONASTERIES_MAP_ID = "shinovar-monasteries";

/**
 * Dimensions of the user-supplied rendering of Isaac Stewart's official
 * Wind and Truth interior map. The original published map is 1347 × 2048.
 */
export const SHINOVAR_MONASTERIES_REFERENCE_SIZE = {
  width: 600,
  height: 932,
} as const;

export const SHINOVAR_MONASTERIES_MAP_URL =
  "https://coppermind.net/wiki/File:Map_of_Shin_Monasteries.jpg";

const shinovarMapSource: GazetteerSource = {
  title:
    "Isaac Stewart — Map of the Shin Monasteries (Wind and Truth interior art)",
  url: SHINOVAR_MONASTERIES_MAP_URL,
};

const monasteriesSource: GazetteerSource = {
  title: "The Coppermind — Monastery of Truth",
  url: "https://coppermind.net/wiki/Monastery_of_Truth",
};

function coppermindSource(slug: string, title: string): GazetteerSource {
  return {
    title: `The Coppermind — ${title}`,
    url: `https://coppermind.net/wiki/${slug}`,
  };
}

/**
 * Approximate registration of the supplied Shinovar inset into the project's
 * 1889 × 1144 Roshar reference. The inset has no shared control points or
 * surveyed scale, so every result is deliberately catalogued as `regional`.
 * Its original inset pixel is retained on each place for faithful local layout.
 */
export function shinovarMapPixelToReferencePixel(
  pixel: readonly [number, number],
): readonly [number, number] {
  return [310 + pixel[0] * 0.43, 280 + pixel[1] * 0.52];
}

interface ShinovarPlaceInput {
  id: string;
  canonicalName: string;
  kind: GazetteerKind;
  visualization: VisualizationArchetype;
  localPixel: readonly [number, number];
  coppermindSlug: string;
  nationOrRegion?: string;
}

function shinovarPlace(input: ShinovarPlaceInput): GazetteerPlace {
  const referencePixel = shinovarMapPixelToReferencePixel(input.localPixel);
  return {
    id: input.id,
    canonicalName: input.canonicalName,
    parentLocationId: "shinovar",
    kind: input.kind,
    category: defaultGazetteerCategory(input.kind),
    nationOrRegion: input.nationOrRegion ?? "Shinovar",
    certainty: "regional",
    minimumLod: "city",
    visualization: input.visualization,
    sourceMapPixel: null,
    referencePixel,
    world: referencePixelToGazetteerWorld(referencePixel),
    placementReference: {
      mapId: SHINOVAR_MONASTERIES_MAP_ID,
      title: "Supplied rendering of Map of the Shin Monasteries",
      pixel: input.localPixel,
      size: SHINOVAR_MONASTERIES_REFERENCE_SIZE,
    },
    renderable: true,
    sources: [
      shinovarMapSource,
      ...(input.kind === "institution" ? [monasteriesSource] : []),
      coppermindSource(input.coppermindSlug, input.canonicalName),
    ],
  };
}

export const shinovarTempleGazetteer: readonly GazetteerPlace[] = [
  shinovarPlace({
    id: "truthwatcher-monastery",
    canonicalName: "Truthwatcher Monastery",
    kind: "institution",
    visualization: "monastery",
    localPixel: [175, 370],
    coppermindSlug: "Truthwatcher_monastery",
    nationOrRegion: "Northwestern Shinovar",
  }),
  shinovarPlace({
    id: "windrunner-monastery",
    canonicalName: "Windrunner Monastery",
    kind: "institution",
    visualization: "monastery",
    localPixel: [411, 337],
    coppermindSlug: "Windrunner_monastery",
    nationOrRegion: "Northern Shinovar",
  }),
  shinovarPlace({
    id: "skybreaker-monastery",
    canonicalName: "Skybreaker Monastery",
    kind: "institution",
    visualization: "monastery",
    localPixel: [488, 407],
    coppermindSlug: "Skybreaker_monastery",
    nationOrRegion: "Eastern Shinovar, Misted Mountains",
  }),
  shinovarPlace({
    id: "dustbringer-monastery",
    canonicalName: "Dustbringer Monastery",
    kind: "institution",
    visualization: "monastery",
    localPixel: [528, 519],
    coppermindSlug: "Dustbringer_monastery",
    nationOrRegion: "Eastern Shinovar, Misted Mountains",
  }),
  shinovarPlace({
    id: "edgedancer-monastery",
    canonicalName: "Edgedancer Monastery",
    kind: "institution",
    visualization: "monastery",
    localPixel: [353, 486],
    coppermindSlug: "Edgedancer_monastery",
    nationOrRegion: "Central Shinovar",
  }),
  shinovarPlace({
    id: "lightweaver-monastery",
    canonicalName: "Lightweaver Monastery",
    kind: "institution",
    visualization: "monastery",
    localPixel: [169, 477],
    coppermindSlug: "Lightweaver_monastery",
    nationOrRegion: "Western Shinovar",
  }),
  shinovarPlace({
    id: "elsecaller-monastery",
    canonicalName: "Elsecaller Monastery",
    kind: "institution",
    visualization: "monastery",
    localPixel: [250, 604],
    coppermindSlug: "Elsecaller_monastery",
    nationOrRegion: "Southern Shinovar, near Mokdown",
  }),
  shinovarPlace({
    id: "willshaper-monastery",
    canonicalName: "Willshaper Monastery",
    kind: "institution",
    visualization: "monastery",
    localPixel: [402, 632],
    coppermindSlug: "Willshaper_monastery",
    nationOrRegion: "Southern Shinovar, near Koring",
  }),
  shinovarPlace({
    id: "stoneward-monastery",
    canonicalName: "Stoneward Monastery",
    kind: "institution",
    visualization: "monastery",
    localPixel: [375, 794],
    coppermindSlug: "Stoneward_monastery",
    nationOrRegion: "Southeastern Shinovar, near Clearmount",
  }),
  shinovarPlace({
    id: "bondsmith-monastery",
    canonicalName: "Bondsmith Monastery",
    kind: "institution",
    visualization: "rock-formation",
    localPixel: [473, 273],
    coppermindSlug: "Bondsmith_monastery",
    nationOrRegion: "Northern Shinovar, east of Ayabiza",
  }),
] as const;

export const shinovarSettlementGazetteer: readonly GazetteerPlace[] = [
  shinovarPlace({
    id: "ayabiza",
    canonicalName: "Ayabiza",
    kind: "city",
    visualization: "administrative-city",
    localPixel: [426, 274],
    coppermindSlug: "Ayabiza",
    nationOrRegion: "Northern Shinovar",
  }),
  shinovarPlace({
    id: "mokdown",
    canonicalName: "Mokdown",
    kind: "city",
    visualization: "market-city",
    localPixel: [270, 610],
    coppermindSlug: "Mokdown",
    nationOrRegion: "Southern Shinovar",
  }),
  shinovarPlace({
    id: "koring",
    canonicalName: "Koring",
    kind: "city",
    visualization: "market-city",
    localPixel: [420, 647],
    coppermindSlug: "Koring",
    nationOrRegion: "Southern Shinovar",
  }),
  shinovarPlace({
    id: "clearmount",
    canonicalName: "Clearmount",
    kind: "town",
    visualization: "village",
    localPixel: [300, 785],
    coppermindSlug: "Clearmount",
    nationOrRegion: "Nirovah Valley, southeastern Shinovar",
  }),
] as const;

export const shinovarGazetteer: readonly GazetteerPlace[] = [
  ...shinovarTempleGazetteer,
  ...shinovarSettlementGazetteer,
];
