import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToggleSwitch } from "./toggle-switch";

describe("ToggleSwitch", () => {
  it("renders with role switch", () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} label="Enable" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("sets aria-checked to true when checked", () => {
    render(<ToggleSwitch checked={true} onChange={vi.fn()} label="Enable" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("sets aria-checked to false when unchecked", () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} label="Enable" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("shows label text", () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} label="Dark mode" />);
    expect(screen.getByText("Dark mode")).toBeInTheDocument();
  });

  it("shows description when provided", () => {
    render(
      <ToggleSwitch
        checked={false}
        onChange={vi.fn()}
        label="Dark mode"
        description="Toggle dark theme"
      />,
    );
    expect(screen.getByText("Toggle dark theme")).toBeInTheDocument();
  });

  it("hides label when hideLabel is true", () => {
    render(
      <ToggleSwitch
        checked={false}
        onChange={vi.fn()}
        label="Dark mode"
        description="Toggle dark theme"
        hideLabel
      />,
    );
    expect(screen.queryByText("Dark mode")).not.toBeInTheDocument();
    expect(screen.queryByText("Toggle dark theme")).not.toBeInTheDocument();
  });

  it("calls onChange on click", () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="Enable" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("sets aria-label", () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} label="Enable notifications" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-label", "Enable notifications");
  });
});
