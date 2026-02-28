import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DistroSnapshotPanel } from "./distro-snapshot-panel";

vi.mock("@/features/snapshot-list/ui/snapshot-list", () => ({
  SnapshotList: ({ distroName }: { distroName?: string }) => (
    <div data-testid={`snapshot-list-${distroName}`}>Snapshots for {distroName}</div>
  ),
}));

describe("DistroSnapshotPanel", () => {
  const defaultProps = {
    distroName: "Ubuntu",
    onRestore: vi.fn(),
    onCreateSnapshot: vi.fn(),
  };

  it("displays the distro name in the title", () => {
    renderWithProviders(<DistroSnapshotPanel {...defaultProps} />);
    expect(screen.getByText(/Snapshots — Ubuntu/)).toBeInTheDocument();
  });

  it("renders the SnapshotList for the distro", () => {
    renderWithProviders(<DistroSnapshotPanel {...defaultProps} />);
    expect(screen.getByTestId("snapshot-list-Ubuntu")).toBeInTheDocument();
  });

  it("renders the new snapshot button", () => {
    renderWithProviders(<DistroSnapshotPanel {...defaultProps} />);
    expect(screen.getByText("New Snapshot")).toBeInTheDocument();
  });

  it("calls onCreateSnapshot when new snapshot button is clicked", () => {
    const onCreateSnapshot = vi.fn();
    renderWithProviders(
      <DistroSnapshotPanel {...defaultProps} onCreateSnapshot={onCreateSnapshot} />,
    );
    fireEvent.click(screen.getByText("New Snapshot"));
    expect(onCreateSnapshot).toHaveBeenCalledOnce();
  });
});
