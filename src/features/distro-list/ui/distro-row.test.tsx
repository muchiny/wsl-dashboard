import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DistroRow } from "./distro-row";
import type { Distro } from "@/shared/types/distro";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a href={props.to as string} aria-label={props["aria-label"] as string}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/terminal/api/mutations", () => ({
  useCreateTerminalSession: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// DistroRow imports formatBytes → i18n, so translations are active.
const START_LABEL = "Start Ubuntu";
const STOP_LABEL = "Stop Ubuntu";
const RESTART_LABEL = "Restart Ubuntu";
const SNAPSHOT_LABEL = "Create snapshot of Ubuntu";
const ROW_LABEL = "Ubuntu - Running";

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

describe("DistroRow", () => {
  it("displays the distro name", () => {
    render(<DistroRow distro={makeDistro({ name: "Debian" })} {...defaultProps} />);
    expect(screen.getByText("Debian")).toBeInTheDocument();
  });

  it("shows Running state when running", () => {
    render(<DistroRow distro={makeDistro({ state: "Running" })} {...defaultProps} />);
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("shows Stopped state when stopped", () => {
    render(<DistroRow distro={makeDistro({ state: "Stopped" })} {...defaultProps} />);
    expect(screen.getByText("Stopped")).toBeInTheDocument();
  });

  it("shows WSL version", () => {
    render(<DistroRow distro={makeDistro({ wsl_version: 2 })} {...defaultProps} />);
    expect(screen.getByText("WSL 2")).toBeInTheDocument();
  });

  it("shows Start button when stopped", () => {
    render(<DistroRow distro={makeDistro({ state: "Stopped" })} {...defaultProps} />);
    expect(screen.getByLabelText(START_LABEL)).toBeInTheDocument();
    expect(screen.queryByLabelText(STOP_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(RESTART_LABEL)).not.toBeInTheDocument();
  });

  it("shows Stop and Restart buttons when running", () => {
    render(<DistroRow distro={makeDistro({ state: "Running" })} {...defaultProps} />);
    expect(screen.getByLabelText(STOP_LABEL)).toBeInTheDocument();
    expect(screen.getByLabelText(RESTART_LABEL)).toBeInTheDocument();
    expect(screen.queryByLabelText(START_LABEL)).not.toBeInTheDocument();
  });

  it("calls onStart when Start button is clicked", () => {
    const onStart = vi.fn();
    render(
      <DistroRow distro={makeDistro({ state: "Stopped" })} {...defaultProps} onStart={onStart} />,
    );
    fireEvent.click(screen.getByLabelText(START_LABEL));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("calls onStop when Stop button is clicked", () => {
    const onStop = vi.fn();
    render(
      <DistroRow distro={makeDistro({ state: "Running" })} {...defaultProps} onStop={onStop} />,
    );
    fireEvent.click(screen.getByLabelText(STOP_LABEL));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("calls onRestart when Restart button is clicked", () => {
    const onRestart = vi.fn();
    render(
      <DistroRow
        distro={makeDistro({ state: "Running" })}
        {...defaultProps}
        onRestart={onRestart}
      />,
    );
    fireEvent.click(screen.getByLabelText(RESTART_LABEL));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("shows star icon when is_default is true", () => {
    const { container } = render(
      <DistroRow distro={makeDistro({ is_default: true })} {...defaultProps} />,
    );
    const starSvg = container.querySelector(".fill-yellow");
    expect(starSvg).toBeTruthy();
  });

  it("shows snapshot count badge when count > 0", () => {
    render(<DistroRow distro={makeDistro()} {...defaultProps} snapshotCount={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("does not show snapshot count badge when count is 0", () => {
    render(<DistroRow distro={makeDistro()} {...defaultProps} snapshotCount={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("calls onExpand when row is clicked", () => {
    const onExpand = vi.fn();
    render(<DistroRow distro={makeDistro()} {...defaultProps} onExpand={onExpand} />);
    fireEvent.click(screen.getByRole("button", { name: ROW_LABEL }));
    expect(onExpand).toHaveBeenCalledOnce();
  });

  it("does not call onExpand when action button is clicked", () => {
    const onExpand = vi.fn();
    const onStop = vi.fn();
    render(
      <DistroRow
        distro={makeDistro({ state: "Running" })}
        {...defaultProps}
        onExpand={onExpand}
        onStop={onStop}
      />,
    );
    fireEvent.click(screen.getByLabelText(STOP_LABEL));
    expect(onStop).toHaveBeenCalledOnce();
    expect(onExpand).not.toHaveBeenCalled();
  });

  it("disables all action buttons when any action is pending", () => {
    render(
      <DistroRow
        distro={makeDistro({ state: "Running" })}
        {...defaultProps}
        pendingAction="Stopping"
      />,
    );
    expect(screen.getByLabelText(RESTART_LABEL)).toBeDisabled();
    expect(screen.getByLabelText(STOP_LABEL)).toBeDisabled();
    expect(screen.getByLabelText(SNAPSHOT_LABEL)).toBeDisabled();
  });

  it("shows spinner on start button when pendingAction is Starting", () => {
    render(
      <DistroRow
        distro={makeDistro({ state: "Stopped" })}
        {...defaultProps}
        pendingAction="Starting"
      />,
    );
    const startBtn = screen.getByLabelText(START_LABEL);
    const spinner = startBtn.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
    expect(startBtn).toBeDisabled();
  });

  it("displays VHDX size when available", () => {
    render(<DistroRow distro={makeDistro({ vhdx_size_bytes: 1073741824 })} {...defaultProps} />);
    expect(screen.getByText("1.00 GB")).toBeInTheDocument();
  });

  it("shows dash when vhdx_size_bytes is null", () => {
    render(<DistroRow distro={makeDistro({ vhdx_size_bytes: null })} {...defaultProps} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
