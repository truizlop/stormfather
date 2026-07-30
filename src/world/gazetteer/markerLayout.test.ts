import { describe, expect, it } from "vitest";
import { terrainHeightAt } from "../terrain/terrainHeight";
import { gazetteerById } from "./catalog";
import { literaryPlaceGazetteer } from "./literaryPlaces";
import {
  gazetteerMarkerWorld,
  gazetteerMarkerY,
  isGazetteerPlaceVisibleInLocalLens,
  layoutGazetteerMarkerWorlds,
} from "./markerLayout";

describe("gazetteer regional marker layout", () => {
  it("keeps atlas miniatures out of authored local city compositions", () => {
    expect(
      isGazetteerPlaceVisibleInLocalLens(
        "ayabiza",
        "city",
        null,
        "shinovar",
      ),
    ).toBe(false);
    expect(
      isGazetteerPlaceVisibleInLocalLens(
        "shinovar",
        "street",
        "shinovar",
        "shinovar",
      ),
    ).toBe(false);
    expect(
      isGazetteerPlaceVisibleInLocalLens(
        "kholinar-palace",
        "street",
        "kholinar-palace",
        "kholinar",
      ),
    ).toBe(true);
    expect(
      isGazetteerPlaceVisibleInLocalLens(
        "ayabiza",
        "region",
        null,
        "shinovar",
      ),
    ).toBe(true);
  });

  it("fans co-located regional records without mutating source coordinates", () => {
    const bavlandNames = new Set([
      "Bornwater",
      "Ironsway",
      "Kneespike",
      "Staplind",
    ]);
    const places = literaryPlaceGazetteer.filter((place) =>
      bavlandNames.has(place.canonicalName),
    );
    const originalWorlds = places.map((place) => place.world);
    const placements = layoutGazetteerMarkerWorlds(places);

    expect(placements).toHaveLength(4);
    expect(
      new Set(
        placements.map(({ world }) => `${world[0].toFixed(6)}:${world[1].toFixed(6)}`),
      ).size,
    ).toBe(4);
    expect(
      placements.every(
        ({ regionalClusterIndex, regionalClusterSize }) =>
          regionalClusterIndex !== null && regionalClusterSize === 4,
      ),
    ).toBe(true);
    expect(places.map((place) => place.world)).toEqual(originalWorlds);

    for (const placement of placements) {
      const sourceWorld = gazetteerMarkerWorld(placement.place);
      expect(sourceWorld).not.toBeNull();
      expect(
        Math.hypot(
          placement.world[0] - sourceWorld![0],
          placement.world[1] - sourceWorld![1],
        ),
      ).toBeLessThan(0.6);
      expect(
        gazetteerMarkerY(placement.place, placement.world),
      ).toBeCloseTo(
        terrainHeightAt(placement.world[0], placement.world[1]) + 0.025,
        8,
      );
    }
  });

  it("leaves a precise parent at its canonical point while fanning regional children", () => {
    const kharbranth = gazetteerById.get("kharbranth");
    const children = literaryPlaceGazetteer.filter(
      (place) => place.parentLocationId === "kharbranth",
    );
    expect(kharbranth).toBeDefined();
    expect(children).toHaveLength(3);

    const placements = layoutGazetteerMarkerWorlds([
      kharbranth!,
      ...children,
    ]);
    const parentPlacement = placements.find(
      ({ place }) => place.id === "kharbranth",
    );
    const childPlacements = placements.filter(
      ({ place }) => place.parentLocationId === "kharbranth",
    );

    expect(parentPlacement?.world).toEqual(gazetteerMarkerWorld(kharbranth!));
    expect(parentPlacement?.regionalClusterIndex).toBeNull();
    expect(
      childPlacements.every(
        ({ regionalClusterIndex, regionalClusterSize }) =>
          regionalClusterIndex !== null && regionalClusterSize === 3,
      ),
    ).toBe(true);
  });

  it("leaves registered city-plan points untouched", () => {
    const cityPlanPlaces = [
      gazetteerById.get("kholinar-palace"),
      gazetteerById.get("kholinar-dueling-arena"),
    ].filter((place) => place !== undefined);
    expect(cityPlanPlaces).toHaveLength(2);

    const placements = layoutGazetteerMarkerWorlds(cityPlanPlaces);
    for (const placement of placements) {
      expect(placement.world).toEqual(gazetteerMarkerWorld(placement.place));
      expect(placement.regionalClusterIndex).toBeNull();
      expect(placement.regionalClusterSize).toBe(1);
    }
  });
});
