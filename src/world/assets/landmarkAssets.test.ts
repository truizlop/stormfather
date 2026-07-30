import { describe, expect, it } from "vitest";
import {
  hasLandmarkAsset,
  landmarkAssetUrl,
  LANDMARK_RUNTIME_KIT_URL,
} from "./landmarkAssets";

describe("split landmark asset routing", () => {
  it("routes each authored city root to its own GLB", () => {
    expect(landmarkAssetUrl("Landmark_Kharbranth")).toMatch(
      /models\/landmarks\/kharbranth\.glb$/,
    );
    expect(landmarkAssetUrl("Landmark_Shattered_Plains")).toMatch(
      /models\/landmarks\/shattered-plains\.glb$/,
    );
    expect(landmarkAssetUrl("Landmark_ThaylenCity")).toMatch(
      /models\/landmarks\/thaylen-city\.glb$/,
    );
  });

  it("keeps cross-city actors and modules in a shared runtime kit", () => {
    expect(LANDMARK_RUNTIME_KIT_URL).toMatch(
      /models\/landmarks\/runtime-kit\.glb$/,
    );
  });

  it("rejects roots that do not have an authored city asset", () => {
    expect(hasLandmarkAsset("Landmark_Vedenar")).toBe(true);
    expect(hasLandmarkAsset("Landmark_NotAuthored")).toBe(false);
    expect(() => landmarkAssetUrl("Landmark_NotAuthored")).toThrow(
      /No split landmark asset registered/,
    );
  });
});
