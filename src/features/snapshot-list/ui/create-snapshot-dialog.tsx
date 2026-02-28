import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Archive, FolderOpen, Loader2 } from "lucide-react";
import { Select } from "@/shared/ui/select";
import { DialogShell } from "@/shared/ui/dialog-shell";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useDistros } from "@/shared/api/distro-queries";
import { useCreateSnapshot } from "../api/mutations";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";

interface CreateSnapshotDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDistro?: string;
}

export function CreateSnapshotDialog({ open, onClose, defaultDistro }: CreateSnapshotDialogProps) {
  const { t } = useTranslation();
  const { data: distros } = useDistros();
  const createSnapshot = useCreateSnapshot();
  const { defaultSnapshotDir } = usePreferencesStore();

  const [distroName, setDistroName] = useState(defaultDistro ?? "");
  const [name, setName] = useState("");

  // Sync when parent changes defaultDistro (React-recommended adjust-state-during-render)
  const [prevDefaultDistro, setPrevDefaultDistro] = useState(defaultDistro);
  if (defaultDistro !== prevDefaultDistro) {
    setPrevDefaultDistro(defaultDistro);
    if (defaultDistro) setDistroName(defaultDistro);
  }

  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"tar" | "vhdx">("tar");
  const [outputDir, setOutputDir] = useState(defaultSnapshotDir);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distroName || !name || !outputDir) return;

    createSnapshot.mutate(
      {
        distro_name: distroName,
        name,
        description: description || undefined,
        format,
        output_dir: outputDir,
      },
      {
        onSuccess: () => {
          onClose();
          setName("");
          setDescription("");
        },
      },
    );
  };

  const inputClass =
    "focus-ring w-full rounded-lg border border-surface-1 bg-base px-3 py-2 text-sm text-text";

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      ariaLabelledby="create-snapshot-title"
      maxWidth="max-w-lg"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="text-mauve h-5 w-5" />
          <h3 id="create-snapshot-title" className="text-text text-lg font-semibold">
            {t("snapshots.create.title")}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="focus-ring text-subtext-0 hover:bg-surface-0 rounded-lg p-1"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-subtext-1 mb-1 block text-sm font-medium">
            {t("snapshots.create.distribution")}
          </label>
          <Select
            value={distroName}
            onChange={setDistroName}
            options={
              distros?.map((d) => ({ value: d.name, label: `${d.name} (${d.state})` })) ?? []
            }
            placeholder={t("snapshots.create.selectDistro")}
          />
        </div>

        <div>
          <label className="text-subtext-1 mb-1 block text-sm font-medium">
            {t("snapshots.create.name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("snapshots.create.namePlaceholder")}
            maxLength={64}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="text-subtext-1 mb-1 block text-sm font-medium">
            {t("snapshots.create.description")}{" "}
            <span className="text-overlay-0">{t("common.optional")}</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("snapshots.create.descriptionPlaceholder")}
            rows={2}
            maxLength={256}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-subtext-1 mb-1 block text-sm font-medium">
              {t("snapshots.create.format")}
            </label>
            <Select
              value={format}
              onChange={(v) => setFormat(v as typeof format)}
              options={[
                { value: "tar", label: t("snapshots.create.formatTar") },
                { value: "vhdx", label: t("snapshots.create.formatVhdx") },
              ]}
              placeholder=""
            />
          </div>

          <div>
            <label className="text-subtext-1 mb-1 block text-sm font-medium">
              {t("snapshots.create.outputDirectory")}
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="C:\Users\...\snapshots"
                className={`${inputClass} flex-1`}
                required
              />
              <button
                type="button"
                onClick={async () => {
                  const dir = await openDialog({
                    directory: true,
                    title: t("snapshots.create.browseOutputDir"),
                  });
                  if (dir) setOutputDir(dir);
                }}
                className="border-surface-1 text-subtext-0 hover:bg-surface-0 hover:text-text shrink-0 rounded-lg border px-2"
                title={t("common.browse")}
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

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
            disabled={createSnapshot.isPending}
            className="bg-mauve text-crust hover:bg-mauve/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {createSnapshot.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {createSnapshot.isPending
              ? t("snapshots.create.creating")
              : t("snapshots.create.submit")}
          </button>
        </div>

        {createSnapshot.isError && (
          <p className="text-red text-sm">{createSnapshot.error.message}</p>
        )}
      </form>
    </DialogShell>
  );
}
