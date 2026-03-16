import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { DialogShell } from "@/shared/ui/dialog-shell";
import { useDeleteDistro } from "../api/mutations";

interface DeleteDistroDialogProps {
  open: boolean;
  distroName: string;
  onClose: () => void;
}

export function DeleteDistroDialog({ open, distroName, onClose }: DeleteDistroDialogProps) {
  const { t } = useTranslation();
  const deleteDistro = useDeleteDistro();
  const [deleteSnapshots, setDeleteSnapshots] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    deleteDistro.mutate(
      { name: distroName, deleteSnapshots },
      {
        onSuccess: () => {
          onClose();
          setDeleteSnapshots(false);
        },
      },
    );
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      ariaLabelledby="delete-distro-title"
      maxWidth="max-w-md"
      role="alertdialog"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-red/25 flex h-8 w-8 items-center justify-center rounded-full">
            <Trash2 className="text-red h-4 w-4" />
          </div>
          <h3 id="delete-distro-title" className="text-text text-lg font-semibold">
            {t("distros.deleteTitle")}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-subtext-0 rounded-lg p-1 hover:bg-white/8"
          aria-label={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="border-red/30 bg-red/10 flex items-start gap-2 rounded-lg border p-3">
          <AlertTriangle className="text-red mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-red text-sm">{t("distros.deleteWarning", { name: distroName })}</p>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={deleteSnapshots}
            onChange={(e) => setDeleteSnapshots(e.target.checked)}
            className="accent-red h-4 w-4 rounded"
            data-testid="delete-snapshots-checkbox"
          />
          <span className="text-text text-sm">{t("distros.deleteSnapshotsOption")}</span>
        </label>

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
            disabled={deleteDistro.isPending}
            className="bg-red text-crust hover:bg-red/80 hover:neon-glow-purple flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            data-testid="delete-distro-submit"
          >
            {deleteDistro.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {deleteDistro.isPending ? t("distros.deleting") : t("distros.deleteConfirm")}
          </button>
        </div>

        {deleteDistro.isError && <p className="text-red text-sm">{deleteDistro.error.message}</p>}
      </form>
    </DialogShell>
  );
}
