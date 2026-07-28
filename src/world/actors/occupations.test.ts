import { describe, expect, it } from "vitest";
import { occupationsFor } from "./occupations";

describe("inhabitant occupations", () => {
  it("gives Kharbranth porters, surgeons, and sailors", () => {
    const occupations = occupationsFor("kharbranth", "alethi");
    expect(occupations).toContain("porter");
    expect(occupations).toContain("surgeon");
    expect(occupations).toContain("sailor");
  });

  it("gives the Shattered Plains visible camp work", () => {
    const occupations = occupationsFor("shattered-plains", "singer");
    expect(occupations).toContain("builder");
    expect(occupations).toContain("porter");
    expect(occupations).toContain("guard");
  });

  it("weights Purelake toward fishing", () => {
    const occupations = occupationsFor("purelake", "purelaker");
    expect(occupations.filter((value) => value === "fisher").length).toBe(2);
  });
});
