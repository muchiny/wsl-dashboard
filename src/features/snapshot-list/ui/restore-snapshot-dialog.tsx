import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RotateCw, X, Loader2 } from "lucide-react";
import { DialogShell } from "@/shared/ui/dialog-shell";
import { useRestoreSnapshot } from "../api/mutations";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";
import { RestoreCloneForm } from "./restore-clone-form";
import { RestoreOverwriteForm } from "./restore-overwrite-form";

interface RestoreSnapshotDialogProps {
  open: boolean;
  snapshotId: string | null;
  distroName: string;
  onClose: () => void;
}

const VALID_DISTRO_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function RestoreSnapshotDialog({
  open,
  snapshotId,
  distroName,
  onClose,
}: RestoreSnapshotDialogProps) {
  const { t } = useTranslation();
  const restoreSnapshot = useRestoreSnapshot();
  const defaultInstallLocation = usePreferencesStore((s) => s.defaultInstallLocation);

  const [mode, setMode] = useState<"clone" | "overwrite">("clone");
  const [newName, setNewName] = useState("");
  const [installLocation, setInstallLocation] = useState(defaultInstallLocation);
  const [overwritePath, setOverwritePath] = useState<string | null>(null);
  const [overwritePathLoading, setOverwritePathLoading] = useState(false);

  const isDialogOpen = open && !!snapshotId;

  const nameError =
    mode === "clone" && newName && !VALID_DISTRO_NAME.test(newName)
      ? t("snapshots.restore.nameError")
      : null;

  const effectiveInstallLocation = mode === "overwrite" ? overwritePath : installLocation;

  const handlePathResolved = useCallback((path: string | null, loading: boolean) => {
    setOverwritePath(path);
    setOverwritePathLoading(loading);
  }, []);

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

  return (
    <DialogShell
      open={isDialogOpen}
      onClose={onClose}
      ariaLabelledby="restore-snapshot-title"
      maxWidth="max-w-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCw className="text-blue h-5 w-5" />
          <h3 id="restore-snapshot-title" className="text-text text-lg font-semibold">
            {t("snapshots.restore.title")}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-subtext-0 rounded-lg p-1 hover:bg-white/8"
          aria-label={t("common.close")}
          data-testid="restore-snapshot-close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Step 1: Mode selection */}
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
                data-testid="restore-mode-clone"
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
                data-testid="restore-mode-overwrite"
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

        {/* Step 2: Mode-specific form */}
        {mode === "clone" ? (
          <RestoreCloneForm
            newName={newName}
            onNewNameChange={setNewName}
            installLocation={installLocation}
            onInstallLocationChange={setInstallLocation}
            nameError={nameError}
          />
        ) : (
          <RestoreOverwriteForm
            distroName={distroName}
            open={isDialogOpen}
            onPathResolved={handlePathResolved}
          />
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="border-surface-1 text-subtext-1 rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-white/5"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={
              restoreSnapshot.isPending ||
              !!nameError ||
              overwritePathLoading ||
              (mode === "overwrite" && !effectiveInstallLocation)
            }
            className="bg-blue text-crust hover:bg-blue/90 hover:neon-glow-blue flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            data-testid="restore-snapshot-submit"
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
