import { describe, expect, it } from "vitest";
import { detailFromDistance } from "./coordinates";
import { gazetteerArrivalOffset } from "./cameraArrival";

describe("gazetteer arrival framing", () => {
  it.each(["hearthstone", "vedenar", "sesemalex-dar"] as const)(
    "lands the semantic settlement %s at visible city detail",
    (id) => {
      for (const mobile of [false, true]) {
        const offset = gazetteerArrivalOffset(
          { id, minimumLod: "region" },
          mobile,
        );
        expect(detailFromDistance(Math.hypot(...offset))).toBe("city");
      }
    },
  );

  it("keeps an ordinary regional feature at regional framing", () => {
    const offset = gazetteerArrivalOffset(
      { id: "horneater-peaks", minimumLod: "region" },
      false,
    );
    expect(detailFromDistance(Math.hypot(...offset))).toBe("region");
  });
});
