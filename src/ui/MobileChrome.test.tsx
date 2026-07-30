import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAtlasStore } from "../store/useAtlasStore";
import { locations } from "../world/locations";
import { MobileChrome } from "./MobileChrome";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("MobileChrome", () => {
  beforeEach(() => {
    useAtlasStore.setState({
      selectedId: "roshar",
      selectedGazetteerId: null,
      proximityLocationId: null,
      travelEpoch: 0,
      simulationTime: 12,
      isPlaying: true,
      detailLevel: "continent",
      stormMode: false,
      nightMode: false,
      menuOpen: false,
      searchOpen: false,
      locationPanelOpen: true,
      frontiersVisible: true,
      toast: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps the selected destination and next-detail action available when collapsed", () => {
    render(<MobileChrome />);

    expect(
      screen.getByRole("region", { name: "Selected location: Roshar" }),
    ).toBeVisible();
    expect(screen.getByText("Roshar", { selector: "strong" })).toBeVisible();
    expect(
      screen.getByText("The storm-shaped continent"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Explore/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("dialog", { name: /Travel Roshar/i }),
    ).not.toBeInTheDocument();
  });

  it("offers Highstorm and every authored destination in the expanded sheet", () => {
    useAtlasStore.setState({ menuOpen: true });

    render(<MobileChrome />);

    const dialog = screen.getByRole("dialog", { name: /Travel Roshar/i });
    expect(
      within(dialog).getByRole("button", {
        name: /Find a city, kingdom, or landmark/i,
      }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: /Highstorm/i }),
    ).toBeVisible();

    for (const location of locations) {
      expect(
        within(dialog).getByRole("button", {
          name: new RegExp(`^${escapeRegExp(location.name)}`, "i"),
        }),
      ).toBeVisible();
    }
  });

  it("marks the current destination in the expanded list", () => {
    useAtlasStore.setState({
      selectedId: "vedenar",
      menuOpen: true,
    });

    render(<MobileChrome />);

    const dialog = screen.getByRole("dialog", { name: /Travel Roshar/i });
    expect(
      within(dialog).getByRole("button", { name: /Vedenar/i }),
    ).toHaveAttribute("aria-current", "location");
  });

  it("hands off from travel to the global search overlay", () => {
    useAtlasStore.setState({ menuOpen: true });

    render(<MobileChrome />);

    const dialog = screen.getByRole("dialog", { name: /Travel Roshar/i });
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: /Find a city, kingdom, or landmark/i,
      }),
    );

    expect(useAtlasStore.getState()).toMatchObject({
      menuOpen: false,
      searchOpen: true,
    });
  });

  it("requests the next named detail level from Explore", () => {
    const zoomListener = vi.fn();
    window.addEventListener("atlas:zoom", zoomListener);

    render(<MobileChrome />);
    fireEvent.click(screen.getByRole("button", { name: /Explore/i }));

    expect(zoomListener).toHaveBeenCalledOnce();
    const zoomEvent = zoomListener.mock.calls[0]?.[0] as CustomEvent<{
      level?: string;
    }>;
    expect(zoomEvent.detail).toEqual(
      expect.objectContaining({ level: "region" }),
    );

    window.removeEventListener("atlas:zoom", zoomListener);
  });
});
