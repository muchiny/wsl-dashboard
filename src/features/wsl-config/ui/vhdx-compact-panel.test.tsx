import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { VhdxCompactPanel } from "./vhdx-compact-panel";

const mockMutate = vi.fn();
let mockIsPending = false;

vi.mock("@/shared/api/distro-queries", () => ({
  useDistros: vi.fn(() => ({
    data: [
      { name: "Ubuntu", state: "Running", wsl_version: 2 },
      { name: "Debian", state: "Stopped", wsl_version: 2 },
      { name: "LegacyDistro", state: "Stopped", wsl_version: 1 },
    ],
  })),
}));

vi.mock("../api/mutations", () => ({
  useCompactVhdx: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  }),
}));

describe("VhdxCompactPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
  });

  it("renders section title", () => {
    renderWithProviders(<VhdxCompactPanel />);
    expect(screen.getByText("VHDX Optimization")).toBeInTheDocument();
  });

  it("shows distro selector", () => {
    renderWithProviders(<VhdxCompactPanel />);
    expect(screen.getByText("Distribution (WSL2 only)")).toBeInTheDocument();
  });

  it("shows compact button", () => {
    renderWithProviders(<VhdxCompactPanel />);
    expect(screen.getByText("Enable Sparse")).toBeInTheDocument();
  });

  it("shows loading state when mutation is pending", () => {
    mockIsPending = true;
    renderWithProviders(<VhdxCompactPanel />);
    expect(screen.getByText("Optimizing...")).toBeInTheDocument();
  });
});
