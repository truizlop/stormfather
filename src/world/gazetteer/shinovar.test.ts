import { describe, expect, it } from "vitest";
import { gazetteerById } from "./catalog";
import {
  SHINOVAR_MONASTERIES_MAP_ID,
  SHINOVAR_MONASTERIES_REFERENCE_SIZE,
  shinovarGazetteer,
  shinovarMapPixelToReferencePixel,
  shinovarSettlementGazetteer,
  shinovarTempleGazetteer,
} from "./shinovar";

const monasteryIds = [
  "windrunner-monastery",
  "skybreaker-monastery",
  "dustbringer-monastery",
  "edgedancer-monastery",
  "truthwatcher-monastery",
  "lightweaver-monastery",
  "elsecaller-monastery",
  "willshaper-monastery",
  "stoneward-monastery",
  "bondsmith-monastery",
] as const;

describe("source-backed Shinovar inset geography", () => {
  it("transcribes exactly ten monasteries and four readable settlements", () => {
    expect(shinovarTempleGazetteer).toHaveLength(10);
    expect(shinovarSettlementGazetteer.map((place) => place.id)).toEqual([
      "ayabiza",
      "mokdown",
      "koring",
      "clearmount",
    ]);
    expect(new Set(shinovarTempleGazetteer.map((place) => place.id))).toEqual(
      new Set(monasteryIds),
    );
  });

  it("preserves inset pixels without overstating global precision", () => {
    for (const place of shinovarGazetteer) {
      expect(place.certainty).toBe("regional");
      expect(place.renderable).toBe(true);
      expect(place.sourceMapPixel).toBeNull();
      expect(place.referencePixel).not.toBeNull();
      expect(place.world).not.toBeNull();
      expect(place.parentLocationId).toBe("shinovar");
      expect(place.placementReference?.mapId).toBe(
        SHINOVAR_MONASTERIES_MAP_ID,
      );
      expect(place.placementReference?.size).toEqual(
        SHINOVAR_MONASTERIES_REFERENCE_SIZE,
      );

      const [x, y] = place.placementReference!.pixel;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(
        SHINOVAR_MONASTERIES_REFERENCE_SIZE.width,
      );
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(
        SHINOVAR_MONASTERIES_REFERENCE_SIZE.height,
      );
      expect(place.referencePixel).toEqual(
        shinovarMapPixelToReferencePixel([x, y]),
      );
    }
  });

  it("keeps the map's cardinal relationships and paired settlements", () => {
    const pixel = (id: string) =>
      gazetteerById.get(id)!.placementReference!.pixel;
    const distance = (a: string, b: string) => {
      const [ax, ay] = pixel(a);
      const [bx, by] = pixel(b);
      return Math.hypot(ax - bx, ay - by);
    };

    expect(pixel("truthwatcher-monastery")[0]).toBeLessThan(
      pixel("windrunner-monastery")[0],
    );
    expect(pixel("bondsmith-monastery")[1]).toBeLessThan(
      pixel("windrunner-monastery")[1],
    );
    expect(pixel("dustbringer-monastery")[0]).toBeGreaterThan(
      pixel("edgedancer-monastery")[0],
    );
    expect(pixel("stoneward-monastery")[1]).toBeGreaterThan(
      pixel("willshaper-monastery")[1],
    );
    expect(distance("elsecaller-monastery", "mokdown")).toBeLessThan(30);
    expect(distance("willshaper-monastery", "koring")).toBeLessThan(30);
    expect(distance("stoneward-monastery", "clearmount")).toBeLessThan(90);
    expect(distance("bondsmith-monastery", "ayabiza")).toBeLessThan(60);
  });

  it("keeps official-map and place-specific sources on every entry", () => {
    for (const place of shinovarGazetteer) {
      expect(
        place.sources.some((source) =>
          source.url.includes("File:Map_of_Shin_Monasteries.jpg"),
        ),
      ).toBe(true);
      expect(
        place.sources.some((source) =>
          source.url.endsWith(
            place.id
              .split("-")
              .map((part, index) =>
                index === 0
                  ? part.charAt(0).toUpperCase() + part.slice(1)
                  : part,
              )
              .join("_"),
          ),
        ),
      ).toBe(true);
    }
  });
});
