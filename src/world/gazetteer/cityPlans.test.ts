import { describe, expect, it } from "vitest";
import { referencePixelToWorld } from "../cartography/geography";
import {
  AZIMIR_CITY_PLAN_SIZE,
  azimirCityPlanGazetteer,
  cityPlanGazetteer,
  KHOLINAR_CITY_PLAN_SIZE,
  kholinarCityPlanGazetteer,
} from "./cityPlans";
import { gazetteerMarkerWorld } from "./markerLayout";

function byId(id: string) {
  const place = cityPlanGazetteer.find((candidate) => candidate.id === id);
  if (!place) {
    throw new Error(`Missing city-plan gazetteer place: ${id}`);
  }
  return place;
}

describe("official city-plan gazetteer", () => {
  it("adds only the readable, named Kholinar and Azimir features", () => {
    expect(kholinarCityPlanGazetteer).toHaveLength(19);
    expect(azimirCityPlanGazetteer).toHaveLength(5);
    expect(cityPlanGazetteer).toHaveLength(24);
    expect(new Set(cityPlanGazetteer.map((place) => place.id)).size).toBe(24);

    expect(
      cityPlanGazetteer.some((place) =>
        /nice pub|dawn thunderclast|darn thunderclast/i.test(
          place.canonicalName,
        ),
      ),
    ).toBe(false);
  });

  it("preserves precise local-plan pixels without claiming precise global pins", () => {
    for (const place of cityPlanGazetteer) {
      expect(place.certainty).toBe("regional");
      expect(place.minimumLod).toBe("street");
      expect(place.sourceMapPixel).toBeNull();
      expect(place.referencePixel).not.toBeNull();
      expect(place.world).toEqual(referencePixelToWorld(place.referencePixel!));
      expect(place.renderable).toBe(true);
      expect(place.placementReference).toBeDefined();

      const placement = place.placementReference!;
      expect(placement.pixel[0]).toBeGreaterThanOrEqual(0);
      expect(placement.pixel[0]).toBeLessThanOrEqual(placement.size.width);
      expect(placement.pixel[1]).toBeGreaterThanOrEqual(0);
      expect(placement.pixel[1]).toBeLessThanOrEqual(placement.size.height);
    }

    expect(
      kholinarCityPlanGazetteer.every(
        (place) =>
          place.placementReference?.mapId === "kholinar-city-plan" &&
          place.placementReference.size === KHOLINAR_CITY_PLAN_SIZE,
      ),
    ).toBe(true);
    expect(
      azimirCityPlanGazetteer.every(
        (place) =>
          place.placementReference?.mapId === "azimir-city-plan" &&
          place.placementReference.size === AZIMIR_CITY_PLAN_SIZE,
      ),
    ).toBe(true);
    expect(
      kholinarCityPlanGazetteer.every(
        (place) => place.parentLocationId === "kholinar",
      ),
    ).toBe(true);
    expect(
      azimirCityPlanGazetteer.every(
        (place) => place.parentLocationId === "azir",
      ),
    ).toBe(true);
  });

  it("includes all ten numbered Herald temples shown on the Kholinar plan", () => {
    const temples = kholinarCityPlanGazetteer
      .filter((place) => place.id.startsWith("kholinar-temple-"))
      .map((place) => place.canonicalName);

    expect(temples).toEqual([
      "Temple of Jezerezeh",
      "Temple of Nalan",
      "Temple of Chanaranach",
      "Temple of Vedeledev",
      "Temple of Pailiah",
      "Temple of Shalash",
      "Temple of Battah",
      "Temple of Kelek",
      "Temple of Talenelat",
      "Temple of Ishi",
    ]);
  });

  it("retains the city-plan relationships needed for detailed layout", () => {
    const monasteryDais =
      byId("kholinar-monastery-dais").placementReference!.pixel;
    const marketRow = byId("kholinar-market-row").placementReference!.pixel;
    const orderOfTalenelat =
      byId("kholinar-order-of-talenelat").placementReference!.pixel;
    const templeOfTalenelat =
      byId("kholinar-temple-talenelat").placementReference!.pixel;

    expect(monasteryDais[1]).toBeGreaterThan(marketRow[1]);
    expect(Math.abs(orderOfTalenelat[0] - templeOfTalenelat[0])).toBeLessThan(
      20,
    );
    expect(Math.abs(orderOfTalenelat[1] - templeOfTalenelat[1])).toBeLessThan(
      20,
    );

    const palace = byId("azimir-bronze-palace").placementReference!.pixel;
    const grandMarket =
      byId("azimir-grand-market").placementReference!.pixel;
    const watchpost = byId(
      "azimir-watchpost-tower",
    ).placementReference!.pixel;
    const path = byId(
      "azimir-path-of-the-thunderclast",
    ).placementReference!.pixel;

    expect(grandMarket[1]).toBeGreaterThan(palace[1]);
    expect(path[0]).toBeLessThan(watchpost[0]);
  });

  it("registers city-plan pixels into their authored 3D city footprints", () => {
    const kholinarMarket = byId("kholinar-market-row");
    const kholinarFalls = byId("kholinar-impossible-falls");
    const azimirPalace = byId("azimir-bronze-palace");
    const azimirPath = byId("azimir-path-of-the-thunderclast");
    const kholinarMarketWorld = gazetteerMarkerWorld(kholinarMarket)!;
    const kholinarFallsWorld = gazetteerMarkerWorld(kholinarFalls)!;
    const azimirPalaceWorld = gazetteerMarkerWorld(azimirPalace)!;
    const azimirPathWorld = gazetteerMarkerWorld(azimirPath)!;

    expect(kholinarMarketWorld).not.toEqual(kholinarMarket.world);
    expect(kholinarFallsWorld[0]).toBeGreaterThan(kholinarMarketWorld[0]);
    expect(azimirPalaceWorld).not.toEqual(azimirPalace.world);
    expect(azimirPathWorld[0]).toBeLessThan(azimirPalaceWorld[0]);
    expect(
      Math.hypot(
        kholinarFallsWorld[0] - kholinarMarket.world![0],
        kholinarFallsWorld[1] - kholinarMarket.world![1],
      ),
    ).toBeLessThan(4.8);
  });

  it("gives every city-plan entry an auditable official-map source", () => {
    for (const place of cityPlanGazetteer) {
      expect(place.sources[0]?.url).toMatch(
        /^https:\/\/coppermind\.net\/wiki\/File:/,
      );
      for (const source of place.sources) {
        expect(source.title.length).toBeGreaterThan(5);
        expect(source.url).toMatch(/^https:\/\//);
      }
    }
  });
});
