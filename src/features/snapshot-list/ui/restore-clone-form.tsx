import { useTranslation } from "react-i18next";
import { FolderOpen } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { cn } from "@/shared/lib/utils";

interface RestoreCloneFormProps {
  newName: string;
  onNewNameChange: (value: string) => void;
  installLocation: string;
  onInstallLocationChange: (value: string) => void;
  nameError: string | null;
}

const inputClass = "focus-ring w-full rounded-lg glass-input px-3 py-2 text-sm text-text";

export function RestoreCloneForm({
  newName,
  onNewNameChange,
  installLocation,
  onInstallLocationChange,
  nameError,
}: RestoreCloneFormProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <label className="text-subtext-1 mb-1 block text-sm font-medium">
          {t("snapshots.restore.newDistroName")}
        </label>
        <input
          type="text"
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          placeholder={t("snapshots.restore.newDistroNamePlaceholder")}
          maxLength={64}
          className={cn(inputClass, nameError && "border-red")}
          required
        />
        {nameError && <p className="text-red mt-1 text-xs">{nameError}</p>}
      </div>

      <div>
        <label className="text-subtext-1 mb-1 block text-sm font-medium">
          {t("snapshots.restore.installLocation")}
        </label>
        <div className="flex gap-1">
          <input
            type="text"
            value={installLocation}
            onChange={(e) => onInstallLocationChange(e.target.value)}
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
              if (dir) onInstallLocationChange(dir);
            }}
            className="border-surface-1 text-subtext-0 hover:text-text shrink-0 rounded-lg border px-2 hover:bg-white/8"
            aria-label={t("snapshots.restore.browseInstallLocation")}
          >
            <FolderOpen className="h-4 w-4" />
          </button>
        </div>
        <p className="text-overlay-0 mt-1 text-xs">{t("snapshots.restore.installLocationHint")}</p>
      </div>
    </>
  );
}
