import type { VisualizationArchetype } from "./types";

/**
 * Semantic miniature used by the Three.js gazetteer layer.
 *
 * This is intentionally independent of GazetteerKind: a landmark visualized
 * as a lighthouse must still read as a lighthouse, while a city visualized as
 * a port must keep its water-facing silhouette.
 */
export type MarkerArchetype =
  | "nation-standard"
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

export const visualizationArchetypes = [
  "nation-label",
  "fortified-city",
  "terrace-city",
  "port-city",
  "administrative-city",
  "market-city",
  "mountain-city",
  "village",
  "ruined-city",
  "mountain-range",
  "hills",
  "shattered-plains",
  "valley",
  "shallow-lake",
  "river",
  "sea",
  "ocean",
  "strait",
  "island",
  "island-chain",
  "caves",
  "library",
  "palace",
  "hospital",
  "monastery",
  "warcamp",
  "oathgate",
  "lighthouse",
  "harbor",
  "processional-way",
  "rock-formation",
] as const satisfies readonly VisualizationArchetype[];

export const markerArchetypeByVisualization = {
  "nation-label": "nation-standard",
  "fortified-city": "fortified-city",
  "terrace-city": "terrace-city",
  "port-city": "port-city",
  "administrative-city": "administrative-city",
  "market-city": "market-city",
  "mountain-city": "mountain-city",
  village: "village",
  "ruined-city": "ruined-city",
  "mountain-range": "mountain-range",
  hills: "hills",
  "shattered-plains": "shattered-plains",
  valley: "valley",
  "shallow-lake": "shallow-lake",
  river: "river",
  sea: "sea",
  ocean: "ocean",
  strait: "strait",
  island: "island",
  "island-chain": "island-chain",
  caves: "caves",
  library: "library",
  palace: "palace",
  hospital: "hospital",
  monastery: "monastery",
  warcamp: "warcamp",
  oathgate: "oathgate",
  lighthouse: "lighthouse",
  harbor: "harbor",
  "processional-way": "processional-way",
  "rock-formation": "rock-formation",
} as const satisfies Record<VisualizationArchetype, MarkerArchetype>;

export function markerArchetypeForVisualization(
  visualization: VisualizationArchetype,
): MarkerArchetype {
  return markerArchetypeByVisualization[visualization];
}
