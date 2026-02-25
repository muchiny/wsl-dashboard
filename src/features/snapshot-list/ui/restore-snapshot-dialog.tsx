import { useState } from "react";
import { RotateCw, X } from "lucide-react";
import { useRestoreSnapshot } from "../api/mutations";

interface RestoreSnapshotDialogProps {
  open: boolean;
  snapshotId: string | null;
  onClose: () => void;
}

export function RestoreSnapshotDialog({ open, snapshotId, onClose }: RestoreSnapshotDialogProps) {
  const restoreSnapshot = useRestoreSnapshot();

  const [mode, setMode] = useState<"clone" | "overwrite">("clone");
  const [newName, setNewName] = useState("");
  const [installLocation, setInstallLocation] = useState("");

  if (!open || !snapshotId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!installLocation) return;
    if (mode === "clone" && !newName) return;

    restoreSnapshot.mutate(
      {
        snapshot_id: snapshotId,
        mode,
        new_name: mode === "clone" ? newName : undefined,
        install_location: installLocation,
      },
      {
        onSuccess: () => {
          onClose();
          setNewName("");
          setInstallLocation("");
        },
      },
    );
  };

  const inputClass =
    "w-full rounded-lg border border-surface-1 bg-base px-3 py-2 text-sm text-text focus:border-blue focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-crust/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-surface-1 bg-mantle p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCw className="h-5 w-5 text-blue" />
            <h3 className="text-lg font-semibold text-text">Restore Snapshot</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-subtext-0 hover:bg-surface-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-subtext-1">Restore Mode</label>
            <div className="flex gap-3">
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-surface-1 p-3 has-[:checked]:border-blue has-[:checked]:bg-blue/5">
                <input
                  type="radio"
                  name="mode"
                  value="clone"
                  checked={mode === "clone"}
                  onChange={() => setMode("clone")}
                  className="accent-blue"
                />
                <div>
                  <p className="text-sm font-medium text-text">Clone</p>
                  <p className="text-xs text-subtext-0">Create as new distro</p>
                </div>
              </label>
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-surface-1 p-3 has-[:checked]:border-blue has-[:checked]:bg-blue/5">
                <input
                  type="radio"
                  name="mode"
                  value="overwrite"
                  checked={mode === "overwrite"}
                  onChange={() => setMode("overwrite")}
                  className="accent-blue"
                />
                <div>
                  <p className="text-sm font-medium text-text">Overwrite</p>
                  <p className="text-xs text-subtext-0">Replace original distro</p>
                </div>
              </label>
            </div>
          </div>

          {mode === "clone" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-subtext-1">
                New Distribution Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ubuntu-restored"
                className={inputClass}
                required
              />
            </div>
          )}

          {mode === "overwrite" && (
            <div className="rounded-lg border border-yellow/30 bg-yellow/10 p-3 text-sm text-yellow">
              This will terminate and replace the original distribution. Make sure to back up any
              unsaved work.
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-subtext-1">
              Install Location
            </label>
            <input
              type="text"
              value={installLocation}
              onChange={(e) => setInstallLocation(e.target.value)}
              placeholder="/path/to/install"
              className={inputClass}
              required
            />
            <p className="mt-1 text-xs text-overlay-0">
              Directory where the distribution&apos;s virtual disk will be stored.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-surface-1 px-4 py-2 text-sm text-subtext-1 transition-colors hover:bg-surface-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={restoreSnapshot.isPending}
              className="flex items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-medium text-crust transition-colors hover:bg-blue/90 disabled:opacity-50"
            >
              <RotateCw className="h-4 w-4" />
              {restoreSnapshot.isPending ? "Restoring..." : "Restore"}
            </button>
          </div>

          {restoreSnapshot.isError && (
            <p className="text-sm text-red">{restoreSnapshot.error.message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
