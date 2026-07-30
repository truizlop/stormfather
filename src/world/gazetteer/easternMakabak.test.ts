import { describe, expect, it } from "vitest";
import { searchRosharCatalog } from "../../ui/searchCatalog";
import {
  mainlandOutline,
  pointInPolygon,
} from "../cartography/geography";
import { gazetteerById, placeableGazetteer } from "./catalog";
import {
  EASTERN_MAKABAK_MAP_ID,
  EASTERN_MAKABAK_MAP_URL,
  EASTERN_MAKABAK_REFERENCE_SIZE,
  easternMakabakGazetteer,
  easternMakabakMapPixelToReferencePixel,
} from "./easternMakabak";
import { referencePixelToGazetteerWorld } from "./transform";

const expectedSettlements = [
  ["sween", "Sween", "town"],
  ["yian-dion", "Yian Dion", "town"],
  ["domistar", "Domistar", "town"],
  ["uarr-dion", "Uarr Dion", "town"],
  ["hazzel", "Hazzel", "town"],
  ["holiqqil", "Holiqqil", "town"],
  ["ifaba", "Ifaba", "town"],
  ["lexili", "Lexili", "town"],
  ["mikhan", "Mikhan", "town"],
  ["khathazan", "Khathazan", "town"],
  ["khrishji", "Khrishji", "town"],
  ["torriqqam", "Torriqqam", "town"],
  ["rossen-dar", "Rossen Dar", "city"],
  ["jabom", "Jabom", "town"],
  ["riqu-mar", "Riqu Mar", "town"],
  ["linder-mar", "Linder Mar", "town"],
  ["ja-dran", "Ja Dran", "town"],
] as const;

describe("Eastern Makabak inset gazetteer", () => {
  it("catalogs every named settlement missing from the continental source", () => {
    expect(easternMakabakGazetteer).toHaveLength(expectedSettlements.length);
    expect(
      easternMakabakGazetteer.map(({ id, canonicalName, kind }) => [
        id,
        canonicalName,
        kind,
      ]),
    ).toEqual(expectedSettlements);
  });

  it("retains exact inset provenance without overstating global precision", () => {
    for (const place of easternMakabakGazetteer) {
      expect(place.certainty, place.canonicalName).toBe("regional");
      expect(place.sourceMapPixel, place.canonicalName).toBeNull();
      expect(place.referencePixel, place.canonicalName).not.toBeNull();
      expect(place.world, place.canonicalName).not.toBeNull();
      expect(place.renderable, place.canonicalName).toBe(true);
      expect(place.minimumLod, place.canonicalName).toBe("region");
      expect(place.placementReference?.mapId).toBe(EASTERN_MAKABAK_MAP_ID);
      expect(place.placementReference?.size).toEqual(
        EASTERN_MAKABAK_REFERENCE_SIZE,
      );
      expect(place.sources.some(({ url }) => url === EASTERN_MAKABAK_MAP_URL))
        .toBe(true);

      const localPixel = place.placementReference?.pixel;
      expect(localPixel, place.canonicalName).toBeDefined();
      if (!localPixel || !place.referencePixel) {
        throw new Error(`${place.canonicalName} has incomplete placement data`);
      }
      expect(localPixel[0]).toBeGreaterThanOrEqual(0);
      expect(localPixel[0]).toBeLessThanOrEqual(
        EASTERN_MAKABAK_REFERENCE_SIZE.width,
      );
      expect(localPixel[1]).toBeGreaterThanOrEqual(0);
      expect(localPixel[1]).toBeLessThanOrEqual(
        EASTERN_MAKABAK_REFERENCE_SIZE.height,
      );
      const registeredPixel =
        easternMakabakMapPixelToReferencePixel(localPixel);
      expect(
        Math.hypot(
          place.referencePixel[0] - registeredPixel[0],
          place.referencePixel[1] - registeredPixel[1],
        ),
        place.canonicalName,
      ).toBeLessThanOrEqual(4);
      expect(place.world).toEqual(
        referencePixelToGazetteerWorld(place.referencePixel),
      );
    }
  });

  it("keeps the projective registration stable across the inset", () => {
    const sween = easternMakabakMapPixelToReferencePixel([145, 137]);
    const holiqqil = easternMakabakMapPixelToReferencePixel([711, 595]);
    const jaDran = easternMakabakMapPixelToReferencePixel([883, 1330]);

    expect(sween[0]).toBeCloseTo(635.7453864768111, 8);
    expect(sween[1]).toBeCloseTo(597.8502165233992, 8);
    expect(holiqqil[0]).toBeCloseTo(771.167916977882, 8);
    expect(holiqqil[1]).toBeCloseTo(696.7345305627441, 8);
    expect(jaDran[0]).toBeCloseTo(827.9425149052712, 8);
    expect(jaDran[1]).toBeCloseTo(914.2454597945714, 8);
  });

  it("integrates all additions into place, marker, and search catalogs", () => {
    const placeableIds = new Set(placeableGazetteer.map(({ id }) => id));

    for (const [id, canonicalName] of expectedSettlements) {
      expect(gazetteerById.get(id), canonicalName).toBeDefined();
      expect(placeableIds.has(id), canonicalName).toBe(true);
      expect(
        searchRosharCatalog(canonicalName).some(
          (result) =>
            result.type === "gazetteer" && result.place.id === id,
        ),
        canonicalName,
      ).toBe(true);
    }
  });

  it("keeps settlement display anchors on the continental terrain", () => {
    expect(
      easternMakabakGazetteer
        .filter(
          (place) =>
            !place.world || !pointInPolygon(place.world, mainlandOutline),
        )
        .map(({ canonicalName }) => canonicalName),
    ).toEqual([]);

    for (const [id, expectedNudge] of [
      ["jabom", [0, -2]],
      ["ja-dran", [0, -4]],
    ] as const) {
      const place = easternMakabakGazetteer.find(
        (candidate) => candidate.id === id,
      );
      const localPixel = place?.placementReference?.pixel;
      expect(place?.referencePixel).not.toBeNull();
      expect(localPixel).toBeDefined();
      if (!place?.referencePixel || !localPixel) {
        throw new Error(`${id} has incomplete placement data`);
      }
      const registered =
        easternMakabakMapPixelToReferencePixel(localPixel);
      expect([
        place.referencePixel[0] - registered[0],
        place.referencePixel[1] - registered[1],
      ]).toEqual(expectedNudge);
    }
  });
});
