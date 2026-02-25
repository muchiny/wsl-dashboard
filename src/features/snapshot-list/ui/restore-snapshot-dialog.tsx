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
      <div className="bg-crust/80 fixed inset-0 backdrop-blur-sm" onClick={onClose} />
      <div className="border-surface-1 bg-mantle relative z-10 mx-4 w-full max-w-lg rounded-2xl border p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCw className="text-blue h-5 w-5" />
            <h3 className="text-text text-lg font-semibold">Restore Snapshot</h3>
          </div>
          <button onClick={onClose} className="text-subtext-0 hover:bg-surface-0 rounded-lg p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-subtext-1 mb-2 block text-sm font-medium">Restore Mode</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="border-surface-1 has-[:checked]:border-blue has-[:checked]:bg-blue/5 flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3">
                <input
                  type="radio"
                  name="mode"
                  value="clone"
                  checked={mode === "clone"}
                  onChange={() => setMode("clone")}
                  className="accent-blue"
                />
                <div>
                  <p className="text-text text-sm font-medium">Clone</p>
                  <p className="text-subtext-0 text-xs">Create as new distro</p>
                </div>
              </label>
              <label className="border-surface-1 has-[:checked]:border-blue has-[:checked]:bg-blue/5 flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3">
                <input
                  type="radio"
                  name="mode"
                  value="overwrite"
                  checked={mode === "overwrite"}
                  onChange={() => setMode("overwrite")}
                  className="accent-blue"
                />
                <div>
                  <p className="text-text text-sm font-medium">Overwrite</p>
                  <p className="text-subtext-0 text-xs">Replace original distro</p>
                </div>
              </label>
            </div>
          </div>

          {mode === "clone" && (
            <div>
              <label className="text-subtext-1 mb-1 block text-sm font-medium">
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
            <div className="border-yellow/30 bg-yellow/10 text-yellow rounded-lg border p-3 text-sm">
              This will terminate and replace the original distribution. Make sure to back up any
              unsaved work.
            </div>
          )}

          <div>
            <label className="text-subtext-1 mb-1 block text-sm font-medium">
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
            <p className="text-overlay-0 mt-1 text-xs">
              Directory where the distribution&apos;s virtual disk will be stored.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border-surface-1 text-subtext-1 hover:bg-surface-0 rounded-lg border px-4 py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={restoreSnapshot.isPending}
              className="bg-blue text-crust hover:bg-blue/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RotateCw className="h-4 w-4" />
              {restoreSnapshot.isPending ? "Restoring..." : "Restore"}
            </button>
          </div>

          {restoreSnapshot.isError && (
            <p className="text-red text-sm">{restoreSnapshot.error.message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
