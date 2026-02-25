import { useState } from "react";
import { Plus, X, Archive } from "lucide-react";
import { useDistros } from "@/features/distro-list/api/queries";
import { useCreateSnapshot } from "../api/mutations";

interface CreateSnapshotDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateSnapshotDialog({ open, onClose }: CreateSnapshotDialogProps) {
  const { data: distros } = useDistros();
  const createSnapshot = useCreateSnapshot();

  const [distroName, setDistroName] = useState("");
  const [name, setName] = useState("");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="border-border bg-card relative z-10 w-full max-w-lg rounded-lg border p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="text-primary h-5 w-5" />
            <h3 className="text-lg font-semibold">Create Snapshot</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:bg-accent rounded p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Distribution</label>
            <select
              value={distroName}
              onChange={(e) => setDistroName(e.target.value)}
              className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
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
            <label className="mb-1 block text-sm font-medium">Snapshot Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pre-upgrade backup"
              className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this snapshot captures..."
              rows={2}
              className="border-border bg-background focus:border-primary w-full resize-none rounded-md border px-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as typeof format)}
                className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
              >
                <option value="tar">tar (fastest)</option>
                <option value="tar.gz">tar.gz (compressed)</option>
                <option value="tar.xz">tar.xz (best compression)</option>
                <option value="vhdx">VHDX (virtual disk)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Output Directory</label>
              <input
                type="text"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="/path/to/snapshots"
                className="border-border bg-background focus:border-primary w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                required
              />
            </div>
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
              disabled={createSnapshot.isPending}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {createSnapshot.isPending ? "Creating..." : "Create Snapshot"}
            </button>
          </div>

          {createSnapshot.isError && (
            <p className="text-destructive text-sm">{createSnapshot.error.message}</p>
          )}
        </form>
      </div>
    </div>
  );
}
