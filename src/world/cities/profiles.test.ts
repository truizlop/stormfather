import { describe, expect, it } from "vitest";
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
});
