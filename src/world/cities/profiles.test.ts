import { describe, expect, it } from "vitest";
import { localToMeters } from "../scale";
import {
  createDistrictLayout,
  footprintContactAt,
  MAX_AUTHORED_MODULE_FOUNDATION_DROP,
  moduleMetrics,
  usesProceduralArchitecture,
} from "./districtLayout";
import {
  landmarkLocalScale,
  landmarkPlanDimensions,
} from "./landmarkMetrics";
import { cityProfile } from "./profiles";

describe("city architecture profiles", () => {
  it("gives Kharbranth a denser port grammar", () => {
    const profile = cityProfile("kharbranth", "alethi");
    expect(profile.activity).toBe("port");
    expect(profile.density).toBeGreaterThan(1);
    expect(profile.modules).toContain("Module_Dock_Crane");
  });

  it("keeps Purelake sparse and water-oriented", () => {
    const profile = cityProfile("purelake", "purelaker");
    expect(profile.activity).toBe("lake");
    expect(profile.roof).toBe("dome");
    expect(profile.density).toBeLessThan(0.7);
  });

  it("assigns the bridge kit to the Shattered Plains", () => {
    const profile = cityProfile("shattered-plains", "singer");
    expect(profile.modules).toContain("Module_Rope_Bridge");
  });

  it("gives Vedenar a dense terraced-fortress identity", () => {
    const profile = cityProfile("vedenar", "veden");

    expect(profile.activity).toBe("fortress");
    expect(profile.roof).toBe("pitched");
    expect(profile.radius).toBe(4.9);
    expect(profile.modules).toContain("Module_Terraced_House");
    expect(profile.modules).toContain("Module_Warcamp_Scaffold");
  });

  it("fits Blender landmarks to the same diameter as their local district", () => {
    const profile = cityProfile("kharbranth", "alethi");
    const plan = landmarkPlanDimensions("Landmark_Kharbranth")!;
    const scale = landmarkLocalScale("Landmark_Kharbranth", profile);
    expect(Math.max(...plan) * scale).toBeCloseTo(profile.radius * 2);
  });

  it("does not stack procedural buildings through authored landmark cities", () => {
    expect(usesProceduralArchitecture("kharbranth")).toBe(false);
    const profile = cityProfile("kharbranth", "alethi");
    const layout = createDistrictLayout(
      profile,
      "kharbranth",
      [10, 18],
      "street",
      1280,
    );
    expect(layout.buildings).toHaveLength(0);
    expect(layout.modules.length).toBeGreaterThan(0);
    expect(
      layout.modules.every(
        (module) =>
          module.foundationDrop <=
          MAX_AUTHORED_MODULE_FOUNDATION_DROP,
      ),
    ).toBe(true);
  });

  it("fits Vedenar's authored root without stacking a generic district", () => {
    const profile = cityProfile("vedenar", "veden");
    const plan = landmarkPlanDimensions("Landmark_Vedenar")!;
    const scale = landmarkLocalScale("Landmark_Vedenar", profile);
    const layout = createDistrictLayout(
      profile,
      "vedenar",
      [13.25711084817365, 9.719221057177],
      "street",
      1280,
    );

    expect(Math.max(...plan) * scale).toBeCloseTo(
      profile.radius * 2,
    );
    expect(usesProceduralArchitecture("vedenar")).toBe(false);
    expect(layout.buildings).toHaveLength(0);
    expect(layout.modules.length).toBeGreaterThan(0);
    expect(
      layout.modules.every(
        (module) =>
          module.foundationDrop <=
          MAX_AUTHORED_MODULE_FOUNDATION_DROP,
      ),
    ).toBe(true);
  });

  it("rejects Shinovar modules that would become mountain-height pylons", () => {
    const profile = cityProfile("shinovar", "shin");
    const layout = createDistrictLayout(
      profile,
      "shinovar",
      [-39, -2.5],
      "street",
      1280,
    );

    expect(layout.modules.length).toBeGreaterThan(0);
    expect(
      Math.max(
        ...layout.modules.map((module) => module.foundationDrop),
      ),
    ).toBeLessThanOrEqual(MAX_AUTHORED_MODULE_FOUNDATION_DROP);
  });

  it("keeps procedural buildings and authored modules on architectural scale", () => {
    const profile = cityProfile("thaylen-city", "thaylen");
    const layout = createDistrictLayout(
      profile,
      "thaylen-city",
      [9, 24],
      "street",
      1280,
    );
    expect(Math.min(...layout.buildings.map((seed) => localToMeters(seed.height)))).toBeGreaterThan(
      3,
    );
    for (const module of layout.modules) {
      const metric = moduleMetrics[module.name];
      expect(localToMeters(metric.height * module.scale)).toBeGreaterThan(2.4);
      expect(module.foundationDrop).toBeGreaterThanOrEqual(0.035);
    }
    expect(
      layout.buildings.every((building) => building.foundationDrop >= 0.045),
    ).toBe(true);
  });

  it("samples rotated footprints and allocates terrain-reaching foundations", () => {
    const contact = footprintContactAt(
      "jah-keved",
      14,
      -4,
      1.6,
      1.2,
      0.43,
    );
    expect(Number.isFinite(contact.y)).toBe(true);
    expect(contact.foundationDrop).toBeGreaterThan(0.045);
  });
});
