import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { useTerminalStore } from "../model/use-terminal-store";

vi.mock("./terminal-tab-bar", () => ({
  TerminalTabBar: ({ onNewTerminal }: { onNewTerminal: () => void }) => (
    <button data-testid="mock-tab-bar" onClick={onNewTerminal}>
      Tab Bar
    </button>
  ),
}));

vi.mock("./terminal-instance", () => ({
  TerminalInstance: ({ sessionId, isActive }: { sessionId: string; isActive: boolean }) => (
    <div data-testid={`terminal-instance-${sessionId}`} data-active={isActive} />
  ),
}));

vi.mock("../api/mutations", () => ({
  createTerminal: vi.fn(() => Promise.resolve("new-session")),
}));

vi.mock("@/shared/api/distro-queries", () => ({
  useDistros: () => ({
    data: [
      {
        name: "Ubuntu",
        state: "Running",
        wsl_version: 2,
        is_default: true,
        base_path: null,
        vhdx_size_bytes: null,
        last_seen: "",
      },
    ],
  }),
}));

// Must import AFTER mocks are declared
const { TerminalPanel } = await import("./terminal-panel");

describe("TerminalPanel", () => {
  beforeEach(() => {
    useTerminalStore.setState({
      sessions: [],
      activeSessionId: null,
      isOpen: false,
      panelHeight: 300,
    });
  });

  it("returns null when no sessions exist", () => {
    const { container } = renderWithProviders(<TerminalPanel />);
    expect(container.innerHTML).toBe("");
  });

  it("renders panel when sessions exist", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: true,
    });
    renderWithProviders(<TerminalPanel />);
    expect(screen.getByTestId("mock-tab-bar")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-hide")).toBeInTheDocument();
  });

  it("renders terminal instances for each session", () => {
    useTerminalStore.setState({
      sessions: [
        { id: "s1", distroName: "Ubuntu", title: "Ubuntu" },
        { id: "s2", distroName: "Debian", title: "Debian" },
      ],
      activeSessionId: "s1",
      isOpen: true,
    });
    renderWithProviders(<TerminalPanel />);
    expect(screen.getByTestId("terminal-instance-s1")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-instance-s2")).toBeInTheDocument();
  });

  it("shows minimize label when panel is open", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: true,
    });
    renderWithProviders(<TerminalPanel />);
    expect(screen.getByLabelText("Minimize terminal")).toBeInTheDocument();
  });

  it("shows expand label when panel is closed", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: false,
    });
    renderWithProviders(<TerminalPanel />);
    expect(screen.getByLabelText("Expand terminal")).toBeInTheDocument();
  });

  it("closes panel when hide button is clicked", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: true,
    });
    renderWithProviders(<TerminalPanel />);
    fireEvent.click(screen.getByTestId("terminal-hide"));
    expect(useTerminalStore.getState().isOpen).toBe(false);
  });

  it("shows resize handle only when open", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: false,
    });
    const { container, rerender } = renderWithProviders(<TerminalPanel />);
    expect(container.querySelector(".cursor-ns-resize")).toBeNull();

    useTerminalStore.setState({ isOpen: true });
    rerender(<TerminalPanel />);
    expect(container.querySelector(".cursor-ns-resize")).not.toBeNull();
  });
});
