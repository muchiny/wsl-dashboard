import { useState } from "react";
import { Plus, X, Archive, FolderOpen } from "lucide-react";
import { Select } from "@/shared/ui/select";
import { DialogShell } from "@/shared/ui/dialog-shell";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useDistros } from "@/features/distro-list/api/queries";
import { useCreateSnapshot } from "../api/mutations";
import { usePreferencesStore } from "@/shared/stores/use-preferences-store";

interface CreateSnapshotDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDistro?: string;
}

export function CreateSnapshotDialog({ open, onClose, defaultDistro }: CreateSnapshotDialogProps) {
  const { data: distros } = useDistros();
  const createSnapshot = useCreateSnapshot();
  const { defaultSnapshotDir } = usePreferencesStore();

  const [distroName, setDistroName] = useState(defaultDistro ?? "");
  const [name, setName] = useState("");

  // Sync distroName with prop changes (adjust-state-during-render pattern)
  const [prevDefaultDistro, setPrevDefaultDistro] = useState(defaultDistro);
  if (defaultDistro && defaultDistro !== prevDefaultDistro) {
    setPrevDefaultDistro(defaultDistro);
    setDistroName(defaultDistro);
  }

  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"tar" | "tar.gz" | "tar.xz" | "vhdx">("tar");
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
            Create Snapshot
          </h3>
        </div>
        <button onClick={onClose} className="text-subtext-0 hover:bg-surface-0 rounded-lg p-1">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-subtext-1 mb-1 block text-sm font-medium">Distribution</label>
          <Select
            value={distroName}
            onChange={setDistroName}
            options={
              distros?.map((d) => ({ value: d.name, label: `${d.name} (${d.state})` })) ?? []
            }
            placeholder="Select a distribution..."
          />
        </div>

        <div>
          <label className="text-subtext-1 mb-1 block text-sm font-medium">Snapshot Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pre-upgrade backup"
            maxLength={64}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="text-subtext-1 mb-1 block text-sm font-medium">
            Description <span className="text-overlay-0">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this snapshot captures..."
            rows={2}
            maxLength={256}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-subtext-1 mb-1 block text-sm font-medium">Format</label>
            <Select
              value={format}
              onChange={(v) => setFormat(v as typeof format)}
              options={[
                { value: "tar", label: "tar (fastest)" },
                { value: "tar.gz", label: "tar.gz (compressed)" },
                { value: "tar.xz", label: "tar.xz (best compression)" },
                { value: "vhdx", label: "VHDX (virtual disk)" },
              ]}
              placeholder=""
            />
          </div>

          <div>
            <label className="text-subtext-1 mb-1 block text-sm font-medium">
              Output Directory
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
                    title: "Select output directory",
                  });
                  if (dir) setOutputDir(dir);
                }}
                className="border-surface-1 text-subtext-0 hover:bg-surface-0 hover:text-text shrink-0 rounded-lg border px-2"
                title="Browse..."
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={createSnapshot.isPending}
            className="bg-mauve text-crust hover:bg-mauve/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {createSnapshot.isPending ? "Creating..." : "Create Snapshot"}
          </button>
        </div>

        {createSnapshot.isError && (
          <p className="text-red text-sm">{createSnapshot.error.message}</p>
        )}
      </form>
    </DialogShell>
  );
}
