import { describe, expect, it } from "vitest";
import { referencePixelToWorld } from "../cartography/geography";
import {
  gazetteerById,
  placeableGazetteer,
  ROSHAR_MAP_SOURCE_COMMIT,
  rosharGazetteer,
  unknownGazetteer,
} from "./catalog";
import {
  gazetteerMarkerY,
  isGazetteerPlaceVisibleAtLod,
  isWithinGazetteerFocus,
} from "./markerLayout";
import {
  hasPlaceablePosition,
  SEVENTEENTH_SHARD_MAP_SIZE,
  sourceMapPixelToReferencePixel,
} from "./transform";

describe("source-backed Roshar gazetteer", () => {
  it("preserves every distinct Physical-Realm point in the source map", () => {
    expect(ROSHAR_MAP_SOURCE_COMMIT).toBe(
      "dfbf1c167808f29176a7c01469e8ba957a8b3692",
    );
    expect(
      rosharGazetteer.filter((place) => place.sourceMapPixel !== null),
    ).toHaveLength(83);
    expect(rosharGazetteer.length).toBeGreaterThanOrEqual(100);
    expect(placeableGazetteer.length).toBeGreaterThanOrEqual(97);
  });

  it("keeps ids unique and gives every entry an auditable source", () => {
    expect(new Set(rosharGazetteer.map((place) => place.id)).size).toBe(
      rosharGazetteer.length,
    );
    for (const place of rosharGazetteer) {
      expect(place.sources.length).toBeGreaterThan(0);
      for (const source of place.sources) {
        expect(source.title.length).toBeGreaterThan(5);
        expect(source.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("derives world coordinates only from reference pixels", () => {
    for (const place of rosharGazetteer) {
      if (place.referencePixel === null) {
        expect(place.world).toBeNull();
        expect(place.renderable).toBe(false);
        expect(place.certainty).toBe("unknown");
        continue;
      }
      expect(place.world).toEqual(referencePixelToWorld(place.referencePixel));
      expect(place.renderable).toBe(true);
      expect(place.certainty).not.toBe("unknown");
    }
    expect(placeableGazetteer.every(hasPlaceablePosition)).toBe(true);
  });

  it("keeps map and supplied-reference coordinates inside their rasters", () => {
    for (const place of rosharGazetteer) {
      if (place.sourceMapPixel) {
        expect(place.sourceMapPixel[0]).toBeGreaterThanOrEqual(0);
        expect(place.sourceMapPixel[0]).toBeLessThanOrEqual(
          SEVENTEENTH_SHARD_MAP_SIZE.width,
        );
        expect(place.sourceMapPixel[1]).toBeGreaterThanOrEqual(0);
        expect(place.sourceMapPixel[1]).toBeLessThanOrEqual(
          SEVENTEENTH_SHARD_MAP_SIZE.height,
        );
      }
      if (place.referencePixel) {
        expect(place.referencePixel[0]).toBeGreaterThanOrEqual(0);
        expect(place.referencePixel[0]).toBeLessThanOrEqual(1889);
        expect(place.referencePixel[1]).toBeGreaterThanOrEqual(0);
        expect(place.referencePixel[1]).toBeLessThanOrEqual(1144);
      }
    }
  });

  it("shares authoritative destination pixels with existing cartography", () => {
    expect(gazetteerById.get("kharbranth")?.referencePixel).toEqual([
      1105, 885,
    ]);
    expect(gazetteerById.get("kholinar")?.referencePixel).toEqual([1405, 540]);
    expect(gazetteerById.get("urithiru")?.referencePixel).toEqual([830, 700]);
    expect(gazetteerById.get("shattered-plains")?.referencePixel).toEqual([
      1575, 815,
    ]);
  });

  it("registers non-destination map points through a stable homography", () => {
    const transformed = sourceMapPixelToReferencePixel([609.8, 334.7]);
    expect(transformed[0]).toBeCloseTo(1157.14, 1);
    expect(transformed[1]).toBeCloseTo(751.86, 1);
  });

  it("routes Vedenar's homography point to its independent authored city", () => {
    const vedenar = gazetteerById.get("vedenar")!;

    expect(vedenar.parentLocationId).toBe("vedenar");
    expect(vedenar.world?.[0]).toBeCloseTo(13.25711084817365, 10);
    expect(vedenar.world?.[1]).toBeCloseTo(9.719221057177, 10);
  });

  it("keeps Narak inside the authored Shattered Plains destination", () => {
    const narak = gazetteerById.get("narak")!;

    expect(narak.parentLocationId).toBe("shattered-plains");
    expect(narak.canonicalName).toBe("Narak");
    expect(narak.alternateNames).toContain("Stormseat");
  });

  it("does not invent coordinates for places with unknown positions", () => {
    expect(unknownGazetteer.map((place) => place.id)).toEqual([
      "palanaeum",
      "taravangian-hospital",
      "feverstone-keep",
      "cabridar",
      "uvara",
      "puulis-lighthouse",
    ]);
    expect(
      unknownGazetteer.every(
        (place) =>
          place.certainty === "unknown" &&
          place.referencePixel === null &&
          place.world === null &&
          !place.renderable,
      ),
    ).toBe(true);
  });

  it("adds conservative anchors only where the books establish a region", () => {
    const amydlatn = gazetteerById.get("amydlatn");
    const hurziko = gazetteerById.get("hurziko");
    const cabridar = gazetteerById.get("cabridar");

    expect(amydlatn).toMatchObject({
      canonicalName: "Amydlatn",
      kind: "city",
      certainty: "regional",
      renderable: true,
    });
    expect(hurziko).toMatchObject({
      canonicalName: "Hurziko",
      kind: "village",
      certainty: "regional",
      renderable: true,
    });
    expect(cabridar).toMatchObject({
      canonicalName: "Cabridar",
      certainty: "unknown",
      renderable: false,
      referencePixel: null,
      world: null,
    });
  });

  it("keeps source-backed place types and names current", () => {
    expect(gazetteerById.get("akak")).toMatchObject({
      kind: "island",
      category: "island",
      visualization: "island",
    });
    expect(gazetteerById.get("new-natanan")?.category).toBe("city-state");
    expect(gazetteerById.get("sesemalex-dar")?.nationOrRegion).toBe("Emul");
    expect(gazetteerById.get("northgrip")?.nationOrRegion).toContain(
      "Jah Keved",
    );
    expect(gazetteerById.get("klna")).toMatchObject({
      canonicalName: "Klna City",
      kind: "city",
      alternateNames: ["Klna"],
    });

    for (const id of [
      "revolar",
      "shulin",
      "karanak",
      "dumadari",
      "northgrip",
      "elanar",
      "valath",
      "silnasen",
      "fu-namir",
    ]) {
      expect(gazetteerById.get(id)?.kind, id).toBe("city");
    }
  });
});

describe("gazetteer terrain marker policy", () => {
  it("reveals entries at or below the active detail level", () => {
    const kharbranth = gazetteerById.get("kharbranth");
    const conclave = gazetteerById.get("kharbranth-conclave");
    expect(kharbranth).toBeDefined();
    expect(conclave).toBeDefined();
    expect(isGazetteerPlaceVisibleAtLod(kharbranth!, "continent")).toBe(false);
    expect(isGazetteerPlaceVisibleAtLod(kharbranth!, "region")).toBe(true);
    expect(isGazetteerPlaceVisibleAtLod(conclave!, "city")).toBe(false);
    expect(isGazetteerPlaceVisibleAtLod(conclave!, "street")).toBe(true);
  });

  it("terrain-seats land markers while keeping water markers at sea level", () => {
    const kharbranth = gazetteerById.get("kharbranth")!;
    const aimianSea = gazetteerById.get("aimian-sea")!;
    expect(gazetteerMarkerY(kharbranth)).toBeGreaterThan(0.35);
    expect(gazetteerMarkerY(aimianSea)).toBe(0.24);
  });

  it("supports focus culling for dense city and street views", () => {
    const kharbranth = gazetteerById.get("kharbranth")!;
    const kholinar = gazetteerById.get("kholinar")!;
    expect(
      isWithinGazetteerFocus(kharbranth, kharbranth.world!, 0.1),
    ).toBe(true);
    expect(isWithinGazetteerFocus(kholinar, kharbranth.world!, 0.1)).toBe(
      false,
    );
  });
});
