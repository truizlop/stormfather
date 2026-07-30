import { referencePixelToGazetteerWorld } from "./transform";
import { defaultGazetteerCategory } from "./types";
import type {
  GazetteerKind,
  GazetteerPlace,
  GazetteerSource,
  VisualizationArchetype,
} from "./types";

export const EASTERN_MAKABAK_MAP_ID = "eastern-makabak-war-map";

export const EASTERN_MAKABAK_REFERENCE_SIZE = {
  width: 1080,
  height: 1609,
} as const;

export const EASTERN_MAKABAK_MAP_URL =
  "https://coppermind.net/wiki/File:Map_of_Eastern_Makabak.jpg";

const easternMakabakMapSource: GazetteerSource = {
  title: "Isaac Stewart — Map of Eastern Makabak",
  url: EASTERN_MAKABAK_MAP_URL,
};

function coppermindSource(slug: string, title: string): GazetteerSource {
  return {
    title: `The Coppermind — ${title}`,
    url: `https://coppermind.net/wiki/${slug}`,
  };
}

/**
 * Projective registration from Isaac Stewart's 1080 × 1609 Eastern Makabak
 * inset into Stormfather's 1889 × 1144 reference.
 *
 * The fit uses the shared Azimir, Yeddaw, Sesemalex Dar, Zawfix, and Urithiru
 * points. Fu Namir provides an independent visual check. The inset is an
 * illustrated campaign map rather than a survey, so records produced from it
 * remain explicitly `regional`; their original pixels preserve its canonical
 * local topology.
 */
const EASTERN_MAKABAK_TO_REFERENCE_HOMOGRAPHY = [
  0.1908069994328625,
  -0.1413071858312672,
  606.6102514169858,
  -0.0371691151252955,
  0.08174711668368928,
  572.4546354691191,
  -0.000051862937562915365,
  -0.0001842347898855896,
] as const;

export function easternMakabakMapPixelToReferencePixel(
  pixel: readonly [number, number],
): readonly [number, number] {
  const [x, y] = pixel;
  const [h11, h12, h13, h21, h22, h23, h31, h32] =
    EASTERN_MAKABAK_TO_REFERENCE_HOMOGRAPHY;
  const denominator = h31 * x + h32 * y + 1;
  return [
    (h11 * x + h12 * y + h13) / denominator,
    (h21 * x + h22 * y + h23) / denominator,
  ];
}

interface EasternMakabakPlaceInput {
  id: string;
  canonicalName: string;
  kind: GazetteerKind;
  nationOrRegion: string;
  visualization: VisualizationArchetype;
  localPixel: readonly [number, number];
  /** Minimal reference-pixel nudge when schematic coastlines do not coincide. */
  terrainNudge?: readonly [number, number];
  coppermindSlug: string;
}

function easternMakabakPlace(
  input: EasternMakabakPlaceInput,
): GazetteerPlace {
  const registeredPixel = easternMakabakMapPixelToReferencePixel(
    input.localPixel,
  );
  const referencePixel = [
    registeredPixel[0] + (input.terrainNudge?.[0] ?? 0),
    registeredPixel[1] + (input.terrainNudge?.[1] ?? 0),
  ] as const;
  return {
    id: input.id,
    canonicalName: input.canonicalName,
    kind: input.kind,
    category: defaultGazetteerCategory(input.kind),
    nationOrRegion: input.nationOrRegion,
    certainty: "regional",
    minimumLod: "region",
    visualization: input.visualization,
    sourceMapPixel: null,
    referencePixel,
    world: referencePixelToGazetteerWorld(referencePixel),
    placementReference: {
      mapId: EASTERN_MAKABAK_MAP_ID,
      title: "Isaac Stewart's Map of Eastern Makabak",
      pixel: input.localPixel,
      size: EASTERN_MAKABAK_REFERENCE_SIZE,
    },
    renderable: true,
    sources: [
      easternMakabakMapSource,
      coppermindSource(input.coppermindSlug, input.canonicalName),
    ],
  };
}

