import { describe, expect, it } from "vitest";
import { PEDESTRIAN_RADIUS_LOCAL_UNITS } from "../scale";
import {
  createBalancedPopulationRouteAssignments,
  detailedPopulationLaneOffset,
} from "./populationRoutes";

describe("living-population route assignment", () => {
  it.each([1, 2, 3, 6, 7, 10, 13])(
    "balances an arbitrary population across %i routes",
    (routeCount) => {
      const assignments = createBalancedPopulationRouteAssignments(
        118,
        routeCount,
        "kharbranth",
      );
      const occupancy = Array.from({ length: routeCount }, () => 0);
      for (const assignment of assignments) {
        expect(assignment.routeIndex).toBeGreaterThanOrEqual(0);
        expect(assignment.routeIndex).toBeLessThan(routeCount);
        occupancy[assignment.routeIndex] += 1;
      }

      expect(Math.max(...occupancy) - Math.min(...occupancy)).toBeLessThanOrEqual(
        1,
      );
    },
  );

  it("is deterministic and gives every resident on a route a unique phase and occupancy slot", () => {
    const first = createBalancedPopulationRouteAssignments(
      73,
      6,
      "kharbranth",
    );
    const second = createBalancedPopulationRouteAssignments(
      73,
      6,
      "kharbranth",
    );

    expect(second).toEqual(first);
    for (let routeIndex = 0; routeIndex < 6; routeIndex += 1) {
      const route = first.filter(
        (assignment) => assignment.routeIndex === routeIndex,
      );
      expect(new Set(route.map((assignment) => assignment.routeSlot)).size).toBe(
        route.length,
      );
      expect(new Set(route.map((assignment) => assignment.phase)).size).toBe(
        route.length,
      );
      expect(
        new Set(route.map((assignment) => assignment.shelterProgress)).size,
      ).toBe(route.length);
      expect(
        new Set(route.map((assignment) => assignment.activityProgress)).size,
      ).toBe(route.length);
      expect(
        route.every(
          (assignment) => assignment.routeOccupancy === route.length,
        ),
      ).toBe(true);
    }
  });

  it("handles empty and invalid route counts without modulo failures", () => {
    expect(
      createBalancedPopulationRouteAssignments(12, 0, "urithiru"),
    ).toEqual([]);
    expect(
      createBalancedPopulationRouteAssignments(12, -4, "urithiru"),
    ).toEqual([]);
    expect(
      createBalancedPopulationRouteAssignments(0, 8, "urithiru"),
    ).toEqual([]);
  });

  it("alternates high-detail residents into human-clearance lanes", () => {
    const left = detailedPopulationLaneOffset(0);
    const right = detailedPopulationLaneOffset(1);

    expect(left).toBeLessThan(0);
    expect(right).toBeGreaterThan(0);
    expect(Math.abs(left)).toBeGreaterThan(
      PEDESTRIAN_RADIUS_LOCAL_UNITS * 2,
    );
    expect(detailedPopulationLaneOffset(2)).toBe(left);
  });

  it("reserves distinct phases and opposing lanes for the detailed tail of a combined crowd", () => {
    const assignments = createBalancedPopulationRouteAssignments(
      118,
      6,
      "kharbranth",
    );
    const detailed = assignments.slice(-10);

    for (let routeIndex = 0; routeIndex < 6; routeIndex += 1) {
      const residents = detailed.filter(
        (assignment) => assignment.routeIndex === routeIndex,
      );
      expect(new Set(residents.map((resident) => resident.phase)).size).toBe(
        residents.length,
      );
      if (residents.length > 1) {
        expect(
          new Set(
            residents.map((resident) =>
              detailedPopulationLaneOffset(resident.routeSlot),
            ),
          ).size,
        ).toBeGreaterThan(1);
      }
    }
  });
});
