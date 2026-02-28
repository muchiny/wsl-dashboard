import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Play } from "lucide-react";
import { ActionIconButton } from "./action-icon-button";

describe("ActionIconButton", () => {
  it("renders the icon when not loading", () => {
    render(<ActionIconButton icon={Play} aria-label="Start" />);
    expect(screen.getByLabelText("Start")).toBeEnabled();
  });

  it("renders spinner when loading", () => {
    const { container } = render(<ActionIconButton icon={Play} loading aria-label="Start" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("is disabled when loading", () => {
    render(<ActionIconButton icon={Play} loading aria-label="Start" />);
    expect(screen.getByLabelText("Start")).toBeDisabled();
  });

  it("is disabled when disabled prop is true", () => {
    render(<ActionIconButton icon={Play} disabled aria-label="Start" />);
    expect(screen.getByLabelText("Start")).toBeDisabled();
  });

  it("does not show spinner when just disabled", () => {
    const { container } = render(<ActionIconButton icon={Play} disabled aria-label="Start" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeFalsy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<ActionIconButton icon={Play} onClick={onClick} aria-label="Start" />);
    fireEvent.click(screen.getByLabelText("Start"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(<ActionIconButton icon={Play} disabled onClick={onClick} aria-label="Start" />);
    fireEvent.click(screen.getByLabelText("Start"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    render(
      <ActionIconButton icon={Play} className="text-green hover:bg-green/20" aria-label="Start" />,
    );
    const button = screen.getByLabelText("Start");
    expect(button.className).toContain("text-green");
  });
});
