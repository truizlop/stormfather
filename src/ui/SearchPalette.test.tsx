import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAtlasStore } from "../store/useAtlasStore";
import { locationById } from "../world/locations";
import { searchRosharCatalog } from "./searchCatalog";
import { SearchPalette } from "./SearchPalette";

const modeledGazetteerCities = [
  {
    query: "Azimir",
    gazetteerId: "azimir",
    destinationId: "azir",
    modelRoot: "Landmark_Azimir",
  },
  {
    query: "Akinah",
    gazetteerId: "akinah",
    destinationId: "aimia",
    modelRoot: "Landmark_Akinah",
  },
] as const;

describe("SearchPalette modeled gazetteer city routing", () => {
  beforeEach(() => {
    useAtlasStore.setState({
      selectedId: "roshar",
      selectedGazetteerId: null,
      travelEpoch: 0,
      stormMode: false,
      searchOpen: true,
      locationPanelOpen: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it.each(modeledGazetteerCities)(
    "loads the $query destination model while retaining its gazetteer selection",
    ({ query, gazetteerId, destinationId, modelRoot }) => {
      const result = searchRosharCatalog(query).find(
        (candidate) =>
          candidate.type === "gazetteer" &&
          candidate.place.id === gazetteerId,
      );
      expect(result).toMatchObject({
        type: "gazetteer",
        place: {
          id: gazetteerId,
          parentLocationId: destinationId,
        },
      });

      render(<SearchPalette />);
      fireEvent.change(
        screen.getByRole("searchbox", {
          name: "Search Roshar locations",
        }),
        { target: { value: query } },
      );
      const cityResult = screen
        .getByText(query, { selector: "strong", exact: true })
        .closest("button");
      expect(cityResult).not.toBeNull();
      fireEvent.click(cityResult!);

      const state = useAtlasStore.getState();
      expect(state.selectedId).toBe(destinationId);
      expect(state.selectedGazetteerId).toBe(gazetteerId);
      expect(state.searchOpen).toBe(false);
      expect(state.locationPanelOpen).toBe(true);
      expect(locationById.get(state.selectedId)?.modelRoot).toBe(modelRoot);
    },
  );
});
