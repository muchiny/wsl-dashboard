import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
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

vi.mock("@/features/terminal/model/use-terminal-store", () => ({
  useTerminalStore: Object.assign(vi.fn(), {
    getState: () => ({ togglePanel: vi.fn() }),
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
}));

describe("RootLayout", () => {
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
});
