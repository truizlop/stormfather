import { describe, expect, it } from "vitest";
import { riverPaths } from "../cartography/geography";
import {
  createRiverBankGeometry,
  createRiverSurfaceGeometry,
  riverDepressionAt,
  riverWidthAt,
  sampleRiver,
} from "./riverChannels";

describe("modeled river channels", () => {
  it("widens drainage trunks progressively and flares their estuaries", () => {
    const headwater = riverWidthAt(0.16, 0);
    const middle = riverWidthAt(0.16, 0.5);
    const mouth = riverWidthAt(0.16, 1);

    expect(headwater).toBeLessThan(middle);
    expect(middle).toBeLessThan(mouth);
    expect(mouth).toBeGreaterThan(headwater * 5);
  });

  it("retains source and mouth positions while smoothing between waypoints", () => {
    const river = riverPaths[0];
    const samples = sampleRiver(river, 0.18);

    expect(samples.length).toBeGreaterThan(river.points.length * 3);
    expect([samples[0].x, samples[0].z]).toEqual(river.points[0]);
    expect([samples.at(-1)?.x, samples.at(-1)?.z]).toEqual(
      river.points.at(-1),
    );
    expect(samples.at(-1)?.progress).toBeCloseTo(1, 8);
  });

  it("carves shallow terrain depressions along canonical channels", () => {
    for (const river of riverPaths) {
      const middle = river.points[Math.floor(river.points.length / 2)];
      expect(riverDepressionAt(middle[0], middle[1])).toBeLessThan(-0.025);
    }
    expect(riverDepressionAt(-58, 23)).toBe(0);
  });

  it("builds bounded merged geometry for mobile-friendly draw calls", () => {
    const surface = createRiverSurfaceGeometry(0.34);
    const banks = createRiverBankGeometry(0.34);

    expect(surface.getAttribute("position").count).toBeGreaterThan(200);
    expect(surface.getAttribute("aProgress").count).toBe(
      surface.getAttribute("position").count,
    );
    expect(banks.getAttribute("position").count).toBeGreaterThan(
      surface.getAttribute("position").count,
    );

    surface.dispose();
    banks.dispose();
  });
});
