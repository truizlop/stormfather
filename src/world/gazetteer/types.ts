import type { DetailLevel } from "../types";

export type GazetteerCertainty = "precise" | "regional" | "unknown";

export type GazetteerKind =
  | "nation"
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

export interface GazetteerPlace {
  id: string;
  canonicalName: string;
  kind: GazetteerKind;
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
  renderable: boolean;
  alternateNames?: readonly string[];
  sources: readonly GazetteerSource[];
}
