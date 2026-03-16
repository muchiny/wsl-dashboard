import { describe, it, expect } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { MiniSparkline } from "./mini-sparkline";

describe("MiniSparkline", () => {
  it("returns null when data has fewer than 2 points", () => {
    const { container } = renderWithProviders(<MiniSparkline data={[50]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("returns null when data is empty", () => {
    const { container } = renderWithProviders(<MiniSparkline data={[]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders SVG with polyline and polygon when data has 2+ points", () => {
    const { container } = renderWithProviders(<MiniSparkline data={[10, 20, 30]} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg!.querySelector("polyline")).toBeTruthy();
    expect(svg!.querySelector("polygon")).toBeTruthy();
  });

  it("sets aria-hidden on the SVG", () => {
    const { container } = renderWithProviders(<MiniSparkline data={[10, 20]} />);
    const svg = container.querySelector("svg");
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies custom className", () => {
    const { container } = renderWithProviders(
      <MiniSparkline data={[10, 20]} className="test-class" />,
    );
    const svg = container.querySelector("svg");
    expect(svg!.classList.contains("test-class")).toBe(true);
  });

  it("renders with custom width and height", () => {
    const { container } = renderWithProviders(
      <MiniSparkline data={[10, 20]} width={100} height={50} />,
    );
    const svg = container.querySelector("svg");
    expect(svg!.getAttribute("width")).toBe("100");
    expect(svg!.getAttribute("height")).toBe("50");
  });
});
