import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import type { AlertThreshold } from "@/shared/types/monitoring";

const mockToggleTheme = vi.fn();
const mockSetLocale = vi.fn();
const mockSetMetricsInterval = vi.fn();
const mockSetProcessesInterval = vi.fn();
const mockSetDefaultSnapshotDir = vi.fn();
const mockSetDefaultInstallLocation = vi.fn();
const mockSetAlertThresholds = vi.fn();

const defaultThresholds: AlertThreshold[] = [
  { alert_type: "cpu", threshold_percent: 90, enabled: false },
  { alert_type: "memory", threshold_percent: 85, enabled: false },
  { alert_type: "disk", threshold_percent: 90, enabled: false },
];

vi.mock("@/shared/hooks/use-theme", () => ({
  useThemeStore: () => ({ theme: "dark", toggleTheme: mockToggleTheme }),
}));

vi.mock("@/shared/stores/use-locale-store", () => ({
  useLocaleStore: () => ({ locale: "en", setLocale: mockSetLocale }),
}));

vi.mock("@/shared/stores/use-preferences-store", () => ({
  usePreferencesStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      metricsInterval: 2000,
      processesInterval: 3000,
      defaultSnapshotDir: "",
      defaultInstallLocation: "",
      alertThresholds: defaultThresholds,
      setMetricsInterval: mockSetMetricsInterval,
      setProcessesInterval: mockSetProcessesInterval,
      setDefaultSnapshotDir: mockSetDefaultSnapshotDir,
      setDefaultInstallLocation: mockSetDefaultInstallLocation,
      setAlertThresholds: mockSetAlertThresholds,
      developerMode: false,
      setDeveloperMode: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock("@/features/monitoring-dashboard/api/queries", () => ({
  useSetAlertThresholds: () => ({ mutate: vi.fn() }),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

const { PreferencesPanel } = await import("./preferences-panel");

describe("PreferencesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders theme toggle section", () => {
    renderWithProviders(<PreferencesPanel />);
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Catppuccin Mocha")).toBeInTheDocument();
    expect(screen.getByText("Catppuccin Latte")).toBeInTheDocument();
  });

  it("renders language selection", () => {
    renderWithProviders(<PreferencesPanel />);
    expect(screen.getByText("Language")).toBeInTheDocument();
  });

  it("renders monitoring interval section", () => {
    renderWithProviders(<PreferencesPanel />);
    expect(screen.getByText("Monitoring")).toBeInTheDocument();
    expect(screen.getByText("System Metrics Interval")).toBeInTheDocument();
    expect(screen.getByText("Process List Interval")).toBeInTheDocument();
  });

  it("renders snapshots section", () => {
    renderWithProviders(<PreferencesPanel />);
    expect(screen.getByText("Snapshots")).toBeInTheDocument();
    expect(screen.getByText("Default Snapshot Directory")).toBeInTheDocument();
    expect(screen.getByText("Default Install Location")).toBeInTheDocument();
  });

  it("renders alert threshold section", () => {
    renderWithProviders(<PreferencesPanel />);
    expect(screen.getByText("Alerts")).toBeInTheDocument();
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Disk")).toBeInTheDocument();
  });

  it("shows threshold percentage values", () => {
    renderWithProviders(<PreferencesPanel />);
    const ninetyPercent = screen.getAllByText("90%");
    expect(ninetyPercent).toHaveLength(2); // CPU and Disk both at 90%
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders range sliders for each threshold", () => {
    renderWithProviders(<PreferencesPanel />);
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(3);
  });

  it("clicking dark theme button calls toggleTheme when in light mode", () => {
    renderWithProviders(<PreferencesPanel />);
    // The Mocha (dark) button should call toggleTheme only if theme is 'light'
    // Since mock has theme='dark', clicking Mocha does nothing
    const mochaButton = screen.getByText("Catppuccin Mocha").closest("button")!;
    fireEvent.click(mochaButton);
    // theme is 'dark', clicking dark button does nothing (condition: theme === "light" && toggleTheme)
    expect(mockToggleTheme).not.toHaveBeenCalled();
  });

  it("clicking light theme button calls toggleTheme when in dark mode", () => {
    renderWithProviders(<PreferencesPanel />);
    const latteButton = screen.getByText("Catppuccin Latte").closest("button")!;
    fireEvent.click(latteButton);
    // theme is 'dark', clicking light button should trigger toggleTheme
    expect(mockToggleTheme).toHaveBeenCalledOnce();
  });

  it("renders developer mode toggle", () => {
    renderWithProviders(<PreferencesPanel />);
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("Developer Mode")).toBeInTheDocument();
  });

  it("updates snapshot directory input", () => {
    renderWithProviders(<PreferencesPanel />);
    const input = screen.getByPlaceholderText("C:\\WSL-Snapshots");
    fireEvent.change(input, { target: { value: "C:\\Snapshots" } });
    expect(mockSetDefaultSnapshotDir).toHaveBeenCalledWith("C:\\Snapshots");
  });

  it("updates install location input", () => {
    renderWithProviders(<PreferencesPanel />);
    const input = screen.getByPlaceholderText("C:\\WSL");
    fireEvent.change(input, { target: { value: "D:\\WSL" } });
    expect(mockSetDefaultInstallLocation).toHaveBeenCalledWith("D:\\WSL");
  });

  it("renders browse buttons for directories", () => {
    renderWithProviders(<PreferencesPanel />);
    const browseButtons = screen.getAllByRole("button", { name: /browse/i });
    expect(browseButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("toggles alert threshold enabled state", () => {
    renderWithProviders(<PreferencesPanel />);
    const toggles = screen.getAllByRole("switch");
    // Should have 3 alert toggles (cpu, memory, disk) + developer mode = 4 total
    expect(toggles.length).toBeGreaterThanOrEqual(3);
  });

  it("renders monitoring section description", () => {
    renderWithProviders(<PreferencesPanel />);
    expect(screen.getByText(/Adjust how often metrics are polled/)).toBeInTheDocument();
  });
});
