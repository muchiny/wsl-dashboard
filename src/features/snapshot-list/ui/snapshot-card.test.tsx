import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SnapshotCard } from "./snapshot-card";
import type { Snapshot } from "@/shared/types/snapshot";

function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    id: "snap-001",
    distro_name: "Ubuntu",
    name: "My Backup",
    description: null,
    snapshot_type: "full",
    format: "tar.gz",
    file_path: "/tmp/snap.tar.gz",
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
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ name: "Weekly Backup" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Weekly Backup")).toBeInTheDocument();
  });

  it("shows Completed badge for completed status", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "completed" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows In Progress badge for in_progress status", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "in_progress" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("shows Failed badge for failed status", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "failed: export error" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("shows Restore button only when completed", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "completed" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByTitle("Restore snapshot")).toBeInTheDocument();
  });

  it("hides Restore button when not completed", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "in_progress" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.queryByTitle("Restore snapshot")).not.toBeInTheDocument();
  });

  it("always shows Delete button", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "in_progress" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByTitle("Delete snapshot")).toBeInTheDocument();
  });

  it("displays description when provided", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ description: "Before upgrade" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Before upgrade")).toBeInTheDocument();
  });

  it("does not render description when null", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ description: null })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.queryByText("Before upgrade")).not.toBeInTheDocument();
  });

  it("displays distro name", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ distro_name: "Arch" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("Arch")).toBeInTheDocument();
  });

  it("displays format and type", () => {
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ format: "tar.gz", snapshot_type: "full" })}
        onDelete={noop}
        onRestore={noop}
      />,
    );
    expect(screen.getByText("tar.gz")).toBeInTheDocument();
    expect(screen.getByText("full")).toBeInTheDocument();
  });

  it("displays file size when > 0", () => {
    render(
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
    render(
      <SnapshotCard
        snapshot={makeSnapshot({ status: "completed" })}
        onDelete={noop}
        onRestore={onRestore}
      />,
    );
    fireEvent.click(screen.getByTitle("Restore snapshot"));
    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("calls onDelete when Delete button is clicked", () => {
    const onDelete = vi.fn();
    render(<SnapshotCard snapshot={makeSnapshot()} onDelete={onDelete} onRestore={noop} />);
    fireEvent.click(screen.getByTitle("Delete snapshot"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("hides distro name when hideDistroName is true", () => {
    render(
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
    render(
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
