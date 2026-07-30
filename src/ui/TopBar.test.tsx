import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAtlasStore } from "../store/useAtlasStore";
import { TopBar } from "./TopBar";

describe("TopBar mobile travel trigger", () => {
  beforeEach(() => {
    useAtlasStore.setState({
      menuOpen: false,
      searchOpen: false,
      isPlaying: true,
      nightMode: false,
      detailLevel: "continent",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("announces and exposes the travel sheet state", () => {
    render(<TopBar />);

    const trigger = screen.getByRole("button", {
      name: "Open travel menu",
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "mobile-travel-sheet");

    fireEvent.click(trigger);

    const closeTrigger = screen.getByRole("button", {
      name: "Close travel menu",
    });
    expect(closeTrigger).toHaveAttribute("aria-expanded", "true");
    expect(closeTrigger).toHaveAttribute(
      "aria-controls",
      "mobile-travel-sheet",
    );
    expect(useAtlasStore.getState().menuOpen).toBe(true);
  });
});
