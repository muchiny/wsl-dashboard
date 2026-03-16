import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
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

  it("closes panel when toggle button is clicked while open", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: true,
    });
    renderWithProviders(<TerminalPanel />);
    fireEvent.click(screen.getByTestId("terminal-toggle"));
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

  it("opens panel when toggle button is clicked while closed", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: false,
    });
    renderWithProviders(<TerminalPanel />);
    fireEvent.click(screen.getByTestId("terminal-toggle"));
    expect(useTerminalStore.getState().isOpen).toBe(true);
  });

  it("creates new terminal when tab bar new terminal is clicked", async () => {
    const { createTerminal } = await import("../api/mutations");
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: true,
    });
    renderWithProviders(<TerminalPanel />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-tab-bar"));
    });

    expect(createTerminal).toHaveBeenCalledWith("Ubuntu");
  });

  it("marks active terminal instance correctly", () => {
    useTerminalStore.setState({
      sessions: [
        { id: "s1", distroName: "Ubuntu", title: "Ubuntu" },
        { id: "s2", distroName: "Debian", title: "Debian" },
      ],
      activeSessionId: "s2",
      isOpen: true,
    });
    renderWithProviders(<TerminalPanel />);

    expect(screen.getByTestId("terminal-instance-s1").dataset.active).toBe("false");
    expect(screen.getByTestId("terminal-instance-s2").dataset.active).toBe("true");
  });

  it("hides terminal content when panel is closed", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: false,
    });
    const { container } = renderWithProviders(<TerminalPanel />);
    const hidden = container.querySelector(".hidden");
    expect(hidden).not.toBeNull();
  });

  it("resize handle: mouseDown + mouseMove changes height, mouseUp stops drag", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: true,
      panelHeight: 300,
    });
    const { container } = renderWithProviders(<TerminalPanel />);

    const resizeHandle = container.querySelector(".cursor-ns-resize")!;
    expect(resizeHandle).not.toBeNull();

    // Start drag at Y=500
    fireEvent.mouseDown(resizeHandle, { clientY: 500 });

    // Move mouse up by 100px (clientY 400 means delta = 500 - 400 = 100, new height = 400)
    act(() => {
      fireEvent.mouseMove(document, { clientY: 400 });
    });

    expect(useTerminalStore.getState().panelHeight).toBe(400);

    // Mouse up stops the drag
    act(() => {
      fireEvent.mouseUp(document);
    });

    // Further mouse moves should not change height
    act(() => {
      fireEvent.mouseMove(document, { clientY: 300 });
    });

    expect(useTerminalStore.getState().panelHeight).toBe(400);
  });

  it("handleNewTerminal calls createTerminal with first running distro name", async () => {
    const { createTerminal } = await import("../api/mutations");
    vi.mocked(createTerminal).mockClear();
    vi.mocked(createTerminal).mockResolvedValue("new-session-2");

    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: true,
    });
    renderWithProviders(<TerminalPanel />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-tab-bar"));
    });

    expect(createTerminal).toHaveBeenCalledWith("Ubuntu");
  });

  it("panel sets inline height style when open", () => {
    useTerminalStore.setState({
      sessions: [{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }],
      activeSessionId: "s1",
      isOpen: true,
      panelHeight: 350,
    });
    const { container } = renderWithProviders(<TerminalPanel />);

    // The root panel div should have inline height style
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.style.height).toBe("350px");
  });
});
