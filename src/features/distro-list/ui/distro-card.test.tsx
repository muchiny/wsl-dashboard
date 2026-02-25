import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DistroCard } from "./distro-card";
import type { Distro } from "@/shared/types/distro";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a href={props.to as string} aria-label={props["aria-label"] as string}>
      {children}
    </a>
  ),
}));

function makeDistro(overrides: Partial<Distro> = {}): Distro {
  return {
    name: "Ubuntu",
    state: "Running",
    wsl_version: 2,
    is_default: false,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const noop = () => {};

const defaultProps = {
  onStart: noop,
  onStop: noop,
  onRestart: noop,
  onSnapshot: noop,
  onExpand: noop,
  isExpanded: false,
  snapshotCount: 0,
};

describe("DistroCard", () => {
  it("displays the distro name", () => {
    render(<DistroCard distro={makeDistro({ name: "Debian" })} {...defaultProps} />);
    expect(screen.getByText("Debian")).toBeInTheDocument();
  });

  it("shows Running badge when running", () => {
    render(<DistroCard distro={makeDistro({ state: "Running" })} {...defaultProps} />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("shows Stopped badge when stopped", () => {
    render(<DistroCard distro={makeDistro({ state: "Stopped" })} {...defaultProps} />);
    expect(screen.getByText("Stopped")).toBeInTheDocument();
  });

  it("shows WSL version", () => {
    render(<DistroCard distro={makeDistro({ wsl_version: 2 })} {...defaultProps} />);
    expect(screen.getByText("WSL 2")).toBeInTheDocument();
  });

  it("shows Start button when stopped", () => {
    render(<DistroCard distro={makeDistro({ state: "Stopped" })} {...defaultProps} />);
    expect(screen.getByLabelText("Start Ubuntu")).toBeInTheDocument();
    expect(screen.queryByLabelText("Stop Ubuntu")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Restart Ubuntu")).not.toBeInTheDocument();
  });

  it("shows Stop and Restart buttons when running", () => {
    render(<DistroCard distro={makeDistro({ state: "Running" })} {...defaultProps} />);
    expect(screen.getByLabelText("Stop Ubuntu")).toBeInTheDocument();
    expect(screen.getByLabelText("Restart Ubuntu")).toBeInTheDocument();
    expect(screen.queryByLabelText("Start Ubuntu")).not.toBeInTheDocument();
  });

  it("calls onStart when Start button is clicked", () => {
    const onStart = vi.fn();
    render(
      <DistroCard distro={makeDistro({ state: "Stopped" })} {...defaultProps} onStart={onStart} />,
    );
    fireEvent.click(screen.getByLabelText("Start Ubuntu"));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("calls onStop when Stop button is clicked", () => {
    const onStop = vi.fn();
    render(
      <DistroCard distro={makeDistro({ state: "Running" })} {...defaultProps} onStop={onStop} />,
    );
    fireEvent.click(screen.getByLabelText("Stop Ubuntu"));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("calls onRestart when Restart button is clicked", () => {
    const onRestart = vi.fn();
    render(
      <DistroCard
        distro={makeDistro({ state: "Running" })}
        {...defaultProps}
        onRestart={onRestart}
      />,
    );
    fireEvent.click(screen.getByLabelText("Restart Ubuntu"));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("shows star icon when is_default is true", () => {
    const { container } = render(
      <DistroCard distro={makeDistro({ is_default: true })} {...defaultProps} />,
    );
    const starSvg = container.querySelector(".fill-yellow");
    expect(starSvg).toBeTruthy();
  });

  it("shows snapshot count badge when count > 0", () => {
    render(<DistroCard distro={makeDistro()} {...defaultProps} snapshotCount={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not show snapshot count badge when count is 0", () => {
    render(<DistroCard distro={makeDistro()} {...defaultProps} snapshotCount={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("calls onExpand when card is clicked", () => {
    const onExpand = vi.fn();
    render(<DistroCard distro={makeDistro()} {...defaultProps} onExpand={onExpand} />);
    fireEvent.click(screen.getByRole("button", { name: /^ubuntu - /i }));
    expect(onExpand).toHaveBeenCalledOnce();
  });

  it("does not call onExpand when action button is clicked", () => {
    const onExpand = vi.fn();
    const onStop = vi.fn();
    render(
      <DistroCard
        distro={makeDistro({ state: "Running" })}
        {...defaultProps}
        onExpand={onExpand}
        onStop={onStop}
      />,
    );
    fireEvent.click(screen.getByLabelText("Stop Ubuntu"));
    expect(onStop).toHaveBeenCalledOnce();
    expect(onExpand).not.toHaveBeenCalled();
  });
});
