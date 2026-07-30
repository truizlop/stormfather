import { describe, expect, it } from "vitest";
import { placeableGazetteer } from "./gazetteer";
import { locations } from "./locations";
import {
  buildSettlementLabelCandidates,
  layoutProjectedSettlementLabels,
  settlementLabelBudget,
  type ProjectedSettlementLabel,
} from "./settlementLabelLayout";

function candidates(
  overrides: Partial<
    Parameters<typeof buildSettlementLabelCandidates>[0]
  > = {},
) {
  return buildSettlementLabelCandidates({
    detailLevel: "region",
    selectedId: "roshar",
    selectedGazetteerId: null,
    proximityLocationId: null,
    locations,
    gazetteer: placeableGazetteer,
    ...overrides,
  });
}

function projected(
  id: string,
  x: number,
  y: number,
  options: Partial<ProjectedSettlementLabel> = {},
): ProjectedSettlementLabel {
  return {
    id,
    label: id,
    x,
    y,
    depth: 0,
    source: "gazetteer",
    kind: "town",
    authoredLocationId: null,
    selected: false,
    priority: 4_000,
    ...options,
  };
}

describe("settlement name roster", () => {
  it("adds placeable city, town, and village names at region zoom", () => {
    const region = candidates();
    const names = new Set(region.map((candidate) => candidate.label));

    expect(names).toContain("Kholinar");
    expect(names).toContain("Hearthstone");
    expect(region.some((candidate) => candidate.kind === "city")).toBe(true);
    expect(region.some((candidate) => candidate.kind === "town")).toBe(true);
    expect(region.some((candidate) => candidate.kind === "village")).toBe(true);
    expect(new Set(region.map((candidate) => candidate.id)).size).toBe(
      region.length,
    );
  });

  it("preserves authored overview labels without promoting regional towns too early", () => {
    const continent = candidates({ detailLevel: "continent" });
    const names = new Set(continent.map((candidate) => candidate.label));

    expect(names).toContain("Kholinar");
    expect(names).toContain("Urithiru");
    expect(names).not.toContain("Hearthstone");
  });

  it("suppresses every unrelated name as soon as a local city owns proximity", () => {
    const local = candidates({
      detailLevel: "region",
      proximityLocationId: "kharbranth",
      selectedId: "roshar",
    });

    expect(local).toHaveLength(1);
    expect(local[0]).toMatchObject({
      id: "kharbranth",
      label: "Kharbranth",
      selected: true,
    });
  });

  it("uses the exact selected intra-city name for the owning authored model", () => {
    const local = candidates({
      detailLevel: "city",
      proximityLocationId: "kharbranth",
      selectedGazetteerId: "great-concourse-kharbranth",
    });

    expect(local).toHaveLength(1);
    expect(local[0]?.label).toBe("Great Concourse of Kharbranth");
  });

  it("keeps an exact standalone settlement name at city zoom", () => {
    const local = candidates({
      detailLevel: "city",
      selectedId: "roshar",
      selectedGazetteerId: "hearthstone",
    });

    expect(local).toHaveLength(1);
    expect(local[0]).toMatchObject({
      id: "hearthstone",
      label: "Hearthstone",
      selected: true,
    });
  });

  it("preserves the previous street policy by leaving settlement names off", () => {
    expect(
      candidates({
        detailLevel: "street",
        proximityLocationId: "kharbranth",
      }),
    ).toEqual([]);
  });
});

describe("settlement name screen-space layout", () => {
  it("keeps a selected label when candidates collide", () => {
    const placed = layoutProjectedSettlementLabels(
      [
        projected("ordinary", 400, 300, { priority: 9_000 }),
        projected("selected", 400, 300, {
          selected: true,
          priority: 1,
        }),
      ],
      { width: 800, height: 600 },
      "region",
    );

    expect(placed.map((label) => label.id)).toEqual(["selected"]);
  });

  it("filters labels behind the camera and inside the top application chrome", () => {
    const placed = layoutProjectedSettlementLabels(
      [
        projected("behind", 300, 200, { depth: 1.2 }),
        projected("under-header", 300, 30),
        projected("visible", 300, 100),
      ],
      { width: 800, height: 600 },
      "region",
    );

    expect(placed.map((label) => label.id)).toEqual(["visible"]);
  });

  it("keeps compact labels clear of the header, travel dock, and control rail", () => {
    const placed = layoutProjectedSettlementLabels(
      [
        projected("under-header", 190, 70),
        projected("under-dock", 190, 710),
        projected("under-controls", 355, 300),
        projected("visible", 190, 300),
      ],
      { width: 390, height: 844 },
      "region",
    );

    expect(placed.map((label) => label.id)).toEqual(["visible"]);
  });

  it("uses compact reserves on a short landscape viewport", () => {
    const placed = layoutProjectedSettlementLabels(
      [
        projected("under-dock", 400, 455),
        projected("under-controls", 920, 250),
        projected("visible", 400, 250),
      ],
      { width: 960, height: 540 },
      "region",
    );

    expect(placed.map((label) => label.id)).toEqual(["visible"]);
  });

  it("uses conservative mobile and desktop budgets without measuring DOM", () => {
    const labels = Array.from({ length: 50 }, (_, index) =>
      projected(
        `place-${index}`,
        30 + (index % 10) * 65,
        90 + Math.floor(index / 10) * 65,
      ),
    );
    const mobileBudget = settlementLabelBudget("region", 600, 800);
    const landscapeBudget = settlementLabelBudget("region", 960, 540);
    const desktopBudget = settlementLabelBudget("region", 1_440, 900);
    const mobile = layoutProjectedSettlementLabels(
      labels,
      { width: 600, height: 800 },
      "region",
    );
    const desktop = layoutProjectedSettlementLabels(
      labels,
      { width: 1_440, height: 900 },
      "region",
    );

    expect(mobileBudget).toBeLessThan(desktopBudget);
    expect(landscapeBudget).toBe(mobileBudget);
    expect(mobile.length).toBeLessThanOrEqual(mobileBudget);
    expect(desktop.length).toBeLessThanOrEqual(desktopBudget);
  });
});
