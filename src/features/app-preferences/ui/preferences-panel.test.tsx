import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
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
  usePreferencesStore: () => ({
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
  }),
}));

vi.mock("@/features/monitoring-dashboard/api/queries", () => ({
  useAlertThresholds: () => ({ data: undefined }),
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
    expect(screen.getByText("Neon Dark")).toBeInTheDocument();
    expect(screen.getByText("Frosted Light")).toBeInTheDocument();
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
});
