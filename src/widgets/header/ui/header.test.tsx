import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

const mockToggleTheme = vi.fn();
const mockToggleDebug = vi.fn();
const mockMinimize = vi.fn();
const mockToggleMaximize = vi.fn();
const mockHide = vi.fn();
const mockTogglePanel = vi.fn();
const mockStartDragging = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.PropsWithChildren<{ to: string; "data-testid"?: string; className?: string }>) => (
    <a href={to} data-testid={props["data-testid"]} className={props.className}>
      {children}
    </a>
  ),
  useMatchRoute: () => (opts: { to: string }) => opts.to === "/",
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    minimize: mockMinimize,
    toggleMaximize: mockToggleMaximize,
    hide: mockHide,
    isMaximized: () => Promise.resolve(false),
    onResized: () => Promise.resolve(() => {}),
    startDragging: mockStartDragging,
  }),
}));

vi.mock("@/shared/hooks/use-theme", () => ({
  useThemeStore: () => ({ theme: "dark", toggleTheme: mockToggleTheme }),
}));

vi.mock("@/shared/hooks/use-debug-console", () => ({
  useDebugConsoleStore: Object.assign(() => ({ toggle: mockToggleDebug }), {
    getState: () => ({ toggle: mockToggleDebug }),
  }),
}));

vi.mock("./language-switcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">LangSwitch</div>,
}));

vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: (selector?: (state: Record<string, unknown>) => unknown) =>
    selector ? selector({ developerMode: true }) : { developerMode: true },
}));

vi.mock("@/features/terminal/model/use-terminal-store", () => ({
  useTerminalStore: Object.assign(() => ({}), {
    getState: () => ({ togglePanel: mockTogglePanel }),
  }),
}));

// Import after mocks
const { Header } = await import("./header");

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the app name", () => {
    renderWithProviders(<Header />);
    expect(screen.getByText("WSL Nexus")).toBeInTheDocument();
  });

  it("renders navigation tabs", () => {
    renderWithProviders(<Header />);
    expect(screen.getByTestId("nav-distributions")).toBeInTheDocument();
    expect(screen.getByTestId("nav-monitoring")).toBeInTheDocument();
    expect(screen.getByTestId("nav-settings")).toBeInTheDocument();
  });

  it("renders navigation tab labels", () => {
    renderWithProviders(<Header />);
    expect(screen.getByText("Distributions")).toBeInTheDocument();
    expect(screen.getByText("Monitoring")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders theme toggle button", () => {
    renderWithProviders(<Header />);
    expect(screen.getByLabelText("Toggle theme")).toBeInTheDocument();
  });

  it("renders debug console toggle", () => {
    renderWithProviders(<Header />);
    expect(screen.getByLabelText("Toggle debug console (Ctrl+Shift+D)")).toBeInTheDocument();
  });

  it("renders language switcher", () => {
    renderWithProviders(<Header />);
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  it("renders window control buttons", () => {
    renderWithProviders(<Header />);
    expect(screen.getByLabelText("Minimize")).toBeInTheDocument();
    expect(screen.getByLabelText("Maximize")).toBeInTheDocument();
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    renderWithProviders(<Header />);
    expect(screen.getByText("WSL2 Management")).toBeInTheDocument();
  });

  it("calls toggleTheme when theme button is clicked", () => {
    renderWithProviders(<Header />);
    fireEvent.click(screen.getByLabelText("Toggle theme"));
    expect(mockToggleTheme).toHaveBeenCalledOnce();
  });

  it("calls minimize when minimize button is clicked", () => {
    renderWithProviders(<Header />);
    fireEvent.click(screen.getByLabelText("Minimize"));
    expect(mockMinimize).toHaveBeenCalledOnce();
  });

  it("calls toggleMaximize when maximize button is clicked", () => {
    renderWithProviders(<Header />);
    fireEvent.click(screen.getByLabelText("Maximize"));
    expect(mockToggleMaximize).toHaveBeenCalledOnce();
  });

  it("calls hide when close button is clicked", () => {
    renderWithProviders(<Header />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(mockHide).toHaveBeenCalledOnce();
  });

  it("renders terminal toggle button", () => {
    renderWithProviders(<Header />);
    expect(screen.getByLabelText("Toggle terminal (Ctrl+`)")).toBeInTheDocument();
  });

  it("calls togglePanel when terminal button is clicked", () => {
    renderWithProviders(<Header />);
    fireEvent.click(screen.getByLabelText("Toggle terminal (Ctrl+`)"));
    expect(mockTogglePanel).toHaveBeenCalledOnce();
  });

  it("calls debug console toggle when debug button is clicked", () => {
    renderWithProviders(<Header />);
    fireEvent.click(screen.getByLabelText("Toggle debug console (Ctrl+Shift+D)"));
    expect(mockToggleDebug).toHaveBeenCalledOnce();
  });

  it("applies correct theme icon for dark mode", () => {
    renderWithProviders(<Header />);
    // In dark mode, the theme toggle button should exist and have yellow styling
    const themeButton = screen.getByLabelText("Toggle theme");
    expect(themeButton).toBeInTheDocument();
    expect(themeButton).toHaveClass("bg-yellow/15");
  });

  it("active tab has correct styling for distributions route", () => {
    renderWithProviders(<Header />);
    const distroTab = screen.getByTestId("nav-distributions");
    expect(distroTab).toHaveClass("bg-blue");
  });

  it("inactive tabs have default styling", () => {
    renderWithProviders(<Header />);
    const monitoringTab = screen.getByTestId("nav-monitoring");
    expect(monitoringTab).not.toHaveClass("bg-blue");
    expect(monitoringTab).toHaveClass("text-subtext-1");
  });

  it("calls startDragging on mousedown on header empty space", () => {
    renderWithProviders(<Header />);
    const header = screen.getByRole("banner");
    fireEvent.mouseDown(header);
    expect(mockStartDragging).toHaveBeenCalled();
  });

  it("calls toggleMaximize on double-click on header empty space", () => {
    renderWithProviders(<Header />);
    const header = screen.getByRole("banner");
    fireEvent.doubleClick(header);
    expect(mockToggleMaximize).toHaveBeenCalled();
  });
});
