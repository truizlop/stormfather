import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAtlasStore } from "../store/useAtlasStore";
import { FidelityComparison } from "./FidelityComparison";

describe("FidelityComparison", () => {
  beforeEach(() => {
    useAtlasStore.setState({
      selectedId: "kharbranth",
      detailLevel: "street",
    });
  });

  afterEach(() => {
    useAtlasStore.setState({
      selectedId: "roshar",
      detailLevel: "continent",
    });
  });

  it("compares city and resident references against the live scene", () => {
    const inspectCity = vi.fn();
    const inspectResidents = vi.fn();
    window.addEventListener("atlas:inspect-city", inspectCity);
    window.addEventListener("atlas:inspect-residents", inspectResidents);
    render(<FidelityComparison />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Compare generated art to 3D",
      }),
    );
    expect(screen.getByText("Generated city target")).toBeInTheDocument();
    expect(inspectCity).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(screen.getByText("Generated resident target")).toBeInTheDocument();
    expect(inspectResidents).toHaveBeenCalledTimes(1);

    const divider = screen.getByRole("slider", {
      name: "Reference and live 3D comparison divider",
    });
    fireEvent.change(divider, { target: { value: "66" } });
    expect(divider).toHaveValue("66");

    fireEvent.click(
      screen.getByRole("button", { name: "Close visual comparison" }),
    );
    expect(screen.queryByText("Generated resident target")).not.toBeInTheDocument();
    expect(inspectCity).toHaveBeenCalledTimes(2);
    window.removeEventListener("atlas:inspect-city", inspectCity);
    window.removeEventListener("atlas:inspect-residents", inspectResidents);
  });
});
