import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Timer, Archive, FolderOpen, Bell } from "lucide-react";
import { Select } from "@/shared/ui/select";
import { ToggleSwitch } from "@/shared/ui/toggle-switch";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useThemeStore } from "@/shared/hooks/use-theme";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";
import { useLocaleStore } from "@/shared/stores/use-locale-store";
import { supportedLocales, localeLabels, type Locale } from "@/shared/config/i18n";
import {
  useAlertThresholds,
  useSetAlertThresholds,
} from "@/features/monitoring-dashboard/api/queries";
import type { AlertThreshold } from "@/shared/types/monitoring";
import { cn } from "@/shared/lib/utils";

const INTERVAL_OPTIONS = [
  { key: "preferences.interval1s", value: 1000 },
  { key: "preferences.interval2s", value: 2000 },
  { key: "preferences.interval3s", value: 3000 },
  { key: "preferences.interval5s", value: 5000 },
  { key: "preferences.interval10s", value: 10000 },
  { key: "preferences.interval30s", value: 30000 },
];

const inputClass =
  "focus-ring border-surface-1 bg-base text-text w-full rounded-lg border px-3 py-2 text-sm";

export function PreferencesPanel() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useThemeStore();
  const { locale, setLocale } = useLocaleStore();

  const intervalOptions = useMemo(
    () =>
      INTERVAL_OPTIONS.map((opt) => ({
        value: String(opt.value),
        label: t(opt.key),
      })),
    [t],
  );
  const {
    metricsInterval,
    processesInterval,
    defaultSnapshotDir,
    defaultInstallLocation,
    alertThresholds,
    setMetricsInterval,
    setProcessesInterval,
    setDefaultSnapshotDir,
    setDefaultInstallLocation,
    setAlertThresholds,
  } = usePreferencesStore();

  // Sync thresholds from backend on mount
  const { data: backendThresholds } = useAlertThresholds();
  const setBackendThresholds = useSetAlertThresholds();

  useEffect(() => {
    if (backendThresholds && backendThresholds.length > 0) {
      setAlertThresholds(backendThresholds);
    }
  }, [backendThresholds, setAlertThresholds]);

  const updateThreshold = (alertType: string, updates: Partial<AlertThreshold>) => {
    const next = alertThresholds.map((t) =>
      t.alert_type === alertType ? { ...t, ...updates } : t,
    );
    setAlertThresholds(next);
    setBackendThresholds.mutate(next);
  };

  return (
    <div className="space-y-6">
      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <h4 className="text-text mb-4 font-semibold">{t("preferences.appearance")}</h4>
        <div className="flex gap-3">
          <button
            onClick={() => theme === "light" && toggleTheme()}
            className={cn(
              "focus-ring flex flex-1 items-center gap-3 rounded-lg border p-4 transition-all",
              theme === "dark"
                ? "border-blue bg-blue/20"
                : "border-surface-1 hover:border-surface-2",
            )}
          >
            <Moon className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <p className="text-text text-sm font-medium">{t("preferences.mochaDark")}</p>
              <p className="text-subtext-0 text-xs">{t("preferences.mochaDarkDesc")}</p>
            </div>
          </button>
          <button
            onClick={() => theme === "dark" && toggleTheme()}
            className={cn(
              "focus-ring flex flex-1 items-center gap-3 rounded-lg border p-4 transition-all",
              theme === "light"
                ? "border-blue bg-blue/20"
                : "border-surface-1 hover:border-surface-2",
            )}
          >
            <Sun className="h-5 w-5 shrink-0" />
            <div className="text-left">
              <p className="text-text text-sm font-medium">{t("preferences.latteLight")}</p>
              <p className="text-subtext-0 text-xs">{t("preferences.latteLightDesc")}</p>
            </div>
          </button>
        </div>
        <div className="mt-4">
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            {t("preferences.language")}
          </label>
          <Select
            value={locale}
            onChange={(v) => setLocale(v as Locale)}
            options={supportedLocales.map((l) => ({ value: l, label: localeLabels[l] }))}
            placeholder=""
          />
        </div>
      </div>

      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Timer className="text-mauve h-5 w-5" />
          <h4 className="text-text font-semibold">{t("preferences.monitoring")}</h4>
        </div>
        <p className="text-subtext-0 mb-4 text-xs">{t("preferences.monitoringDesc")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              {t("preferences.metricsInterval")}
            </label>
            <Select
              value={String(metricsInterval)}
              onChange={(v) => setMetricsInterval(Number(v))}
              options={intervalOptions}
              placeholder=""
            />
          </div>
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              {t("preferences.processListInterval")}
            </label>
            <Select
              value={String(processesInterval)}
              onChange={(v) => setProcessesInterval(Number(v))}
              options={intervalOptions}
              placeholder=""
            />
          </div>
        </div>
      </div>

      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Archive className="text-mauve h-5 w-5" />
          <h4 className="text-text font-semibold">{t("preferences.snapshotsSection")}</h4>
        </div>
        <p className="text-subtext-0 mb-4 text-xs">{t("preferences.snapshotsDesc")}</p>
        <div className="space-y-4">
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              {t("preferences.defaultSnapshotDir")}
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={defaultSnapshotDir}
                onChange={(e) => setDefaultSnapshotDir(e.target.value)}
                placeholder={t("preferences.snapshotDirPlaceholder")}
                maxLength={260}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={async () => {
                  const dir = await openDialog({
                    directory: true,
                    title: t("preferences.browseSnapshotDirTitle"),
                  });
                  if (dir) setDefaultSnapshotDir(dir);
                }}
                className="border-surface-1 text-subtext-0 hover:bg-surface-0 hover:text-text shrink-0 rounded-lg border px-2"
                aria-label={t("preferences.browseSnapshotDir")}
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
            <p className="text-overlay-0 mt-1 text-xs">{t("preferences.defaultSnapshotDirHint")}</p>
          </div>
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              {t("preferences.defaultInstallLocation")}
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={defaultInstallLocation}
                onChange={(e) => setDefaultInstallLocation(e.target.value)}
                placeholder={t("preferences.installLocationPlaceholder")}
                maxLength={260}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={async () => {
                  const dir = await openDialog({
                    directory: true,
                    title: t("preferences.browseInstallLocationTitle"),
                  });
                  if (dir) setDefaultInstallLocation(dir);
                }}
                className="border-surface-1 text-subtext-0 hover:bg-surface-0 hover:text-text shrink-0 rounded-lg border px-2"
                aria-label={t("preferences.browseInstallLocation")}
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
            <p className="text-overlay-0 mt-1 text-xs">
              {t("preferences.defaultInstallLocationHint")}
            </p>
          </div>
        </div>
      </div>

      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="text-mauve h-5 w-5" />
          <h4 className="text-text font-semibold">{t("preferences.alerts")}</h4>
        </div>
        <p className="text-subtext-0 mb-4 text-xs">{t("preferences.alertsDesc")}</p>
        <div className="space-y-4">
          {alertThresholds.map((threshold) => {
            const label =
              threshold.alert_type === "cpu"
                ? t("preferences.alertCpu")
                : threshold.alert_type === "memory"
                  ? t("preferences.alertMemory")
                  : t("preferences.alertDisk");
            return (
              <div key={threshold.alert_type} className="flex items-center gap-4">
                <ToggleSwitch
                  checked={threshold.enabled}
                  onChange={() =>
                    updateThreshold(threshold.alert_type, { enabled: !threshold.enabled })
                  }
                  label={t("preferences.toggleAlert", { label })}
                  hideLabel
                />
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-text text-sm font-medium">{label}</span>
                    <span className="text-subtext-0 text-xs">{threshold.threshold_percent}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={99}
                    value={threshold.threshold_percent}
                    onChange={(e) =>
                      updateThreshold(threshold.alert_type, {
                        threshold_percent: Number(e.target.value),
                      })
                    }
                    disabled={!threshold.enabled}
                    className="w-full accent-[var(--color-blue)] disabled:opacity-40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
