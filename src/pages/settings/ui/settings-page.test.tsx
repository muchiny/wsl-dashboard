import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { SettingsPage } from "./settings-page";

// Mock all child components
vi.mock("@/features/wsl-config/ui/wslconfig-editor", () => ({
  WslConfigEditor: () => <div data-testid="wsl-config-editor">WslConfigEditor</div>,
}));

vi.mock("@/features/wsl-config/ui/wsl-info-panel", () => ({
  WslInfoPanel: () => <div data-testid="wsl-info-panel">WslInfoPanel</div>,
}));

vi.mock("@/features/wsl-config/ui/vhdx-compact-panel", () => ({
  VhdxCompactPanel: () => <div data-testid="vhdx-compact-panel">VhdxCompactPanel</div>,
}));

vi.mock("@/features/audit-log/ui/audit-log-viewer", () => ({
  AuditLogViewer: () => <div data-testid="audit-log-viewer">AuditLogViewer</div>,
}));

vi.mock("@/features/app-preferences/ui/preferences-panel", () => ({
  PreferencesPanel: () => <div data-testid="preferences-panel">PreferencesPanel</div>,
}));

vi.mock("@/features/port-forwarding/ui/port-forwarding-panel", () => ({
  PortForwardingPanel: () => <div data-testid="port-forwarding-panel">PortForwardingPanel</div>,
}));

describe("SettingsPage", () => {
  it("renders settings title and subtitle", () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Configure WSL2, optimize disks, and view logs")).toBeInTheDocument();
  });

  it("renders 5 tab buttons with correct roles", () => {
    renderWithProviders(<SettingsPage />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
  });

  it("tab buttons have correct labels", () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByRole("tab", { name: /WSL Configuration/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Network/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Optimization/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Audit Log/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Preferences/i })).toBeInTheDocument();
  });

  it("first tab (config) is selected by default", () => {
    renderWithProviders(<SettingsPage />);
    const tabs = screen.getAllByRole("tab");
    const configTab = tabs[0]!;
    expect(configTab).toHaveAttribute("aria-selected", "true");
    // Other tabs are not selected
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(tabs[2]).toHaveAttribute("aria-selected", "false");
    expect(tabs[3]).toHaveAttribute("aria-selected", "false");
    expect(tabs[4]).toHaveAttribute("aria-selected", "false");
  });

  it("shows config panel content by default", () => {
    renderWithProviders(<SettingsPage />);
    expect(screen.getByTestId("wsl-config-editor")).toBeInTheDocument();
    expect(screen.getByTestId("wsl-info-panel")).toBeInTheDocument();
  });

  it("switches to network tab on click", () => {
    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Network/i }));

    expect(screen.getByRole("tab", { name: /Network/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("port-forwarding-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("wsl-config-editor")).not.toBeInTheDocument();
  });

  it("switches to optimization tab on click", () => {
    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Optimization/i }));
    expect(screen.getByTestId("vhdx-compact-panel")).toBeInTheDocument();
  });

  it("switches to audit tab on click", () => {
    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Audit Log/i }));
    expect(screen.getByTestId("audit-log-viewer")).toBeInTheDocument();
  });

  it("switches to preferences tab on click", () => {
    renderWithProviders(<SettingsPage />);
    fireEvent.click(screen.getByRole("tab", { name: /Preferences/i }));
    expect(screen.getByTestId("preferences-panel")).toBeInTheDocument();
  });

  it("has correct ARIA structure", () => {
    renderWithProviders(<SettingsPage />);
    // tablist
    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeInTheDocument();

    // tabpanel
    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).toBeInTheDocument();
    expect(tabpanel).toHaveAttribute("id", "tabpanel-config");
    expect(tabpanel).toHaveAttribute("aria-labelledby", "tab-config");

    // tab controls tabpanel
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-controls", "tabpanel-config");
    expect(tabs[0]).toHaveAttribute("id", "tab-config");
  });

  it("only shows one tab panel at a time", () => {
    renderWithProviders(<SettingsPage />);

    // Config tab active by default
    expect(screen.getByTestId("wsl-config-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("port-forwarding-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("vhdx-compact-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("audit-log-viewer")).not.toBeInTheDocument();
    expect(screen.queryByTestId("preferences-panel")).not.toBeInTheDocument();

    // Switch to preferences
    fireEvent.click(screen.getByRole("tab", { name: /Preferences/i }));
    expect(screen.queryByTestId("wsl-config-editor")).not.toBeInTheDocument();
    expect(screen.getByTestId("preferences-panel")).toBeInTheDocument();
  });
});
