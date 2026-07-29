import { describe, expect, it } from "vitest";
import { locations } from "../locations";
import { rosharGazetteer } from "./catalog";
import {
  literaryPlaceExclusions,
  literaryPlaceGazetteer,
} from "./literaryPlaces";
import { referencePixelToGazetteerWorld } from "./transform";

describe("literary-place gazetteer gap catalog", () => {
  it("integrates the audited 78 placeable gaps exactly once", () => {
    expect(literaryPlaceGazetteer).toHaveLength(78);

    const ids = literaryPlaceGazetteer.map((place) => place.id);
    const canonicalNames = literaryPlaceGazetteer.map(
      (place) => place.canonicalName,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(canonicalNames).size).toBe(canonicalNames.length);

    const catalogIds = rosharGazetteer.map((place) => place.id);
    const catalogNames = rosharGazetteer.map(
      (place) => place.canonicalName,
    );
    for (const id of ids) {
      expect(catalogIds.filter((candidate) => candidate === id)).toHaveLength(
        1,
      );
    }
    for (const name of canonicalNames) {
      expect(
        catalogNames.filter((candidate) => candidate === name),
      ).toHaveLength(1);
    }
  });

  it("keeps every rounded display anchor explicitly regional and derived", () => {
    for (const place of literaryPlaceGazetteer) {
      expect(place.certainty, place.canonicalName).toBe("regional");
      expect(place.sourceMapPixel, place.canonicalName).toBeNull();
      expect(place.referencePixel, place.canonicalName).not.toBeNull();
      expect(place.world, place.canonicalName).not.toBeNull();
      expect(place.renderable, place.canonicalName).toBe(true);

      if (place.referencePixel === null) {
        throw new Error(`${place.canonicalName} is missing a display anchor`);
      }
      expect(place.world).toEqual(
        referencePixelToGazetteerWorld(place.referencePixel),
      );
      expect(place.referencePixel[0]).toBeGreaterThanOrEqual(0);
      expect(place.referencePixel[0]).toBeLessThanOrEqual(1889);
      expect(place.referencePixel[1]).toBeGreaterThanOrEqual(0);
      expect(place.referencePixel[1]).toBeLessThanOrEqual(1144);
    }
  });

  it("provides direct HTTPS evidence for every addition and exclusion", () => {
    for (const record of [
      ...literaryPlaceGazetteer,
      ...literaryPlaceExclusions,
    ]) {
      expect(record.sources.length, record.canonicalName).toBeGreaterThan(0);
      for (const source of record.sources) {
        expect(source.title, record.canonicalName).not.toHaveLength(0);
        expect(source.url, record.canonicalName).toMatch(
          /^https:\/\/coppermind\.net\/wiki\//,
        );
      }
    }
  });

  it("only links plan-level features to real travel destinations", () => {
    const destinationIds = new Set(locations.map((place) => place.id));
    const children = literaryPlaceGazetteer.filter(
      (place) => place.parentLocationId !== undefined,
    );

    expect(children.length).toBeGreaterThan(0);
    for (const child of children) {
      expect(destinationIds.has(child.parentLocationId ?? "")).toBe(true);
      expect(["region", "city", "street"]).toContain(child.minimumLod);
    }
  });

  it("audits the most tempting ambiguous or out-of-scope names", () => {
    expect(literaryPlaceExclusions).toHaveLength(8);
    expect(
      new Set(literaryPlaceExclusions.map((entry) => entry.canonicalName)).size,
    ).toBe(literaryPlaceExclusions.length);

    expect(
      literaryPlaceExclusions.map((entry) => [
        entry.canonicalName,
        entry.reason,
      ]),
    ).toEqual(
      expect.arrayContaining([
        ["Abamabar", "unknown-physical-location"],
        ["Feverstone Keep", "unknown-physical-location"],
        ["Haka'alaku", "cognitive-realm"],
        ["Number City", "cognitive-realm"],
        ["Stormseat", "already-cataloged-alias"],
      ]),
    );
  });

  it("preserves parent-city grouping without fabricating local coordinates", () => {
    const expectedParents = {
      "kharbranth": ["Great Concourse of Kharbranth", "School of Storms", "Ralinsa"],
      "shattered-plains": [
        "Feasting basin",
        "Honor Chasm",
        "Little Herdaz",
        "Ornery Chull",
        "Outer Market",
        "Pinnacle",
        "Pinnacle Dueling Arena",
        "Tower plateau",
      ],
      "shinovar": ["Dison's Valley", "Nirovah Valley", "Valley of Truth"],
      "thaylen-city": ["Thaylen Gemstone Reserve"],
      "urithiru": [
        "All's Alley",
        "Breakaway",
        "Ten Rings",
        "Urithiru gem archive",
      ],
    } as const;

    for (const [parentLocationId, expectedNames] of Object.entries(
      expectedParents,
    )) {
      const names = literaryPlaceGazetteer
        .filter((place) => place.parentLocationId === parentLocationId)
        .map((place) => place.canonicalName)
        .sort();
      expect(names).toEqual([...expectedNames].sort());
    }
  });
});
