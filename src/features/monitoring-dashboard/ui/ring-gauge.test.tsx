import { describe, it, expect } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { RingGauge } from "./ring-gauge";

const DEFAULT_RADIUS = (40 - 3.5) / 2; // 18.25
const CIRCUMFERENCE = 2 * Math.PI * DEFAULT_RADIUS;

function getCircles(container: HTMLElement) {
  return container.querySelectorAll("circle");
}

describe("RingGauge", () => {
  it("renders SVG with two circles (track + fill)", () => {
    const { container } = renderWithProviders(<RingGauge value={50} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(getCircles(container)).toHaveLength(2);
  });

  it("has aria-hidden attribute", () => {
    const { container } = renderWithProviders(<RingGauge value={50} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("computes correct stroke-dashoffset for 0%", () => {
    const { container } = renderWithProviders(<RingGauge value={0} />);
    const fill = getCircles(container)[1]!;
    expect(Number(fill.getAttribute("stroke-dashoffset"))).toBeCloseTo(CIRCUMFERENCE, 1);
  });

  it("computes correct stroke-dashoffset for 50%", () => {
    const { container } = renderWithProviders(<RingGauge value={50} />);
    const fill = getCircles(container)[1]!;
    expect(Number(fill.getAttribute("stroke-dashoffset"))).toBeCloseTo(CIRCUMFERENCE * 0.5, 1);
  });

  it("computes correct stroke-dashoffset for 100%", () => {
    const { container } = renderWithProviders(<RingGauge value={100} />);
    const fill = getCircles(container)[1]!;
    expect(Number(fill.getAttribute("stroke-dashoffset"))).toBeCloseTo(0, 1);
  });

  it("uses default color below warnAt threshold", () => {
    const { container } = renderWithProviders(
      <RingGauge value={50} color="var(--color-blue)" warnAt={70} criticalAt={90} />,
    );
    const fill = getCircles(container)[1]!;
    expect(fill.getAttribute("stroke")).toBe("var(--color-blue)");
  });

  it("uses yellow color at warnAt threshold", () => {
    const { container } = renderWithProviders(<RingGauge value={75} warnAt={70} criticalAt={90} />);
    const fill = getCircles(container)[1]!;
    expect(fill.getAttribute("stroke")).toBe("var(--color-yellow)");
  });

  it("uses red color at criticalAt threshold", () => {
    const { container } = renderWithProviders(<RingGauge value={95} warnAt={70} criticalAt={90} />);
    const fill = getCircles(container)[1]!;
    expect(fill.getAttribute("stroke")).toBe("var(--color-red)");
  });

  it("clamps negative values to 0", () => {
    const { container } = renderWithProviders(<RingGauge value={-10} />);
    const fill = getCircles(container)[1]!;
    expect(Number(fill.getAttribute("stroke-dashoffset"))).toBeCloseTo(CIRCUMFERENCE, 1);
  });

  it("clamps values above 100 to 100", () => {
    const { container } = renderWithProviders(<RingGauge value={150} />);
    const fill = getCircles(container)[1]!;
    expect(Number(fill.getAttribute("stroke-dashoffset"))).toBeCloseTo(0, 1);
  });

  it("respects custom size prop", () => {
    const { container } = renderWithProviders(<RingGauge value={50} size={48} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "48");
    expect(svg).toHaveAttribute("height", "48");
    expect(svg).toHaveAttribute("viewBox", "0 0 48 48");
  });

  it("respects custom strokeWidth prop", () => {
    const { container } = renderWithProviders(<RingGauge value={50} strokeWidth={6} />);
    const fill = getCircles(container)[1]!;
    expect(fill.getAttribute("stroke-width")).toBe("6");
  });

  it("applies custom className", () => {
    const { container } = renderWithProviders(<RingGauge value={50} className="my-custom" />);
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("my-custom")).toBe(true);
  });

  it("has round stroke linecap on fill circle", () => {
    const { container } = renderWithProviders(<RingGauge value={50} />);
    const fill = getCircles(container)[1]!;
    expect(fill.getAttribute("stroke-linecap")).toBe("round");
  });

  it("renders label text when provided", () => {
    const { container } = renderWithProviders(<RingGauge value={50} label="50%" />);
    const text = container.querySelector("text");
    expect(text).toBeInTheDocument();
    expect(text?.textContent).toBe("50%");
  });

  it("does not render text when label is omitted", () => {
    const { container } = renderWithProviders(<RingGauge value={50} />);
    expect(container.querySelector("text")).toBeNull();
  });

  it("centers the label text", () => {
    const { container } = renderWithProviders(<RingGauge value={50} label="50%" />);
    const text = container.querySelector("text")!;
    expect(text.getAttribute("text-anchor")).toBe("middle");
    expect(text.getAttribute("dominant-baseline")).toBe("central");
  });
});
