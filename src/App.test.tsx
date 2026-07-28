import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="world-canvas">{children}</div>
  ),
}));

vi.mock("@react-three/drei", () => ({
  useProgress: () => ({ active: false, progress: 100 }),
}));

vi.mock("./world/WorldScene", () => ({
  WorldScene: () => null,
}));

describe("App", () => {
  it("identifies the atlas while the WebGL scene loads", () => {
    render(<App />);

    expect(screen.getAllByText("Roshar")).not.toHaveLength(0);
    expect(screen.getByTestId("world-canvas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Search locations" }));
    expect(
      screen.getByRole("dialog", { name: "Search Roshar" }),
    ).toBeInTheDocument();
  });
});
