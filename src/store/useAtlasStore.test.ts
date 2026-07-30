import { beforeEach, describe, expect, it } from "vitest";
import { useAtlasStore } from "./useAtlasStore";

describe("atlas selection recentering", () => {
  beforeEach(() => {
    useAtlasStore.setState({
      selectedId: "roshar",
      selectedGazetteerId: null,
      proximityLocationId: null,
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
    expect(focused.selectedId).toBe("vedenar");

    focused.recenterSelection();

    const recentered = useAtlasStore.getState();
    expect(recentered.selectedGazetteerId).toBe("vedenar");
    expect(recentered.selectedId).toBe("vedenar");
    expect(recentered.travelEpoch).toBe(focused.travelEpoch + 1);
  });

  it("clears a stale authored parent when focusing a standalone city", () => {
    useAtlasStore.setState({ selectedId: "kharbranth" });
    useAtlasStore.getState().focusGazetteerPlace("hearthstone");

    expect(useAtlasStore.getState()).toMatchObject({
      selectedId: "roshar",
      selectedGazetteerId: "hearthstone",
    });
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

  it("publishes camera proximity without triggering travel or changing an exact selection", () => {
    useAtlasStore.getState().focusGazetteerPlace("azimir");
    const before = useAtlasStore.getState();

    before.setProximityLocation("azir");

    expect(useAtlasStore.getState()).toMatchObject({
      selectedId: "azir",
      selectedGazetteerId: "azimir",
      proximityLocationId: "azir",
      travelEpoch: before.travelEpoch,
    });
  });

  it("clears observed proximity when a new trip begins", () => {
    useAtlasStore.setState({ proximityLocationId: "kharbranth" });

    useAtlasStore.getState().selectLocation("thaylen-city");

    expect(useAtlasStore.getState()).toMatchObject({
      selectedId: "thaylen-city",
      proximityLocationId: null,
    });
  });
});
