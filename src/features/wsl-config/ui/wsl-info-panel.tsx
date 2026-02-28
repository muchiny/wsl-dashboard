import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { useWslVersion } from "../api/queries";

export function WslInfoPanel() {
  const { t } = useTranslation();
  const { data: version, isLoading, isError, error } = useWslVersion();

  if (isLoading) {
    return <div className="border-surface-1 bg-mantle h-40 animate-pulse rounded-xl border" />;
  }

  const items = [
    { key: "wslInfo.wslVersion", value: version?.wsl_version },
    { key: "wslInfo.kernelVersion", value: version?.kernel_version },
    { key: "wslInfo.wslgVersion", value: version?.wslg_version },
    { key: "wslInfo.windowsVersion", value: version?.windows_version },
  ];

  return (
    <div className="border-surface-1 bg-mantle rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <Info className="text-sapphire h-5 w-5" />
        <h4 className="text-text font-semibold">{t("wslInfo.title")}</h4>
      </div>

      {isError && (
        <p className="text-red text-sm">
          {error instanceof Error ? error.message : t("wslInfo.failedToRetrieve")}
        </p>
      )}

      {!isError && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map(({ key, value }) => (
            <div key={key} className="bg-base border-surface-0 rounded-lg border p-3">
              <p className="text-subtext-0 text-xs font-medium">{t(key)}</p>
              <p className="text-text mt-1 font-mono text-sm">{value ?? t("common.na")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
