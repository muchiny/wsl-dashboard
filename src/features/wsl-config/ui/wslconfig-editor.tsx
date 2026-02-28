import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Save, ChevronRight, Loader2 } from "lucide-react";
import { useWslConfig, type WslGlobalConfig } from "../api/queries";
import { useUpdateWslConfig } from "../api/mutations";
import { validateWslConfig, hasErrors } from "../lib/validation";
import { cn } from "@/shared/lib/utils";

export function WslConfigEditor() {
  const { t } = useTranslation();
  const { data: config, isLoading } = useWslConfig();
  const updateConfig = useUpdateWslConfig();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<WslGlobalConfig>({
    memory: null,
    processors: null,
    swap: null,
    swap_file: null,
    localhost_forwarding: null,
    kernel: null,
    kernel_command_line: null,
    nested_virtualization: null,
    vm_idle_timeout: null,
    dns_tunneling: null,
    firewall: null,
    auto_proxy: null,
  });

  // Sync form when fetched config changes (React-recommended adjust-state-during-render)
  const [prevConfig, setPrevConfig] = useState(config);
  if (config && config !== prevConfig) {
    setPrevConfig(config);
    setForm(config);
  }

  const markTouched = useCallback(
    (field: string) => setTouched((prev) => new Set(prev).add(field)),
    [],
  );

  if (isLoading) {
    return <div className="border-surface-1 bg-mantle h-64 animate-pulse rounded-xl border" />;
  }

  const errors = validateWslConfig(form);
  const invalid = hasErrors(errors);

  const handleSave = () => {
    if (invalid) return;
    updateConfig.mutate(form);
  };

  const inputBase = "focus-ring w-full rounded-lg border bg-base px-3 py-1.5 text-sm text-text";
  const getInputClass = (field: keyof typeof errors) =>
    touched.has(field) && errors[field]
      ? `${inputBase} border-red`
      : `${inputBase} border-surface-1`;

  const fieldError = (field: keyof typeof errors) =>
    touched.has(field) && errors[field] ? (
      <p className="text-red mt-1 text-xs">{errors[field]}</p>
    ) : null;

  return (
    <div className="border-surface-1 bg-mantle rounded-xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-text font-semibold">{t("wslConfig.title")}</h4>
        <button
          onClick={handleSave}
          disabled={updateConfig.isPending || invalid}
          className="bg-blue text-crust hover:bg-blue/90 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {updateConfig.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateConfig.isPending ? t("wslConfig.saving") : t("common.save")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            {t("wslConfig.memoryLimit")}
          </label>
          <input
            type="text"
            value={form.memory ?? ""}
            onChange={(e) => setForm({ ...form, memory: e.target.value || null })}
            onBlur={() => markTouched("memory")}
            placeholder={t("wslConfig.memoryLimitPlaceholder")}
            maxLength={32}
            className={getInputClass("memory")}
          />
          {fieldError("memory")}
        </div>
        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            {t("wslConfig.processors")}
          </label>
          <input
            type="number"
            value={form.processors ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                processors: e.target.value ? Number(e.target.value) : null,
              })
            }
            onBlur={() => markTouched("processors")}
            placeholder={t("wslConfig.processorsPlaceholder")}
            className={getInputClass("processors")}
          />
          {fieldError("processors")}
        </div>
        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            {t("wslConfig.swapSize")}
          </label>
          <input
            type="text"
            value={form.swap ?? ""}
            onChange={(e) => setForm({ ...form, swap: e.target.value || null })}
            onBlur={() => markTouched("swap")}
            placeholder={t("wslConfig.swapSizePlaceholder")}
            maxLength={32}
            className={getInputClass("swap")}
          />
          {fieldError("swap")}
        </div>
        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            {t("wslConfig.vmIdleTimeout")}
          </label>
          <input
            type="number"
            value={form.vm_idle_timeout ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                vm_idle_timeout: e.target.value ? Number(e.target.value) : null,
              })
            }
            onBlur={() => markTouched("vm_idle_timeout")}
            placeholder={t("wslConfig.vmIdleTimeoutPlaceholder")}
            className={getInputClass("vm_idle_timeout")}
          />
          {fieldError("vm_idle_timeout")}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            ["localhost_forwarding", "wslConfig.localhostForwarding"],
            ["nested_virtualization", "wslConfig.nestedVirtualization"],
            ["dns_tunneling", "wslConfig.dnsTunneling"],
            ["firewall", "wslConfig.firewall"],
            ["auto_proxy", "wslConfig.autoProxy"],
          ] as const
        ).map(([key, labelKey]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form[key] ?? false}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              className="accent-blue"
            />
            <span className="text-text text-sm">{t(labelKey)}</span>
          </label>
        ))}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-subtext-0 hover:text-text flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-90")}
          />
          {t("wslConfig.advancedSettings")}
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 gap-4">
            <div>
              <label className="text-subtext-0 mb-1 block text-xs font-medium">
                {t("wslConfig.customKernelPath")}
              </label>
              <input
                type="text"
                value={form.kernel ?? ""}
                onChange={(e) => setForm({ ...form, kernel: e.target.value || null })}
                placeholder={t("wslConfig.customKernelPathPlaceholder")}
                maxLength={260}
                className={`${inputBase} border-surface-1`}
              />
              <p className="text-overlay-0 mt-1 text-xs">{t("wslConfig.customKernelPathHint")}</p>
            </div>
            <div>
              <label className="text-subtext-0 mb-1 block text-xs font-medium">
                {t("wslConfig.kernelCommandLine")}
              </label>
              <input
                type="text"
                value={form.kernel_command_line ?? ""}
                onChange={(e) => setForm({ ...form, kernel_command_line: e.target.value || null })}
                placeholder={t("wslConfig.kernelCommandLinePlaceholder")}
                maxLength={260}
                className={`${inputBase} border-surface-1`}
              />
            </div>
            <div>
              <label className="text-subtext-0 mb-1 block text-xs font-medium">
                {t("wslConfig.swapFilePath")}
              </label>
              <input
                type="text"
                value={form.swap_file ?? ""}
                onChange={(e) => setForm({ ...form, swap_file: e.target.value || null })}
                placeholder={t("wslConfig.swapFilePathPlaceholder")}
                maxLength={260}
                className={`${inputBase} border-surface-1`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
