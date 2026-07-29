import { describe, expect, it } from "vitest";
import { gazetteerById } from "./catalog";
import {
  createSemanticSettlementLayout,
  isSemanticSettlementDetailEligible,
  semanticSettlementIds,
  semanticSettlementProfile,
  semanticSettlementProfiles,
} from "./semanticSettlements";

describe("selected semantic settlement profiles", () => {
  it("defines a distinct visual and activity identity for all eight settlements", () => {
    expect(Object.keys(semanticSettlementProfiles)).toEqual([
      ...semanticSettlementIds,
    ]);
    const profiles = semanticSettlementIds.map(
      (id) => semanticSettlementProfiles[id],
    );

    expect(new Set(profiles.map((profile) => profile.layout)).size).toBe(8);
    expect(new Set(profiles.map((profile) => profile.signature)).size).toBe(8);
    expect(new Set(profiles.map((profile) => profile.activity)).size).toBe(8);
    for (const profile of profiles) {
      expect(profile.radius).toBeGreaterThan(2);
      expect(profile.buildingCount.street).toBeGreaterThan(
        profile.buildingCount.city,
      );
      expect(profile.palette.length).toBeGreaterThanOrEqual(3);
      expect(profile.roofPalette.length).toBeGreaterThanOrEqual(2);
      expect(semanticSettlementProfile(profile.id)).toBe(profile);
    }
    expect(semanticSettlementProfile("kholinar")).toBeUndefined();
  });

  it("only replaces selected profile markers at city and street detail", () => {
    for (const id of semanticSettlementIds) {
      const place = gazetteerById.get(id);
      expect(place, id).toBeDefined();
      expect(isSemanticSettlementDetailEligible(place, "continent")).toBe(
        false,
      );
      expect(isSemanticSettlementDetailEligible(place, "region")).toBe(false);
      expect(isSemanticSettlementDetailEligible(place, "city")).toBe(true);
      expect(isSemanticSettlementDetailEligible(place, "street")).toBe(true);
    }

    expect(
      isSemanticSettlementDetailEligible(
        gazetteerById.get("kholinar"),
        "street",
      ),
    ).toBe(false);
    expect(
      isSemanticSettlementDetailEligible(
        {
          ...gazetteerById.get("hearthstone")!,
          renderable: false,
        },
        "street",
      ),
    ).toBe(false);
  });

  it("creates deterministic, terrain-seated districts for every profile", () => {
    const center = [12, -7] as const;
    const heightAt = (x: number, z: number) =>
      1.4 + x * 0.035 - z * 0.028;

    for (const id of semanticSettlementIds) {
      const profile = semanticSettlementProfiles[id];
      const layout = createSemanticSettlementLayout(
        profile,
        center,
        "street",
        false,
        heightAt,
      );
      const repeated = createSemanticSettlementLayout(
        profile,
        center,
        "street",
        false,
        heightAt,
      );

      expect(layout).toEqual(repeated);
      expect(layout.buildings).toHaveLength(profile.buildingCount.street);
      expect(layout.paving.length).toBeGreaterThan(50);
      expect(layout.activity.length).toBeGreaterThan(10);
      expect(layout.signature.length).toBeGreaterThan(4);

      for (const building of layout.buildings) {
        expect(Math.hypot(building.x, building.z)).toBeGreaterThanOrEqual(
          0.979999,
        );
        const cosine = Math.cos(building.rotation);
        const sine = Math.sin(building.rotation);
        const halfWidth = building.width * 0.54;
        const halfDepth = building.depth * 0.54;
        const samples = [
          [0, 0],
          [-halfWidth, -halfDepth],
          [halfWidth, -halfDepth],
          [-halfWidth, halfDepth],
          [halfWidth, halfDepth],
        ] as const;
        const heights = samples.map(([x, z]) =>
          heightAt(
            center[0] + building.x + x * cosine + z * sine,
            center[1] + building.z - x * sine + z * cosine,
          ),
        );
        expect(building.y).toBeCloseTo(Math.max(...heights) - 0.006);
        expect(building.y - building.foundationDrop).toBeLessThan(
          Math.min(...heights),
        );
      }
    }
  });

  it("reduces selected-district budgets on compact viewports", () => {
    const profile = semanticSettlementProfiles.vedenar;
    const heightAt = () => 1;
    const full = createSemanticSettlementLayout(
      profile,
      [0, 0],
      "street",
      false,
      heightAt,
    );
    const compact = createSemanticSettlementLayout(
      profile,
      [0, 0],
      "street",
      true,
      heightAt,
    );

    expect(compact.buildings.length).toBeLessThan(full.buildings.length);
    expect(compact.paving.length).toBeLessThan(full.paving.length);
    expect(compact.activity.length).toBeLessThan(full.activity.length);
  });
});
