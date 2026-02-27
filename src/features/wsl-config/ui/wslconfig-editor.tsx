import { useState, useCallback } from "react";
import { Save, ChevronRight } from "lucide-react";
import { useWslConfig, type WslGlobalConfig } from "../api/queries";
import { useUpdateWslConfig } from "../api/mutations";
import { validateWslConfig, hasErrors } from "../lib/validation";
import { cn } from "@/shared/lib/utils";

export function WslConfigEditor() {
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

  // Sync form with fetched config (adjust-state-during-render pattern)
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
        <h4 className="text-text font-semibold">.wslconfig (Global WSL2 Settings)</h4>
        <button
          onClick={handleSave}
          disabled={updateConfig.isPending || invalid}
          className="bg-blue text-crust hover:bg-blue/90 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {updateConfig.isPending ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">Memory Limit</label>
          <input
            type="text"
            value={form.memory ?? ""}
            onChange={(e) => setForm({ ...form, memory: e.target.value || null })}
            onBlur={() => markTouched("memory")}
            placeholder="e.g. 4GB"
            maxLength={32}
            className={getInputClass("memory")}
          />
          {fieldError("memory")}
        </div>
        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">Processors</label>
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
            placeholder="All available"
            className={getInputClass("processors")}
          />
          {fieldError("processors")}
        </div>
        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">Swap Size</label>
          <input
            type="text"
            value={form.swap ?? ""}
            onChange={(e) => setForm({ ...form, swap: e.target.value || null })}
            onBlur={() => markTouched("swap")}
            placeholder="e.g. 2GB"
            maxLength={32}
            className={getInputClass("swap")}
          />
          {fieldError("swap")}
        </div>
        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            VM Idle Timeout (ms)
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
            placeholder="60000"
            className={getInputClass("vm_idle_timeout")}
          />
          {fieldError("vm_idle_timeout")}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            ["localhost_forwarding", "Localhost Forwarding"],
            ["nested_virtualization", "Nested Virtualization"],
            ["dns_tunneling", "DNS Tunneling"],
            ["firewall", "Firewall"],
            ["auto_proxy", "Auto Proxy"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form[key] ?? false}
              onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
              className="accent-blue"
            />
            <span className="text-text text-sm">{label}</span>
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
          Advanced Settings
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 gap-4">
            <div>
              <label className="text-subtext-0 mb-1 block text-xs font-medium">
                Custom Kernel Path
              </label>
              <input
                type="text"
                value={form.kernel ?? ""}
                onChange={(e) => setForm({ ...form, kernel: e.target.value || null })}
                placeholder="e.g. C:\Users\user\kernel"
                maxLength={260}
                className={`${inputBase} border-surface-1`}
              />
              <p className="text-overlay-0 mt-1 text-xs">
                Leave empty to use the default WSL kernel.
              </p>
            </div>
            <div>
              <label className="text-subtext-0 mb-1 block text-xs font-medium">
                Kernel Command Line
              </label>
              <input
                type="text"
                value={form.kernel_command_line ?? ""}
                onChange={(e) => setForm({ ...form, kernel_command_line: e.target.value || null })}
                placeholder="e.g. initrd=\initrd.img"
                maxLength={260}
                className={`${inputBase} border-surface-1`}
              />
            </div>
            <div>
              <label className="text-subtext-0 mb-1 block text-xs font-medium">
                Swap File Path
              </label>
              <input
                type="text"
                value={form.swap_file ?? ""}
                onChange={(e) => setForm({ ...form, swap_file: e.target.value || null })}
                placeholder="e.g. C:\Users\user\swap.vhdx"
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
