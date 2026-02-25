import { useState, useEffect } from "react";
import { Plus, X, Archive, FolderOpen } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useDistros } from "@/features/distro-list/api/queries";
import { useCreateSnapshot } from "../api/mutations";

interface CreateSnapshotDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDistro?: string;
}

export function CreateSnapshotDialog({ open, onClose, defaultDistro }: CreateSnapshotDialogProps) {
  const { data: distros } = useDistros();
  const createSnapshot = useCreateSnapshot();

  const [distroName, setDistroName] = useState(defaultDistro ?? "");
  const [name, setName] = useState("");

  useEffect(() => {
    if (defaultDistro) setDistroName(defaultDistro);
  }, [defaultDistro]);

  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"tar" | "tar.gz" | "tar.xz" | "vhdx">("tar");
  const [outputDir, setOutputDir] = useState("");

  if (!open) return null;

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
    "w-full rounded-lg border border-surface-1 bg-base px-3 py-2 text-sm text-text focus:border-blue focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-crust/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-surface-1 bg-mantle p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-mauve" />
            <h3 className="text-lg font-semibold text-text">Create Snapshot</h3>
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
            <label className="mb-1 block text-sm font-medium text-subtext-1">Distribution</label>
            <select
              value={distroName}
              onChange={(e) => setDistroName(e.target.value)}
              className={inputClass}
              required
            >
              <option value="">Select a distribution...</option>
              {distros?.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} ({d.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-subtext-1">Snapshot Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pre-upgrade backup"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-subtext-1">
              Description <span className="text-overlay-0">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this snapshot captures..."
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-subtext-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className={inputClass}
              >
                <option value="tar">tar (fastest)</option>
                <option value="tar.gz">tar.gz (compressed)</option>
                <option value="tar.xz">tar.xz (best compression)</option>
                <option value="vhdx">VHDX (virtual disk)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-subtext-1">
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
                    const dir = await openDialog({ directory: true, title: "Select output directory" });
                    if (dir) setOutputDir(dir);
                  }}
                  className="shrink-0 rounded-lg border border-surface-1 px-2 text-subtext-0 hover:bg-surface-0 hover:text-text"
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
              className="rounded-lg border border-surface-1 px-4 py-2 text-sm text-subtext-1 transition-colors hover:bg-surface-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSnapshot.isPending}
              className="flex items-center gap-2 rounded-lg bg-mauve px-4 py-2 text-sm font-medium text-crust transition-colors hover:bg-mauve/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {createSnapshot.isPending ? "Creating..." : "Create Snapshot"}
            </button>
          </div>

          {createSnapshot.isError && (
            <p className="text-sm text-red">{createSnapshot.error.message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
