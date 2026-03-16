import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DistroActions } from "./distro-actions";
import type { TFunction } from "i18next";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a
      href={props.to as string}
      aria-label={props["aria-label"] as string}
      onClick={props.onClick as () => void}
    >
      {children}
    </a>
  ),
}));

const t = ((key: string, opts?: Record<string, string>) =>
  opts?.name ? `${key} ${opts.name}` : key) as unknown as TFunction;

const defaultProps = {
  t,
  isRunning: false,
  isPending: false,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTerminalSession: { mutate: vi.fn(), isPending: false } as any,
  handleStart: vi.fn(),
  handleStop: vi.fn(),
  handleRestart: vi.fn(),
  handleSnapshot: vi.fn(),
  handleDelete: vi.fn(),
  handleTerminal: vi.fn(),
  handleMonitorClick: vi.fn(),
  distroName: "Ubuntu",
};

describe("DistroActions", () => {
  it("shows Start button when not running", () => {
    renderWithProviders(<DistroActions {...defaultProps} isRunning={false} />);
    expect(screen.getByLabelText("distros.startAction Ubuntu")).toBeInTheDocument();
  });

  it("hides Start button when running", () => {
    renderWithProviders(<DistroActions {...defaultProps} isRunning={true} />);
    expect(screen.queryByLabelText("distros.startAction Ubuntu")).not.toBeInTheDocument();
  });

  it("shows Stop and Restart buttons when running", () => {
    renderWithProviders(<DistroActions {...defaultProps} isRunning={true} />);
    expect(screen.getByLabelText("distros.stopAction Ubuntu")).toBeInTheDocument();
    expect(screen.getByLabelText("distros.restartAction Ubuntu")).toBeInTheDocument();
  });

  it("shows Snapshot button regardless of state", () => {
    renderWithProviders(<DistroActions {...defaultProps} isRunning={false} />);
    expect(screen.getByLabelText("distros.createSnapshotOf Ubuntu")).toBeInTheDocument();
  });

  it("shows Terminal button only when running", () => {
    const { unmount } = renderWithProviders(<DistroActions {...defaultProps} isRunning={false} />);
    expect(screen.queryByLabelText("distros.openTerminalIn Ubuntu")).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<DistroActions {...defaultProps} isRunning={true} />);
    expect(screen.getByLabelText("distros.openTerminalIn Ubuntu")).toBeInTheDocument();
  });

  it("shows Monitor link only when running", () => {
    const { unmount } = renderWithProviders(<DistroActions {...defaultProps} isRunning={false} />);
    expect(screen.queryByLabelText("distros.monitorAction Ubuntu")).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<DistroActions {...defaultProps} isRunning={true} />);
    expect(screen.getByLabelText("distros.monitorAction Ubuntu")).toBeInTheDocument();
  });

  it("shows Delete button regardless of state", () => {
    renderWithProviders(<DistroActions {...defaultProps} isRunning={false} />);
    expect(screen.getByLabelText("distros.deleteAction Ubuntu")).toBeInTheDocument();
  });

  it("disables action buttons when isPending", () => {
    renderWithProviders(<DistroActions {...defaultProps} isRunning={false} isPending={true} />);
    expect(screen.getByLabelText("distros.startAction Ubuntu")).toBeDisabled();
    expect(screen.getByLabelText("distros.createSnapshotOf Ubuntu")).toBeDisabled();
    expect(screen.getByLabelText("distros.deleteAction Ubuntu")).toBeDisabled();
  });

  it("calls handleStart when Start button is clicked", () => {
    const handleStart = vi.fn();
    renderWithProviders(
      <DistroActions {...defaultProps} isRunning={false} handleStart={handleStart} />,
    );
    fireEvent.click(screen.getByLabelText("distros.startAction Ubuntu"));
    expect(handleStart).toHaveBeenCalledOnce();
  });

  it("calls handleSnapshot when Snapshot button is clicked", () => {
    const handleSnapshot = vi.fn();
    renderWithProviders(<DistroActions {...defaultProps} handleSnapshot={handleSnapshot} />);
    fireEvent.click(screen.getByLabelText("distros.createSnapshotOf Ubuntu"));
    expect(handleSnapshot).toHaveBeenCalledOnce();
  });
});
