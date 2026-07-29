import type { DetailLevel } from "../types";

export type GazetteerCertainty = "precise" | "regional" | "unknown";

export type GazetteerKind =
  | "nation"
  | "region"
  | "city"
  | "town"
  | "village"
  | "ruin"
  | "institution"
  | "mountain-range"
  | "hills"
  | "plains"
  | "valley"
  | "lake"
  | "river"
  | "sea"
  | "ocean"
  | "strait"
  | "island"
  | "island-chain"
  | "caves"
  | "landmark";

/**
 * Reader-facing classification, kept separate from `GazetteerKind`.
 *
 * `kind` drives a place's semantic miniature (lake, island chain, mountain
 * range, and so on), while `category` can retain the political or narrative
 * classification used by the books without discarding that physical shape.
 */
export type GazetteerCategory =
  | "kingdom/region"
  | "region"
  | "broad cultural/geographic region"
  | "city-state"
  | "legendary city"
  | "city"
  | "town"
  | "village"
  | "ruin"
  | "institution"
  | "mountain range"
  | "hills"
  | "plains"
  | "valley"
  | "lake"
  | "river"
  | "sea"
  | "ocean"
  | "strait"
  | "island"
  | "island chain"
  | "caves"
  | "landmark";

export function defaultGazetteerCategory(
  kind: GazetteerKind,
): GazetteerCategory {
  switch (kind) {
    case "nation":
      return "kingdom/region";
    case "region":
      return "region";
    case "mountain-range":
      return "mountain range";
    case "island-chain":
      return "island chain";
    default:
      return kind;
  }
}

export type VisualizationArchetype =
  | "nation-label"
  | "fortified-city"
  | "terrace-city"
  | "port-city"
  | "administrative-city"
  | "market-city"
  | "mountain-city"
  | "village"
  | "ruined-city"
  | "mountain-range"
  | "hills"
  | "shattered-plains"
  | "valley"
  | "shallow-lake"
  | "river"
  | "sea"
  | "ocean"
  | "strait"
  | "island"
  | "island-chain"
  | "caves"
  | "library"
  | "palace"
  | "hospital"
  | "monastery"
  | "warcamp"
  | "oathgate"
  | "lighthouse"
  | "harbor"
  | "processional-way"
  | "rock-formation";

export interface GazetteerSource {
  title: string;
  url: string;
}

/**
 * Auditable coordinates on a cited inset or city plan. These preserve relative
 * placement without implying that an inset has been georeferenced precisely to
 * the continental Roshar raster.
 */
export interface GazetteerPlacementReference {
  mapId: string;
  title: string;
  pixel: readonly [number, number];
  size: {
    width: number;
    height: number;
  };
}

export interface GazetteerPlace {
  id: string;
  canonicalName: string;
  /**
   * Existing atlas destination whose authored local model contains this place.
   * Selecting a plan-level feature loads that destination before focusing it.
   */
  parentLocationId?: string;
  kind: GazetteerKind;
  category: GazetteerCategory;
  nationOrRegion: string;
  /**
   * `precise` means a point is present in the cited cartographic source.
   * `regional` means the work identifies a containing region but not a surveyed
   * point. `unknown` means even a responsible regional placement is unavailable.
   */
  certainty: GazetteerCertainty;
  minimumLod: DetailLevel;
  visualization: VisualizationArchetype;
  /** Logical 1024 × 512 coordinates from the 17th Shard map, when available. */
  sourceMapPixel: readonly [number, number] | null;
  /** Coordinates in Stormfather's 1889 × 1144 supplied-reference system. */
  referencePixel: readonly [number, number] | null;
  /** Stormfather world-space `[x, z]`, derived only from `referencePixel`. */
  world: readonly [number, number] | null;
  /** Optional source-plan point retained independently of global placement. */
  placementReference?: GazetteerPlacementReference;
  renderable: boolean;
  alternateNames?: readonly string[];
  sources: readonly GazetteerSource[];
}
