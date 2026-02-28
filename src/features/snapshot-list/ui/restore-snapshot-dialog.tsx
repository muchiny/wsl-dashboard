import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RotateCw, X, FolderOpen, Loader2 } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { DialogShell } from "@/shared/ui/dialog-shell";
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
  const { t } = useTranslation();
  const restoreSnapshot = useRestoreSnapshot();
  const { defaultInstallLocation } = usePreferencesStore();

  const [mode, setMode] = useState<"clone" | "overwrite">("clone");
  const [newName, setNewName] = useState("");
  const [installLocation, setInstallLocation] = useState(defaultInstallLocation);
  const [overwritePath, setOverwritePath] = useState<string | null>(null);
  const [overwritePathLoading, setOverwritePathLoading] = useState(false);
  const [fetchKey, setFetchKey] = useState<string | null>(null);

  // Set loading state during render when fetch conditions change
  const currentFetchKey = mode === "overwrite" && open && distroName ? distroName : null;
  if (currentFetchKey !== fetchKey) {
    setFetchKey(currentFetchKey);
    if (currentFetchKey) {
      setOverwritePathLoading(true);
      setOverwritePath(null);
    }
  }

  // Fetch distro install path when switching to overwrite mode
  useEffect(() => {
    if (!currentFetchKey) return;
    let cancelled = false;
    tauriInvoke<string>("get_distro_install_path", { name: currentFetchKey })
      .then((path) => {
        if (!cancelled) setOverwritePath(path);
      })
      .catch(() => {
        if (!cancelled) setOverwritePath(null);
      })
      .finally(() => {
        if (!cancelled) setOverwritePathLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentFetchKey]);

  const isDialogOpen = open && !!snapshotId;

  const VALID_DISTRO_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
  const nameError =
    mode === "clone" && newName && !VALID_DISTRO_NAME.test(newName)
      ? t("snapshots.restore.nameError")
      : null;

  const effectiveInstallLocation = mode === "overwrite" ? overwritePath : installLocation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "clone" && (!newName || nameError)) return;
    if (mode === "clone" && !installLocation) return;

    restoreSnapshot.mutate(
      {
        snapshot_id: snapshotId!,
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
    "focus-ring w-full rounded-lg border border-surface-1 bg-base px-3 py-2 text-sm text-text";

  return (
    <DialogShell
      open={isDialogOpen}
      onClose={onClose}
      ariaLabelledby="restore-snapshot-title"
      maxWidth="max-w-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw className="text-blue h-5 w-5" />
          <h3 id="restore-snapshot-title" className="text-text text-lg font-semibold">
            {t("snapshots.restore.title")}
          </h3>
        </div>
        <button onClick={onClose} className="text-subtext-0 hover:bg-surface-0 rounded-lg p-1">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-subtext-1 mb-2 block text-sm font-medium">
            {t("snapshots.restore.mode")}
          </label>
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
                <p className="text-text text-sm font-medium">{t("snapshots.restore.clone")}</p>
                <p className="text-subtext-0 text-xs">{t("snapshots.restore.cloneDescription")}</p>
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
                <p className="text-text text-sm font-medium">{t("snapshots.restore.overwrite")}</p>
                <p className="text-subtext-0 text-xs">
                  {t("snapshots.restore.overwriteDescription")}
                </p>
              </div>
            </label>
          </div>
        </div>

        {mode === "clone" && (
          <div>
            <label className="text-subtext-1 mb-1 block text-sm font-medium">
              {t("snapshots.restore.newDistroName")}
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("snapshots.restore.newDistroNamePlaceholder")}
              maxLength={64}
              className={cn(inputClass, nameError && "border-red")}
              required
            />
            {nameError && <p className="text-red mt-1 text-xs">{nameError}</p>}
          </div>
        )}

        {mode === "overwrite" && (
          <div className="border-yellow/30 bg-yellow/20 text-yellow rounded-lg border p-3 text-sm">
            {t("snapshots.restore.overwriteWarning")}
          </div>
        )}

        {mode === "clone" && (
          <div>
            <label className="text-subtext-1 mb-1 block text-sm font-medium">
              {t("snapshots.restore.installLocation")}
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={installLocation}
                onChange={(e) => setInstallLocation(e.target.value)}
                placeholder="C:\WSL\..."
                maxLength={260}
                className={`${inputClass} flex-1`}
                required
              />
              <button
                type="button"
                onClick={async () => {
                  const dir = await openDialog({
                    directory: true,
                    title: t("snapshots.restore.browseInstallLocationTitle"),
                  });
                  if (dir) setInstallLocation(dir);
                }}
                className="border-surface-1 text-subtext-0 hover:bg-surface-0 hover:text-text shrink-0 rounded-lg border px-2"
                aria-label={t("snapshots.restore.browseInstallLocation")}
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
            <p className="text-overlay-0 mt-1 text-xs">
              {t("snapshots.restore.installLocationHint")}
            </p>
          </div>
        )}

        {mode === "overwrite" && (
          <div>
            <label className="text-subtext-1 mb-1 block text-sm font-medium">
              {t("snapshots.restore.installLocation")}
            </label>
            {overwritePathLoading ? (
              <div className="text-subtext-0 flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("snapshots.restore.detectingPath")}
              </div>
            ) : overwritePath ? (
              <p className="text-text bg-surface-0 rounded-lg px-3 py-2 font-mono text-xs">
                {overwritePath}
              </p>
            ) : (
              <p className="text-overlay-0 text-xs">{t("snapshots.restore.cannotDetectPath")}</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="border-surface-1 text-subtext-1 hover:bg-surface-0 rounded-lg border px-4 py-2 text-sm transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={restoreSnapshot.isPending || !!nameError || overwritePathLoading}
            className="bg-blue text-crust hover:bg-blue/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {restoreSnapshot.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            {restoreSnapshot.isPending
              ? t("snapshots.restore.restoring")
              : t("snapshots.restore.submit")}
          </button>
        </div>

        {restoreSnapshot.isError && (
          <p className="text-red text-sm">{restoreSnapshot.error.message}</p>
        )}
      </form>
    </DialogShell>
  );
}
