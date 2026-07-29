import { describe, expect, it } from "vitest";
import { destinationAnchors } from "../cartography/geography";
import { stormXAtTime } from "../weather/storm";
import {
  DETAILED_LOCATION_IDS,
  OCEAN_WATER_HEIGHT,
  PURELAKE_BASE_WATER_HEIGHT,
  detailedLocationSurface,
  isSettlementPointWalkable,
  settlementSupportY,
  settlementWalkableY,
  settlementWaterY,
} from "./locationSurface";

describe("detailed location surface contracts", () => {
  it("covers every authored destination with finite support and walk heights", () => {
    expect(DETAILED_LOCATION_IDS).toHaveLength(9);
    for (const locationId of DETAILED_LOCATION_IDS) {
      const surface = detailedLocationSurface(locationId);
      const center = destinationAnchors[locationId];
      expect(surface?.id).toBe(locationId);
      expect(surface?.influenceRadius).toBeGreaterThan(4);
      expect(settlementSupportY(locationId, ...center)).toSatisfy(
        Number.isFinite,
      );
      expect(settlementWalkableY(locationId, ...center)).toSatisfy(
        Number.isFinite,
      );
      expect(surface?.maximumWalkSlope).toBeGreaterThan(0);
      expect(surface?.maximumStepHeight).toBeGreaterThan(0);
    }
  });

  it("returns no authored contract for an ordinary semantic settlement", () => {
    expect(detailedLocationSurface("hearthstone")).toBeNull();
    expect(settlementWaterY("hearthstone")).toBeNull();
  });

  it("keeps Kharbranth's authored Ralinsa terraces vertically distinct", () => {
    const [centerX, centerZ] = destinationAnchors.kharbranth;
    const lower = settlementWalkableY(
      "kharbranth",
      centerX,
      centerZ + 3.4,
    );
    const upper = settlementWalkableY(
      "kharbranth",
      centerX,
      centerZ - 2.8,
    );
    expect(upper).toBeGreaterThan(lower + 1.2);
  });

  it("shares the ocean datum with Akinah and both authored harbors", () => {
    expect(settlementWaterY("aimia")).toBe(OCEAN_WATER_HEIGHT);
    expect(settlementWaterY("kharbranth")).toBe(OCEAN_WATER_HEIGHT);
    expect(settlementWaterY("thaylen-city")).toBe(OCEAN_WATER_HEIGHT);
  });

  it("drains the Purelake ahead of the highstorm", () => {
    const calm = settlementWaterY("purelake", 0)!;
    const arrivalTime =
      ((54 - destinationAnchors.purelake[0]) / 108) * 210;
    const draining = settlementWaterY("purelake", arrivalTime)!;
    expect(calm).toBeCloseTo(PURELAKE_BASE_WATER_HEIGHT);
    expect(stormXAtTime(arrivalTime)).toBeCloseTo(
      destinationAnchors.purelake[0],
    );
    expect(draining).toBeLessThan(calm - 0.035);
  });

  it("distinguishes Purelake footings from open pedestrian water", () => {
    const [centerX, centerZ] = destinationAnchors.purelake;
    expect(
      isSettlementPointWalkable("purelake", centerX, centerZ),
    ).toBe(true);
    expect(
      isSettlementPointWalkable(
        "purelake",
        centerX,
        centerZ + 2.2,
      ),
    ).toBe(false);
    expect(
      isSettlementPointWalkable(
        "purelake",
        centerX,
        centerZ + 2.2,
        "watercraft",
      ),
    ).toBe(true);
  });

  it("keeps Shattered Plains pedestrians on authored plateaus", () => {
    const [centerX, centerZ] = destinationAnchors["shattered-plains"];
    expect(
      isSettlementPointWalkable(
        "shattered-plains",
        centerX - 3.15,
        centerZ - 1.8,
      ),
    ).toBe(true);
    expect(
      isSettlementPointWalkable(
        "shattered-plains",
        centerX - 1.25,
        centerZ - 0.9,
      ),
    ).toBe(false);
  });
});
