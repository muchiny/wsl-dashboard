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
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2">
        <HardDrive className="text-primary h-5 w-5" />
        <h4 className="font-semibold">VHDX Optimization</h4>
      </div>

      <p className="text-muted-foreground mb-4 text-sm">
        Enable sparse mode on a WSL2 distribution&apos;s virtual disk. This allows the VHDX to
        automatically shrink when space is freed, reducing disk usage on the host.
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Distribution (WSL2 only)
          </label>
          <select
            value={selectedDistro}
            onChange={(e) => setSelectedDistro(e.target.value)}
            className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
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
          className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          {compactVhdx.isPending ? "Optimizing..." : "Enable Sparse"}
        </button>
      </div>

      {compactVhdx.isSuccess && (
        <p className="text-success mt-3 text-sm">
          Sparse mode enabled successfully. The distro was terminated during the process.
        </p>
      )}

      {compactVhdx.isError && (
        <p className="text-destructive mt-3 text-sm">{compactVhdx.error.message}</p>
      )}

      <div className="border-border bg-muted/50 text-muted-foreground mt-4 rounded-md border p-3 text-xs">
        <strong>Note:</strong> The distro will be terminated before enabling sparse mode. This
        operation is safe and non-destructive.
      </div>
    </div>
  );
}
