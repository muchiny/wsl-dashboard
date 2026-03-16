import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DistroDetailDrawer } from "./distro-detail-drawer";

vi.mock("@/features/snapshot-list/ui/snapshot-list", () => ({
  SnapshotList: (props: Record<string, unknown>) => (
    <div
      data-testid="snapshot-list"
      data-distro={String(props.distroName)}
      data-hide-distro-name={String(props.hideDistroName)}
    />
  ),
}));

const defaultProps = {
  distroName: "Ubuntu",
  onRestore: vi.fn(),
  onCreateSnapshot: vi.fn(),
  onClose: vi.fn(),
};

describe("DistroDetailDrawer", () => {
  it("renders distro name in title", () => {
    renderWithProviders(<DistroDetailDrawer {...defaultProps} />);
    expect(screen.getByText(/Ubuntu/)).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    renderWithProviders(<DistroDetailDrawer {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onCreateSnapshot when new snapshot button is clicked", () => {
    const onCreateSnapshot = vi.fn();
    renderWithProviders(
      <DistroDetailDrawer {...defaultProps} onCreateSnapshot={onCreateSnapshot} />,
    );
    // The "New Snapshot" button is the one inside the drawer's p-3 div
    const buttons = screen.getAllByRole("button");
    const snapshotBtn = buttons.find((btn) => btn.classList.contains("w-full"));
    expect(snapshotBtn).toBeTruthy();
    fireEvent.click(snapshotBtn!);
    expect(onCreateSnapshot).toHaveBeenCalledOnce();
  });

  it("passes correct props to SnapshotList", () => {
    renderWithProviders(<DistroDetailDrawer {...defaultProps} />);
    const snapshotList = screen.getByTestId("snapshot-list");
    expect(snapshotList.getAttribute("data-distro")).toBe("Ubuntu");
    expect(snapshotList.getAttribute("data-hide-distro-name")).toBe("true");
  });
});
