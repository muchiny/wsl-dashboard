import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";

const mockToggleTheme = vi.fn();
const mockToggleDebug = vi.fn();
const mockMinimize = vi.fn();
const mockToggleMaximize = vi.fn();
const mockHide = vi.fn();

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
    startDragging: vi.fn(),
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
});
