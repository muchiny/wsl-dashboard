import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen, Loader2 } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { tauriInvoke } from "@/shared/api/tauri-client";

interface RestoreOverwriteFormProps {
  distroName: string;
  open: boolean;
  onPathResolved: (path: string | null, loading: boolean) => void;
}

const inputClass = "focus-ring w-full rounded-lg glass-input px-3 py-2 text-sm text-text";

export function RestoreOverwriteForm({
  distroName,
  open,
  onPathResolved,
}: RestoreOverwriteFormProps) {
  const { t } = useTranslation();
  const [overwritePath, setOverwritePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const [fetchKey, setFetchKey] = useState<string | null>(null);

  const currentFetchKey = open && distroName ? distroName : null;
  if (currentFetchKey !== fetchKey) {
    setFetchKey(currentFetchKey);
    if (currentFetchKey) {
      setLoading(true);
      setOverwritePath(null);
    }
  }

  useEffect(() => {
    if (!currentFetchKey) return;
    let cancelled = false;
    tauriInvoke<string>("get_distro_install_path", { name: currentFetchKey })
      .then((path) => {
        if (!cancelled) {
          setOverwritePath(path);
          onPathResolved(path, false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOverwritePath(null);
          onPathResolved(null, false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentFetchKey, onPathResolved]);

  // Sync manual path changes up
  useEffect(() => {
    if (!overwritePath && manualPath) {
      onPathResolved(manualPath, false);
    }
  }, [manualPath, overwritePath, onPathResolved]);

  // Sync loading state up
  useEffect(() => {
    onPathResolved(overwritePath, loading);
  }, [loading, overwritePath, onPathResolved]);

  return (
    <>
      <div className="border-yellow/30 bg-yellow/20 text-yellow rounded-lg border p-3 text-sm">
        {t("snapshots.restore.overwriteWarning")}
      </div>

      <div>
        <label className="text-subtext-1 mb-1 block text-sm font-medium">
          {t("snapshots.restore.installLocation")}
        </label>
        {loading ? (
          <div className="text-subtext-0 flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("snapshots.restore.detectingPath")}
          </div>
        ) : overwritePath ? (
          <p className="text-text glass-input rounded-lg px-3 py-2 font-mono text-xs">
            {overwritePath}
          </p>
        ) : (
          <div>
            <p className="text-yellow mb-1 text-xs">{t("snapshots.restore.manualPathRequired")}</p>
            <div className="flex gap-1">
              <input
                type="text"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                placeholder="C:\Users\...\LocalState"
                maxLength={260}
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={async () => {
                  const dir = await openDialog({
                    directory: true,
                    title: t("snapshots.restore.browseInstallLocationTitle"),
                  });
                  if (dir) setManualPath(dir);
                }}
                className="border-surface-1 text-subtext-0 hover:text-text shrink-0 rounded-lg border px-2 hover:bg-white/8"
                aria-label={t("snapshots.restore.browseInstallLocation")}
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
