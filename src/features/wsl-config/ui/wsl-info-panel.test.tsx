import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { WslInfoPanel } from "./wsl-info-panel";

let mockIsLoading = false;
let mockIsError = false;
let mockError: Error | null = null;
let mockData:
  | {
      wsl_version: string | null;
      kernel_version: string | null;
      wslg_version: string | null;
      windows_version: string | null;
    }
  | undefined;

vi.mock("../api/queries", () => ({
  useWslVersion: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockError,
  }),
}));

describe("WslInfoPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
    mockData = {
      wsl_version: "2.0.9",
      kernel_version: "5.15.133",
      wslg_version: "1.0.59",
      windows_version: "10.0.22631",
    };
  });

  it("shows loading skeleton when loading", () => {
    mockIsLoading = true;
    mockData = undefined;
    const { container } = renderWithProviders(<WslInfoPanel />);
    const skeleton = container.querySelector(".animate-pulse");
    expect(skeleton).toBeTruthy();
  });

  it("shows version info when data is available", () => {
    renderWithProviders(<WslInfoPanel />);
    expect(screen.getByText("WSL System Information")).toBeInTheDocument();
    expect(screen.getByText("2.0.9")).toBeInTheDocument();
    expect(screen.getByText("5.15.133")).toBeInTheDocument();
    expect(screen.getByText("1.0.59")).toBeInTheDocument();
    expect(screen.getByText("10.0.22631")).toBeInTheDocument();
  });

  it("shows error message when query fails", () => {
    mockIsError = true;
    mockError = new Error("Connection refused");
    mockData = undefined;
    renderWithProviders(<WslInfoPanel />);
    expect(screen.getByText("Connection refused")).toBeInTheDocument();
  });
});
