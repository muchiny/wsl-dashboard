import { useState } from "react";
import { HardDrive, Zap } from "lucide-react";
import { useDistros } from "@/features/distro-list/api/queries";
import { useCompactVhdx } from "../api/mutations";

export function VhdxCompactPanel() {
  const { data: distros } = useDistros();
  const compactVhdx = useCompactVhdx();
  const [selectedDistro, setSelectedDistro] = useState("");

  const wsl2Distros = distros?.filter((d) => d.wsl_version === 2) ?? [];

  return (
    <div className="rounded-xl border border-surface-1 bg-mantle p-5">
      <div className="mb-4 flex items-center gap-2">
        <HardDrive className="h-5 w-5 text-teal" />
        <h4 className="font-semibold text-text">VHDX Optimization</h4>
      </div>

      <p className="mb-4 text-sm text-subtext-0">
        Enable sparse mode on a WSL2 distribution&apos;s virtual disk. This allows the VHDX to
        automatically shrink when space is freed, reducing disk usage on the host.
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-subtext-0">
            Distribution (WSL2 only)
          </label>
          <select
            value={selectedDistro}
            onChange={(e) => setSelectedDistro(e.target.value)}
            className="w-full rounded-lg border border-surface-1 bg-base px-3 py-2 text-sm text-text focus:border-blue focus:outline-none"
          >
            <option value="">Select a distribution...</option>
            {wsl2Distros.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name} ({d.state})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            if (selectedDistro) compactVhdx.mutate(selectedDistro);
          }}
          disabled={!selectedDistro || compactVhdx.isPending}
          className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-crust transition-colors hover:bg-teal/90 disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          {compactVhdx.isPending ? "Optimizing..." : "Enable Sparse"}
        </button>
      </div>

      {compactVhdx.isSuccess && (
        <p className="mt-3 text-sm text-green">
          Sparse mode enabled successfully. The distro was terminated during the process.
        </p>
      )}

      {compactVhdx.isError && (
        <p className="mt-3 text-sm text-red">{compactVhdx.error.message}</p>
      )}

      <div className="mt-4 rounded-lg border border-surface-0 bg-base/50 p-3 text-xs text-subtext-0">
        <strong>Note:</strong> The distro will be terminated before enabling sparse mode. This
        operation is safe and non-destructive.
      </div>
    </div>
  );
}
