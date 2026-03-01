import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { AuditLogViewer } from "./audit-log-viewer";
import type { AuditEntry } from "../api/queries";

let mockEntries: AuditEntry[] | undefined;
let mockIsLoading = false;

vi.mock("../api/queries", () => ({
  useAuditLog: () => ({
    data: mockEntries,
    isLoading: mockIsLoading,
  }),
  auditKeys: { all: ["audit"] },
}));

vi.mock("@/shared/hooks/use-debounce", () => ({
  useDebounce: (value: string) => value,
}));

describe("AuditLogViewer", () => {
  beforeEach(() => {
    mockEntries = undefined;
    mockIsLoading = false;
  });

  it("renders the title", () => {
    mockEntries = [];
    renderWithProviders(<AuditLogViewer />);
    expect(screen.getByText("Audit Log")).toBeInTheDocument();
  });

  it("shows loading skeleton when isLoading", () => {
    mockIsLoading = true;
    const { container } = renderWithProviders(<AuditLogViewer />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows empty state when entries is empty", () => {
    mockEntries = [];
    renderWithProviders(<AuditLogViewer />);
    expect(screen.getByText("No audit entries found.")).toBeInTheDocument();
  });

  it("shows entry count when entries exist", () => {
    mockEntries = [
      { id: 1, timestamp: new Date().toISOString(), action: "create", target: "Ubuntu", details: null },
    ];
    renderWithProviders(<AuditLogViewer />);
    expect(screen.getByText("(1 entries)")).toBeInTheDocument();
  });

  it("renders table with entries", () => {
    mockEntries = [
      { id: 1, timestamp: new Date().toISOString(), action: "create_snapshot", target: "Ubuntu", details: "Full backup" },
      { id: 2, timestamp: new Date().toISOString(), action: "start_distro", target: "Debian", details: null },
    ];
    renderWithProviders(<AuditLogViewer />);
    expect(screen.getByText("create_snapshot")).toBeInTheDocument();
    expect(screen.getByText("start_distro")).toBeInTheDocument();
    expect(screen.getByText("Ubuntu")).toBeInTheDocument();
    expect(screen.getByText("Debian")).toBeInTheDocument();
  });

  it("renders refresh button with correct aria-label", () => {
    mockEntries = [];
    renderWithProviders(<AuditLogViewer />);
    expect(screen.getByLabelText("Refresh audit log")).toBeInTheDocument();
  });

  it("renders filter inputs with placeholders", () => {
    mockEntries = [];
    renderWithProviders(<AuditLogViewer />);
    expect(screen.getByPlaceholderText("Filter action...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Filter target...")).toBeInTheDocument();
  });

  it("renders table headers when entries exist", () => {
    mockEntries = [
      { id: 1, timestamp: new Date().toISOString(), action: "test", target: "test-target", details: null },
    ];
    renderWithProviders(<AuditLogViewer />);
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
  });

  it("updates action filter on input", () => {
    mockEntries = [];
    renderWithProviders(<AuditLogViewer />);
    const input = screen.getByPlaceholderText("Filter action...");
    fireEvent.change(input, { target: { value: "create" } });
    expect(input).toHaveValue("create");
  });
});
