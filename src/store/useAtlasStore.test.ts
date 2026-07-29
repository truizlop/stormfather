import { beforeEach, describe, expect, it } from "vitest";
import { useAtlasStore } from "./useAtlasStore";

describe("atlas selection recentering", () => {
  beforeEach(() => {
    useAtlasStore.setState({
      selectedId: "roshar",
      selectedGazetteerId: null,
      travelEpoch: 0,
      stormMode: false,
      menuOpen: false,
      searchOpen: false,
      locationPanelOpen: true,
    });
  });

  it("restarts camera travel without discarding an exact gazetteer city", () => {
    useAtlasStore.setState({ selectedId: "urithiru" });
    useAtlasStore.getState().focusGazetteerPlace("vedenar");
    const focused = useAtlasStore.getState();

    expect(focused.selectedGazetteerId).toBe("vedenar");
    expect(focused.selectedId).toBe("urithiru");

    focused.recenterSelection();

    const recentered = useAtlasStore.getState();
    expect(recentered.selectedGazetteerId).toBe("vedenar");
    expect(recentered.selectedId).toBe("urithiru");
    expect(recentered.travelEpoch).toBe(focused.travelEpoch + 1);
  });

  it("keeps a modeled gazetteer alias routed to its authored parent", () => {
    useAtlasStore.getState().focusGazetteerPlace("azimir");
    useAtlasStore.getState().recenterSelection();

    expect(useAtlasStore.getState()).toMatchObject({
      selectedId: "azir",
      selectedGazetteerId: "azimir",
      travelEpoch: 2,
    });
  });
});
