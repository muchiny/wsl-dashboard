import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import type { LogEntry, LogFilter } from "@/shared/hooks/use-debug-console";

const mockToggle = vi.fn();
const mockSetFilter = vi.fn();
const mockClear = vi.fn();

const sampleLogs: LogEntry[] = [
  {
    id: 1,
    timestamp: "10:00:00.000",
    level: "ERROR",
    message: "Something failed",
    target: "backend::module",
  },
  {
    id: 2,
    timestamp: "10:00:01.000",
    level: "ERROR",
    message: "Another error",
    target: "backend::module",
  },
  {
    id: 3,
    timestamp: "10:00:02.000",
    level: "WARN",
    message: "Deprecation notice",
    target: "frontend",
  },
  {
    id: 4,
    timestamp: "10:00:03.000",
    level: "INFO",
    message: "Started successfully",
    target: "ipc",
  },
  {
    id: 5,
    timestamp: "10:00:04.000",
    level: "DEBUG",
    message: "Loaded config",
    target: "frontend",
  },
];

let mockState: {
  isOpen: boolean;
  logs: LogEntry[];
  filter: LogFilter;
  toggle: () => void;
  setFilter: (f: LogFilter) => void;
  clear: () => void;
};

vi.mock("@/shared/hooks/use-debug-console", () => ({
  useDebugConsoleStore: () => mockState,
}));

const { DebugConsole } = await import("./debug-console");

describe("DebugConsole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      isOpen: false,
      logs: sampleLogs,
      filter: "ALL",
      toggle: mockToggle,
      setFilter: mockSetFilter,
      clear: mockClear,
    };
  });

  it("renders collapsed by default with toggle button", () => {
    renderWithProviders(<DebugConsole />);
    expect(screen.getByText("Debug Console")).toBeInTheDocument();
    // The expanded panel (with filter buttons) should not be visible
    expect(screen.queryByTitle("Clear logs")).not.toBeInTheDocument();
  });

  it("expands on toggle click and shows toolbar", () => {
    mockState.isOpen = true;
    renderWithProviders(<DebugConsole />);
    expect(screen.getByTitle("Clear logs")).toBeInTheDocument();
    expect(screen.getByTitle("Close")).toBeInTheDocument();
  });

  it("shows error badge count", () => {
    renderWithProviders(<DebugConsole />);
    // 2 errors in sampleLogs
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows warning badge count", () => {
    renderWithProviders(<DebugConsole />);
    // 1 warning in sampleLogs
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls setFilter when filter button is clicked", () => {
    mockState.isOpen = true;
    renderWithProviders(<DebugConsole />);

    const errorFilter = screen.getByText("Error");
    fireEvent.click(errorFilter);
    expect(mockSetFilter).toHaveBeenCalledWith("ERROR");
  });

  it("shows clear button when expanded", () => {
    mockState.isOpen = true;
    renderWithProviders(<DebugConsole />);
    expect(screen.getByTitle("Clear logs")).toBeInTheDocument();
  });

  it("calls clear when clear button is clicked", () => {
    mockState.isOpen = true;
    renderWithProviders(<DebugConsole />);

    fireEvent.click(screen.getByTitle("Clear logs"));
    expect(mockClear).toHaveBeenCalled();
  });

  it("does not show error badge when error count is zero", () => {
    mockState.logs = [
      { id: 1, timestamp: "10:00:00.000", level: "INFO", message: "All good", target: "frontend" },
    ];
    renderWithProviders(<DebugConsole />);
    // Should not have any numeric badges for errors/warnings
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
