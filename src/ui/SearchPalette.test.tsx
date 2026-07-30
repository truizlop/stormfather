import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAtlasStore } from "../store/useAtlasStore";
import { COMPACT_VIEWPORT_MEDIA_QUERY } from "../world/compactViewport";
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
    vi.unstubAllGlobals();
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

  it("bounds the empty compact catalog while keeping deeper places searchable", () => {
    const matchMedia = vi.fn(
      (query: string) =>
        ({
          matches: query === COMPACT_VIEWPORT_MEDIA_QUERY,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(() => true),
        }) as MediaQueryList,
    );
    vi.stubGlobal("matchMedia", matchMedia);

    render(<SearchPalette />);

    expect(matchMedia).toHaveBeenCalledWith(COMPACT_VIEWPORT_MEDIA_QUERY);
    const refinementNotice = screen.getByText(
      /Showing 48 of \d+ matches\. Keep typing to narrow the atlas\./,
    );
    const resultList =
      refinementNotice.closest<HTMLElement>(".search-results");
    expect(resultList).not.toBeNull();
    expect(within(resultList!).getAllByRole("button")).toHaveLength(48);
    expect(
      within(resultList!).queryByText("Sesemalex Dar", {
        selector: "strong",
        exact: true,
      }),
    ).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "Search Roshar locations",
      }),
      { target: { value: "Sesemalex Dar" } },
    );

    expect(
      screen.getByText("Sesemalex Dar", {
        selector: "strong",
        exact: true,
      }),
    ).toBeVisible();
  });
});
