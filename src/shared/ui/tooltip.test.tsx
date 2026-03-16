import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { Tooltip } from "./tooltip";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Tooltip", () => {
  it("renders children", () => {
    renderWithProviders(
      <Tooltip content="Help text">
        <button>Click me</button>
      </Tooltip>,
    );
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("does not show tooltip initially", () => {
    renderWithProviders(
      <Tooltip content="Help text">
        <button>Click me</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows tooltip after hover delay", () => {
    renderWithProviders(
      <Tooltip content="Help text">
        <button>Click me</button>
      </Tooltip>,
    );

    fireEvent.mouseEnter(screen.getByText("Click me").closest("span")!);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByText("Help text")).toBeInTheDocument();
  });

  it("hides tooltip on mouse leave", () => {
    renderWithProviders(
      <Tooltip content="Help text">
        <button>Click me</button>
      </Tooltip>,
    );

    const trigger = screen.getByText("Click me").closest("span")!;
    fireEvent.mouseEnter(trigger);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
