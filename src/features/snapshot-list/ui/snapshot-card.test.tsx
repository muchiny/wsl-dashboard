import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { SnapshotCard } from "./snapshot-card";
import type { Snapshot } from "@/shared/types/snapshot";

function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    id: "snap-001",
    distro_name: "Ubuntu",
    name: "My Backup",
    description: null,
    snapshot_type: "full",
    format: "tar",
    file_path: "/tmp/snap.tar",
    file_size_bytes: 1073741824,
    parent_id: null,
    created_at: new Date().toISOString(),
    status: "completed",
    ...overrides,
  };
}

const noop = () => {};

describe("SnapshotCard", () => {
  it("displays the snapshot name", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ name: "Weekly Backup" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Weekly Backup")).toBeInTheDocument();
  });

  it("shows Completed badge for completed status", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "completed" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows In Progress badge for in_progress status", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "in_progress" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Exporting...")).toBeInTheDocument();
  });

  it("shows Failed badge for failed status", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "failed: export error" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows Restore button only when completed", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "completed" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByLabelText("Restore snapshot")).toBeInTheDocument();
  });

  it("hides Restore button when not completed", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "in_progress" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.queryByLabelText("Restore snapshot")).not.toBeInTheDocument();
  });

  it("always shows Delete button", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "in_progress" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByLabelText("Delete snapshot")).toBeInTheDocument();
  });

  it("displays description when provided", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ description: "Before upgrade" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Before upgrade")).toBeInTheDocument();
  });

  it("does not render description when null", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ description: null })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.queryByText("Before upgrade")).not.toBeInTheDocument();
  });

  it("displays distro name", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ distro_name: "Arch" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Arch")).toBeInTheDocument();
  });

  it("displays format and type", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ format: "tar", snapshot_type: "full" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("tar")).toBeInTheDocument();
    expect(screen.getByText("full")).toBeInTheDocument();
  });

  it("displays file size when > 0", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ file_size_bytes: 1073741824 })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("1.00 GB")).toBeInTheDocument();
  });

  it("calls onRestore when Restore button is clicked", () => {
    const onRestore = vi.fn();
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "completed" })}
        onDelete={noop}
        onRestore={onRestore}
      />,
    );
    fireEvent.click(screen.getByLabelText("Restore snapshot"));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("calls onDelete when Delete button is clicked", () => {
    const onDelete = vi.fn();
    renderWithProviders(
      <SnapshotCard snapshot={makeSnapshot()} onDelete={onDelete} onRestore={noop} />,
    );
    fireEvent.click(screen.getByLabelText("Delete snapshot"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("hides distro name when hideDistroName is true", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ distro_name: "Arch" })}
        onDelete={noop}
        onRestore={noop}
        hideDistroName
      />,
    );
    expect(screen.queryByText("Arch")).not.toBeInTheDocument();
  });

  it("shows distro name when hideDistroName is false", () => {
    renderWithProviders(
      <SnapshotCard
        snapshot={makeSnapshot({ distro_name: "Arch" })}
        onDelete={noop}
        onRestore={noop}
        hideDistroName={false}
      />,
    );
    expect(screen.getByText("Arch")).toBeInTheDocument();
  });
});