export const easternMakabakGazetteer: readonly GazetteerPlace[] = [
  easternMakabakPlace({
    id: "sween",
    canonicalName: "Sween",
    kind: "town",
    nationOrRegion: "Southeastern Babatharnam",
    visualization: "market-city",
    localPixel: [145, 137],
    coppermindSlug: "Sween",
  }),
  easternMakabakPlace({
    id: "yian-dion",
    canonicalName: "Yian Dion",
    kind: "town",
    nationOrRegion: "Northern Yulay, Purelake shore",
    visualization: "port-city",
    localPixel: [339, 100],
    coppermindSlug: "Yian_Dion",
  }),
  easternMakabakPlace({
    id: "domistar",
    canonicalName: "Domistar",
    kind: "town",
    nationOrRegion: "Northern Yulay, Purelake shore",
    visualization: "port-city",
    localPixel: [520, 217],
    coppermindSlug: "Domistar",
  }),
  easternMakabakPlace({
    id: "uarr-dion",
    canonicalName: "Uarr Dion",
    kind: "town",
    nationOrRegion: "Northeastern Yulay, Purelake shore",
    visualization: "port-city",
    localPixel: [771, 185],
    coppermindSlug: "Uarr_Dion",
  }),
  easternMakabakPlace({
    id: "hazzel",
    canonicalName: "Hazzel",
    kind: "town",
    nationOrRegion: "Azir–Yulay mountain border",
    visualization: "mountain-city",
    localPixel: [181, 265],
    coppermindSlug: "Hazzel",
  }),
  easternMakabakPlace({
    id: "holiqqil",
    canonicalName: "Holiqqil",
    kind: "town",
    nationOrRegion: "Northern Emul",
    visualization: "fortified-city",
    localPixel: [711, 595],
    coppermindSlug: "Holiqqil",
  }),
  easternMakabakPlace({
    id: "ifaba",
    canonicalName: "Ifaba",
    kind: "town",
    nationOrRegion: "Southern Tashikk",
    visualization: "port-city",
    localPixel: [144, 955],
    coppermindSlug: "Ifaba",
  }),
  easternMakabakPlace({
    id: "lexili",
    canonicalName: "Lexili",
    kind: "town",
    nationOrRegion: "Western Greater Hexi",
    visualization: "market-city",
    localPixel: [915, 946],
    coppermindSlug: "Lexili",
  }),
  easternMakabakPlace({
    id: "mikhan",
    canonicalName: "Mikhan",
    kind: "town",
    nationOrRegion: "Northern Marat",
    visualization: "market-city",
    localPixel: [883, 1031],
    coppermindSlug: "Mikhan",
  }),
  easternMakabakPlace({
    id: "khathazan",
    canonicalName: "Khathazan",
    kind: "town",
    nationOrRegion: "Northern Tukar, near the Emuli border",
    visualization: "fortified-city",
    localPixel: [417, 1062],
    coppermindSlug: "Khathazan",
  }),
  easternMakabakPlace({
    id: "khrishji",
    canonicalName: "Khrishji",
    kind: "town",
    nationOrRegion: "Western Marat, near the Tukari border",
    visualization: "fortified-city",
    localPixel: [655, 1078],
    coppermindSlug: "Khrishji",
  }),
  easternMakabakPlace({
    id: "torriqqam",
    canonicalName: "Torriqqam",
    kind: "town",
    nationOrRegion: "Northern Tukar",
    visualization: "port-city",
    localPixel: [132, 1150],
    coppermindSlug: "Torriqqam",
  }),
  easternMakabakPlace({
    id: "rossen-dar",
    canonicalName: "Rossen Dar",
    kind: "city",
    nationOrRegion: "Southern Marat",
    visualization: "port-city",
    localPixel: [596, 1221],
    coppermindSlug: "Rossen_Dar",
  }),
  easternMakabakPlace({
    id: "jabom",
    canonicalName: "Jabom",
    kind: "town",
    nationOrRegion: "Southern Marat",
    visualization: "port-city",
    localPixel: [690, 1272],
    // The inset's decorative shoreline projects two pixels seaward on the
    // continental mask; retain its exact source pixel and seat the marker landward.
    terrainNudge: [0, -2],
    coppermindSlug: "Jabom",
  }),
  easternMakabakPlace({
    id: "riqu-mar",
    canonicalName: "Riqu Mar",
    kind: "town",
    nationOrRegion: "Southern Tukar",
    visualization: "port-city",
    localPixel: [130, 1349],
    coppermindSlug: "Riqu_Mar",
  }),
  easternMakabakPlace({
    id: "linder-mar",
    canonicalName: "Linder Mar",
    kind: "town",
    nationOrRegion: "Southern Tukar",
    visualization: "port-city",
    localPixel: [324, 1307],
    coppermindSlug: "Linder_Mar",
  }),
  easternMakabakPlace({
    id: "ja-dran",
    canonicalName: "Ja Dran",
    kind: "town",
    nationOrRegion: "Southeastern Marat",
    visualization: "port-city",
    localPixel: [883, 1330],
    // As with Jabom, keep the canonical inset point while correcting only the
    // four-pixel coastline mismatch in the coarser continental terrain mask.
    terrainNudge: [0, -4],
    coppermindSlug: "Ja_Dran",
  }),
] as const;
