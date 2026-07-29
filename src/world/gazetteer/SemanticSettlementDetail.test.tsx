import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { gazetteerById } from "./catalog";
import { SemanticSettlementDetail } from "./SemanticSettlementDetail";
import { semanticSettlementProfiles } from "./semanticSettlements";

const textureMocks = vi.hoisted(() => {
  const clones: Array<{
    dispose: ReturnType<typeof vi.fn>;
    repeat: { set: ReturnType<typeof vi.fn> };
  }> = [];
  const sources = Array.from({ length: 4 }, () => ({
    clone: vi.fn(() => {
      const clone = {
        dispose: vi.fn(),
        repeat: { set: vi.fn() },
      };
      clones.push(clone);
      return clone;
    }),
  }));
  return { clones, sources };
});

vi.mock("@react-three/drei", () => ({
  useTexture: () => textureMocks.sources,
}));

vi.mock("@react-three/fiber", () => ({
  useFrame: () => undefined,
  useThree: (
    selector: (state: { size: { width: number } }) => unknown,
  ) => selector({ size: { width: 1024 } }),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useLayoutEffect: () => undefined,
  };
});

describe("SemanticSettlementDetail texture lifecycle", () => {
  it("disposes every configured texture clone on unmount", () => {
    textureMocks.clones.length = 0;
    const place = gazetteerById.get("hearthstone")!;
    const { unmount } = render(
      <SemanticSettlementDetail
        place={place}
        markerWorld={place.world!}
        detailLevel="city"
        profile={semanticSettlementProfiles.hearthstone}
      />,
    );

    expect(textureMocks.clones).toHaveLength(4);
    expect(textureMocks.clones.every((clone) => clone.dispose.mock.calls.length === 0)).toBe(
      true,
    );

    unmount();

    for (const clone of textureMocks.clones) {
      expect(clone.dispose).toHaveBeenCalledTimes(1);
    }
  });
});
