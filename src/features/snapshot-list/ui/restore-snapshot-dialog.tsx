import { useState, useEffect, useRef } from "react";
import { RotateCw, X, FolderOpen, Loader2 } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useRestoreSnapshot } from "../api/mutations";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";
import { tauriInvoke } from "@/shared/api/tauri-client";
import { cn } from "@/shared/lib/utils";

interface RestoreSnapshotDialogProps {
  open: boolean;
  snapshotId: string | null;
  distroName: string;
  onClose: () => void;
}

export function RestoreSnapshotDialog({
  open,
  snapshotId,
  distroName,
  onClose,
}: RestoreSnapshotDialogProps) {
  const restoreSnapshot = useRestoreSnapshot();
  const { defaultInstallLocation } = usePreferencesStore();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"clone" | "overwrite">("clone");
  const [newName, setNewName] = useState("");
  const [installLocation, setInstallLocation] = useState(defaultInstallLocation);
  const [overwritePath, setOverwritePath] = useState<string | null>(null);
  const [overwritePathLoading, setOverwritePathLoading] = useState(false);

  // Fetch distro install path when switching to overwrite mode
  useEffect(() => {
    if (mode !== "overwrite" || !distroName || !open) return;
    setOverwritePathLoading(true);
    tauriInvoke<string>("get_distro_install_path", { name: distroName })
      .then((path) => setOverwritePath(path))
      .catch(() => setOverwritePath(null))
      .finally(() => setOverwritePathLoading(false));
  }, [mode, distroName, open]);

  // Focus trap + Escape key
  useEffect(() => {
    if (!open || !snapshotId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, snapshotId, onClose]);

  if (!open || !snapshotId) return null;

  const VALID_DISTRO_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  const nameError =
    mode === "clone" && newName && !VALID_DISTRO_NAME.test(newName)
      ? "Only letters, numbers, dots, hyphens and underscores allowed"
      : null;

  const effectiveInstallLocation = mode === "overwrite" ? overwritePath : installLocation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "clone" && (!newName || nameError)) return;
    if (mode === "clone" && !installLocation) return;

    restoreSnapshot.mutate(
      {
        snapshot_id: snapshotId,
        mode,
        new_name: mode === "clone" ? newName : undefined,
        install_location: effectiveInstallLocation ?? undefined,
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
      <div
        className="bg-crust/80 animate-in fade-in fixed inset-0 backdrop-blur-sm duration-150"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-snapshot-title"
        className="border-surface-1 bg-mantle animate-in zoom-in-95 fade-in relative z-10 mx-4 w-full max-w-lg rounded-2xl border p-6 shadow-2xl duration-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCw className="text-blue h-5 w-5" />
            <h3 id="restore-snapshot-title" className="text-text text-lg font-semibold">
              Restore Snapshot
            </h3>
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
                className={cn(inputClass, nameError && "border-red")}
                required
              />
              {nameError && <p className="text-red mt-1 text-xs">{nameError}</p>}
            </div>
          )}

          {mode === "overwrite" && (
            <div className="border-yellow/30 bg-yellow/10 text-yellow rounded-lg border p-3 text-sm">
              This will terminate and replace the original distribution. Make sure to back up any
              unsaved work.
            </div>
          )}

          {mode === "clone" && (
            <div>
              <label className="text-subtext-1 mb-1 block text-sm font-medium">
                Install Location
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={installLocation}
                  onChange={(e) => setInstallLocation(e.target.value)}
                  placeholder="C:\WSL\..."
                  className={`${inputClass} flex-1`}
                  required
                />
                <button
                  type="button"
                  onClick={async () => {
                    const dir = await openDialog({
                      directory: true,
                      title: "Select install location",
                    });
                    if (dir) setInstallLocation(dir);
                  }}
                  className="border-surface-1 text-subtext-0 hover:bg-surface-0 hover:text-text shrink-0 rounded-lg border px-2"
                  aria-label="Browse install location"
                >
                  <FolderOpen className="h-4 w-4" />
                </button>
              </div>
              <p className="text-overlay-0 mt-1 text-xs">
                Directory where the distribution&apos;s virtual disk will be stored.
              </p>
            </div>
          )}

          {mode === "overwrite" && (
            <div>
              <label className="text-subtext-1 mb-1 block text-sm font-medium">
                Install Location
              </label>
              {overwritePathLoading ? (
                <div className="text-subtext-0 flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detecting install path...
                </div>
              ) : overwritePath ? (
                <p className="text-text bg-surface-0 rounded-lg px-3 py-2 font-mono text-xs">
                  {overwritePath}
                </p>
              ) : (
                <p className="text-overlay-0 text-xs">
                  Could not detect the original install path. The distro will be restored to its
                  default location.
                </p>
              )}
            </div>
          )}

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
              disabled={restoreSnapshot.isPending || !!nameError || overwritePathLoading}
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
