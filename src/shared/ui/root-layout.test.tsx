import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { RootLayout } from "./root-layout";

vi.mock("@/widgets/header/ui/header", () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock("@/features/terminal/ui/terminal-panel", () => ({
  TerminalPanel: () => <div data-testid="terminal-panel" />,
}));

vi.mock("@/widgets/debug-console/ui/debug-console", () => ({
  DebugConsole: () => <div data-testid="debug-console" />,
}));

vi.mock("@/shared/ui/toast", () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
}));

vi.mock("@/shared/ui/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/hooks/use-debug-console", () => ({
  useDebugConsoleSetup: vi.fn(),
}));

const mockTogglePanel = vi.fn();
vi.mock("@/features/terminal/model/use-terminal-store", () => ({
  useTerminalStore: Object.assign(vi.fn(), {
    getState: () => ({ togglePanel: mockTogglePanel }),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
}));

let mockDeveloperMode = true;
vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { developerMode: mockDeveloperMode };
    return selector ? selector(state) : state;
  },
}));

describe("RootLayout", () => {
  beforeEach(() => {
    mockTogglePanel.mockClear();
  });

  it("renders header", () => {
    renderWithProviders(<RootLayout />);
    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("renders outlet", () => {
    renderWithProviders(<RootLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("has skip-to-content link", () => {
    renderWithProviders(<RootLayout />);
    const skipLink = screen.getByText("Skip to main content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("toggles terminal panel on Ctrl+backtick", () => {
    renderWithProviders(<RootLayout />);
    fireEvent.keyDown(window, { key: "`", ctrlKey: true });
    expect(mockTogglePanel).toHaveBeenCalledOnce();
  });

  it("does not toggle terminal panel on backtick without Ctrl", () => {
    renderWithProviders(<RootLayout />);
    fireEvent.keyDown(window, { key: "`", ctrlKey: false });
    expect(mockTogglePanel).not.toHaveBeenCalled();
  });

  it("shows debug console when developer mode is on", () => {
    mockDeveloperMode = true;
    renderWithProviders(<RootLayout />);
    expect(screen.getByTestId("debug-console")).toBeInTheDocument();
  });

  it("hides debug console when developer mode is off", () => {
    mockDeveloperMode = false;
    renderWithProviders(<RootLayout />);
    expect(screen.queryByTestId("debug-console")).not.toBeInTheDocument();
    mockDeveloperMode = true;
  });
});
