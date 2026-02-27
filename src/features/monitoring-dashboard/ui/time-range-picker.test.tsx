import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimeRangePicker } from "./time-range-picker";

describe("TimeRangePicker", () => {
  it("renders all four time range options", () => {
    render(<TimeRangePicker value="live" onChange={vi.fn()} />);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("1h")).toBeInTheDocument();
    expect(screen.getByText("6h")).toBeInTheDocument();
    expect(screen.getByText("24h")).toBeInTheDocument();
  });

  it("calls onChange with the clicked option value", () => {
    const onChange = vi.fn();
    render(<TimeRangePicker value="live" onChange={onChange} />);

    fireEvent.click(screen.getByText("1h"));
    expect(onChange).toHaveBeenCalledWith("1h");

    fireEvent.click(screen.getByText("6h"));
    expect(onChange).toHaveBeenCalledWith("6h");

    fireEvent.click(screen.getByText("24h"));
    expect(onChange).toHaveBeenCalledWith("24h");
  });

  it("shows pulse indicator only when live is selected", () => {
    const { container, rerender } = render(<TimeRangePicker value="live" onChange={vi.fn()} />);
    // Pulse dot present when live is selected
    expect(container.querySelector(".animate-pulse")).toBeTruthy();

    // Pulse dot absent when another option is selected
    rerender(<TimeRangePicker value="1h" onChange={vi.fn()} />);
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("applies active styling to the selected option", () => {
    const { rerender } = render(<TimeRangePicker value="live" onChange={vi.fn()} />);
    const liveButton = screen.getByText("Live").closest("button")!;
    expect(liveButton.className).toContain("sapphire");

    rerender(<TimeRangePicker value="6h" onChange={vi.fn()} />);
    const sixHButton = screen.getByText("6h").closest("button")!;
    expect(sixHButton.className).toContain("sapphire");
    // Live should no longer be active
    const liveButton2 = screen.getByText("Live").closest("button")!;
    expect(liveButton2.className).not.toContain("sapphire");
  });
});
