import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="world-canvas">{children}</div>
  ),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
}));

describe("App", () => {
  it("identifies the atlas while the WebGL scene loads", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /roshar/i })).toBeInTheDocument();
    expect(screen.getByTestId("world-canvas")).toBeInTheDocument();
  });
});
