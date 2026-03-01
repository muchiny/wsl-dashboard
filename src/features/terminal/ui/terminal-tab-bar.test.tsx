import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { TerminalTabBar } from "./terminal-tab-bar";
import { useTerminalStore } from "../model/use-terminal-store";

vi.mock("../api/mutations", () => ({
  closeTerminal: vi.fn(() => Promise.resolve()),
}));

function seedStore(
  sessions: { id: string; distroName: string; title: string }[],
  activeSessionId: string | null = null,
) {
  useTerminalStore.setState({
    sessions,
    activeSessionId: activeSessionId ?? sessions[0]?.id ?? null,
  });
}

describe("TerminalTabBar", () => {
  beforeEach(() => {
    useTerminalStore.setState({
      sessions: [],
      activeSessionId: null,
      isOpen: false,
      panelHeight: 300,
    });
  });

  it("renders new terminal button", () => {
    const onNew = vi.fn();
    renderWithProviders(<TerminalTabBar onNewTerminal={onNew} />);
    expect(screen.getByTestId("terminal-new-tab")).toBeInTheDocument();
  });

  it("calls onNewTerminal when new tab button is clicked", () => {
    const onNew = vi.fn();
    renderWithProviders(<TerminalTabBar onNewTerminal={onNew} />);
    fireEvent.click(screen.getByTestId("terminal-new-tab"));
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("renders tabs for each session", () => {
    seedStore([
      { id: "s1", distroName: "Ubuntu", title: "Ubuntu" },
      { id: "s2", distroName: "Debian", title: "Debian" },
    ]);
    renderWithProviders(<TerminalTabBar onNewTerminal={vi.fn()} />);
    expect(screen.getByTestId("terminal-tab-s1")).toBeInTheDocument();
    expect(screen.getByTestId("terminal-tab-s2")).toBeInTheDocument();
  });

  it("displays session title text", () => {
    seedStore([{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }]);
    renderWithProviders(<TerminalTabBar onNewTerminal={vi.fn()} />);
    expect(screen.getByText("Ubuntu")).toBeInTheDocument();
  });

  it("marks active tab with aria-selected", () => {
    seedStore(
      [
        { id: "s1", distroName: "Ubuntu", title: "Ubuntu" },
        { id: "s2", distroName: "Debian", title: "Debian" },
      ],
      "s2",
    );
    renderWithProviders(<TerminalTabBar onNewTerminal={vi.fn()} />);
    expect(screen.getByTestId("terminal-tab-s1")).toHaveAttribute("aria-selected", "false");
    expect(screen.getByTestId("terminal-tab-s2")).toHaveAttribute("aria-selected", "true");
  });

  it("switches active session when tab is clicked", () => {
    seedStore(
      [
        { id: "s1", distroName: "Ubuntu", title: "Ubuntu" },
        { id: "s2", distroName: "Debian", title: "Debian" },
      ],
      "s1",
    );
    renderWithProviders(<TerminalTabBar onNewTerminal={vi.fn()} />);
    fireEvent.click(screen.getByText("Debian"));
    expect(useTerminalStore.getState().activeSessionId).toBe("s2");
  });

  it("removes session when close button is clicked", async () => {
    const { closeTerminal } = await import("../api/mutations");
    seedStore([{ id: "s1", distroName: "Ubuntu", title: "Ubuntu" }]);
    renderWithProviders(<TerminalTabBar onNewTerminal={vi.fn()} />);
    fireEvent.click(screen.getByTestId("terminal-tab-close-s1"));
    expect(closeTerminal).toHaveBeenCalledWith("s1");
    expect(useTerminalStore.getState().sessions).toHaveLength(0);
  });

  it("renders no tabs when sessions are empty", () => {
    renderWithProviders(<TerminalTabBar onNewTerminal={vi.fn()} />);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});
