import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { useWslConfig, type WslGlobalConfig } from "../api/queries";
import { useUpdateWslConfig } from "../api/mutations";

export function WslConfigEditor() {
  const { data: config, isLoading } = useWslConfig();
  const updateConfig = useUpdateWslConfig();

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

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  if (isLoading) {
    return <div className="border-border bg-card h-64 animate-pulse rounded-lg border" />;
  }

  const handleSave = () => {
    updateConfig.mutate(form);
  };

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold">.wslconfig (Global WSL2 Settings)</h4>
        <button
          onClick={handleSave}
          disabled={updateConfig.isPending}
          className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {updateConfig.isPending ? "Saving..." : "Save"}
        </button>
      </div>

      {updateConfig.isSuccess && (
        <p className="text-success mb-3 text-sm">
          Configuration saved. Restart WSL for changes to take effect.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Memory Limit
          </label>
          <input
            type="text"
            value={form.memory ?? ""}
            onChange={(e) => setForm({ ...form, memory: e.target.value || null })}
            placeholder="e.g. 4GB"
            className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">Processors</label>
          <input
            type="number"
            value={form.processors ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                processors: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="All available"
            className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">Swap Size</label>
          <input
            type="text"
            value={form.swap ?? ""}
            onChange={(e) => setForm({ ...form, swap: e.target.value || null })}
            placeholder="e.g. 2GB"
            className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
        <div>
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
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
            placeholder="60000"
            className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
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
              className="accent-primary"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
