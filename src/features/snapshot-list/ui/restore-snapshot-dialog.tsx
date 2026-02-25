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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="border-border bg-card relative z-10 w-full max-w-lg rounded-lg border p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCw className="text-primary h-5 w-5" />
            <h3 className="text-lg font-semibold">Restore Snapshot</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:bg-accent rounded p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Restore Mode</label>
            <div className="flex gap-3">
              <label className="border-border has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-3">
                <input
                  type="radio"
                  name="mode"
                  value="clone"
                  checked={mode === "clone"}
                  onChange={() => setMode("clone")}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">Clone</p>
                  <p className="text-muted-foreground text-xs">Create as new distro</p>
                </div>
              </label>
              <label className="border-border has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex flex-1 cursor-pointer items-center gap-2 rounded-md border p-3">
                <input
                  type="radio"
                  name="mode"
                  value="overwrite"
                  checked={mode === "overwrite"}
                  onChange={() => setMode("overwrite")}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">Overwrite</p>
                  <p className="text-muted-foreground text-xs">Replace original distro</p>
                </div>
              </label>
            </div>
          </div>

          {mode === "clone" && (
            <div>
              <label className="mb-1 block text-sm font-medium">New Distribution Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ubuntu-restored"
                className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                required
              />
            </div>
          )}

          {mode === "overwrite" && (
            <div className="border-warning/50 bg-warning/10 text-warning rounded-md border p-3 text-sm">
              This will terminate and replace the original distribution. Make sure to back up any
              unsaved work.
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Install Location</label>
            <input
              type="text"
              value={installLocation}
              onChange={(e) => setInstallLocation(e.target.value)}
              placeholder="/path/to/install"
              className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
              required
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Directory where the distribution&apos;s virtual disk will be stored.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border-border text-muted-foreground hover:bg-accent rounded-md border px-4 py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={restoreSnapshot.isPending}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              <RotateCw className="h-4 w-4" />
              {restoreSnapshot.isPending ? "Restoring..." : "Restore"}
            </button>
          </div>

          {restoreSnapshot.isError && (
            <p className="text-destructive text-sm">{restoreSnapshot.error.message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
