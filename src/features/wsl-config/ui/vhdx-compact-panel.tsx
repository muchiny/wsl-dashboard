import { useState } from "react";
import { HardDrive, Zap } from "lucide-react";
import { Select } from "@/shared/ui/select";
import { useDistros } from "@/features/distro-list/api/queries";
import { useCompactVhdx } from "../api/mutations";

export function VhdxCompactPanel() {
  const { data: distros } = useDistros();
  const compactVhdx = useCompactVhdx();
  const [selectedDistro, setSelectedDistro] = useState("");

  const wsl2Distros = distros?.filter((d) => d.wsl_version === 2) ?? [];

  return (
    <div className="border-surface-1 bg-mantle rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <HardDrive className="text-teal h-5 w-5" />
        <h4 className="text-text font-semibold">VHDX Optimization</h4>
      </div>

      <p className="text-subtext-0 mb-4 text-sm">
        Enable sparse mode on a WSL2 distribution&apos;s virtual disk. This allows the VHDX to
        automatically shrink when space is freed, reducing disk usage on the host.
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            Distribution (WSL2 only)
          </label>
          <Select
            value={selectedDistro}
            onChange={setSelectedDistro}
            options={wsl2Distros.map((d) => ({ value: d.name, label: `${d.name} (${d.state})` }))}
            placeholder="Select a distribution..."
          />
        </div>
        <button
          onClick={() => {
            if (selectedDistro) compactVhdx.mutate(selectedDistro);
          }}
          disabled={!selectedDistro || compactVhdx.isPending}
          className="bg-teal text-crust hover:bg-teal/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          {compactVhdx.isPending ? "Optimizing..." : "Enable Sparse"}
        </button>
      </div>

      <div className="border-surface-0 bg-base/50 text-subtext-0 mt-4 rounded-lg border p-3 text-xs">
        <strong>Note:</strong> The distro will be terminated before enabling sparse mode. This
        operation is safe and non-destructive.
      </div>
    </div>
  );
}
