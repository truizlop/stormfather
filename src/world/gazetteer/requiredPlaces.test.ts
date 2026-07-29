import { describe, expect, it } from "vitest";
import { searchRosharCatalog } from "../../ui/searchCatalog";
import {
  gazetteerById,
  layoutGazetteerMarkerWorlds,
  markerArchetypeForVisualization,
  placeableGazetteer,
} from ".";
import type {
  GazetteerCategory,
  GazetteerKind,
} from "./types";

interface RequiredPlaceExpectation {
  id: string;
  name: string;
  kind: GazetteerKind;
  category: GazetteerCategory;
}

const requiredPlaces = [
  { id: "shattered-plains", name: "Shattered Plains", kind: "plains", category: "region" },
  { id: "alethkar", name: "Alethkar", kind: "nation", category: "kingdom/region" },
  { id: "kharbranth", name: "Kharbranth", kind: "city", category: "city-state" },
  { id: "kholinar", name: "Kholinar", kind: "city", category: "city" },
  { id: "hearthstone", name: "Hearthstone", kind: "town", category: "town" },
  { id: "jah-keved", name: "Jah Keved", kind: "nation", category: "kingdom/region" },
  { id: "shinovar", name: "Shinovar", kind: "nation", category: "kingdom/region" },
  { id: "purelake", name: "Purelake", kind: "lake", category: "region" },
  { id: "thaylenah", name: "Thaylenah", kind: "nation", category: "kingdom/region" },
  { id: "azir", name: "Azir", kind: "nation", category: "kingdom/region" },
  { id: "herdaz", name: "Herdaz", kind: "nation", category: "kingdom/region" },
  {
    id: "horneater-peaks",
    name: "Horneater Peaks",
    kind: "mountain-range",
    category: "region",
  },
  { id: "reshi-isles", name: "Reshi Isles", kind: "island-chain", category: "region" },
  { id: "frostlands", name: "Frostlands", kind: "plains", category: "region" },
  { id: "unclaimed-hills", name: "Unclaimed Hills", kind: "hills", category: "region" },
  { id: "sesemalex-dar", name: "Sesemalex Dar", kind: "city", category: "city" },
  { id: "vedenar", name: "Vedenar", kind: "city", category: "city" },
  { id: "azimir", name: "Azimir", kind: "city", category: "city" },
  { id: "urithiru", name: "Urithiru", kind: "city", category: "legendary city" },
  { id: "aimia", name: "Aimia", kind: "island", category: "region" },
  { id: "iri", name: "Iri", kind: "nation", category: "kingdom/region" },
  { id: "rira", name: "Rira", kind: "nation", category: "kingdom/region" },
  { id: "tukar", name: "Tukar", kind: "nation", category: "kingdom/region" },
  { id: "emul", name: "Emul", kind: "nation", category: "kingdom/region" },
  { id: "marat", name: "Marat", kind: "nation", category: "kingdom/region" },
  { id: "babatharnam", name: "Babatharnam", kind: "nation", category: "kingdom/region" },
  {
    id: "new-natanan",
    name: "New Natanan",
    kind: "city",
    category: "kingdom/region",
  },
  { id: "yulay", name: "Yulay", kind: "nation", category: "kingdom/region" },
  { id: "liafor", name: "Liafor", kind: "nation", category: "kingdom/region" },
  { id: "steen", name: "Steen", kind: "nation", category: "kingdom/region" },
  { id: "tu-bayla", name: "Tu Bayla", kind: "nation", category: "kingdom/region" },
  {
    id: "greater-hexi",
    name: "Greater Hexi",
    kind: "nation",
    category: "kingdom/region",
  },
  {
    id: "makabak",
    name: "Makabak",
    kind: "region",
    category: "broad cultural/geographic region",
  },
] as const satisfies readonly RequiredPlaceExpectation[];

describe("required Roshar place acceptance catalog", () => {
  it("keeps all 33 requested places source-backed, classified, and placeable", () => {
    expect(requiredPlaces).toHaveLength(33);

    for (const expected of requiredPlaces) {
      const place = gazetteerById.get(expected.id);
      expect(place, expected.name).toBeDefined();
      expect(place?.canonicalName).toBe(expected.name);
      expect(place?.kind).toBe(expected.kind);
      expect(place?.category).toBe(expected.category);
      expect(place?.renderable).toBe(true);
      expect(place?.certainty).not.toBe("unknown");
      expect(place?.referencePixel).not.toBeNull();
      expect(place?.world).not.toBeNull();
      expect(place?.sources.length).toBeGreaterThan(0);
      expect(place?.referencePixel?.[0]).toBeGreaterThanOrEqual(0);
      expect(place?.referencePixel?.[0]).toBeLessThanOrEqual(1889);
      expect(place?.referencePixel?.[1]).toBeGreaterThanOrEqual(0);
      expect(place?.referencePixel?.[1]).toBeLessThanOrEqual(1144);
      expect(
        place?.world?.every((coordinate) => Number.isFinite(coordinate)),
      ).toBe(true);
    }
  });

  it("routes all requested names through search and semantic marker catalogs", () => {
    const requiredIds = new Set<string>(
      requiredPlaces.map((place) => place.id),
    );
    const markerPlacements = layoutGazetteerMarkerWorlds(
      placeableGazetteer.filter((place) => requiredIds.has(place.id)),
    );

    expect(markerPlacements).toHaveLength(requiredPlaces.length);
    expect(new Set(markerPlacements.map(({ place }) => place.id))).toEqual(
      requiredIds,
    );

    for (const expected of requiredPlaces) {
      const place = gazetteerById.get(expected.id)!;
      const matches = searchRosharCatalog(expected.name);
      expect(
        matches.some((result) =>
          result.type === "destination"
            ? result.location.id === expected.id
            : result.place.id === expected.id,
        ),
        expected.name,
      ).toBe(true);
      expect(markerArchetypeForVisualization(place.visualization)).toBeTruthy();
    }
  });
});
