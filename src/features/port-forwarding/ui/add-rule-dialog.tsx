import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useDistros } from "@/features/distro-list/api/queries";
import { useAddPortForwarding } from "../api/mutations";

interface AddRuleDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDistro?: string;
}

export function AddRuleDialog({ open, onClose, defaultDistro }: AddRuleDialogProps) {
  const { data: distros } = useDistros();
  const addRule = useAddPortForwarding();

  const [distroName, setDistroName] = useState(defaultDistro ?? "");
  const [wslPort, setWslPort] = useState("");
  const [hostPort, setHostPort] = useState("");

  const runningDistros = distros?.filter((d) => d.state === "Running") ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const wsl = parseInt(wslPort, 10);
    const host = parseInt(hostPort, 10);
    if (!distroName || isNaN(wsl) || isNaN(host)) return;

    addRule.mutate(
      { distroName, wslPort: wsl, hostPort: host },
      {
        onSuccess: () => {
          setWslPort("");
          setHostPort("");
          onClose();
        },
      },
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="border-surface-1 bg-base w-full max-w-md rounded-xl border p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-text text-lg font-semibold">Add Port Forwarding Rule</h3>
          <button onClick={onClose} className="text-subtext-0 hover:text-text transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">Distribution</label>
            <select
              value={distroName}
              onChange={(e) => setDistroName(e.target.value)}
              className="border-surface-1 bg-mantle text-text focus:border-blue w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
              required
            >
              <option value="">Select a running distro...</option>
              {runningDistros.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-subtext-0 mb-1 block text-xs font-medium">WSL Port</label>
              <input
                type="number"
                min={1}
                max={65535}
                value={wslPort}
                onChange={(e) => setWslPort(e.target.value)}
                placeholder="e.g. 3000"
                className="border-surface-1 bg-mantle text-text placeholder:text-overlay-0 focus:border-blue w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-subtext-0 mb-1 block text-xs font-medium">Host Port</label>
              <input
                type="number"
                min={1}
                max={65535}
                value={hostPort}
                onChange={(e) => setHostPort(e.target.value)}
                placeholder="e.g. 3000"
                className="border-surface-1 bg-mantle text-text placeholder:text-overlay-0 focus:border-blue w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="border-surface-0 bg-mantle/50 text-subtext-0 rounded-lg border p-3 text-xs">
            Traffic to <strong>localhost:{hostPort || "?"}</strong> on Windows will be forwarded to{" "}
            <strong>
              {distroName || "distro"}:{wslPort || "?"}
            </strong>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-subtext-0 hover:text-text rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addRule.isPending}
              className="bg-blue text-crust hover:bg-blue/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {addRule.isPending ? "Adding..." : "Add Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
