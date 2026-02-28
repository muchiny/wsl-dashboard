import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { HardDrive, Zap, Loader2 } from "lucide-react";
import { Select } from "@/shared/ui/select";
import { useDistros } from "@/shared/api/distro-queries";
import { useCompactVhdx } from "../api/mutations";

export function VhdxCompactPanel() {
  const { t } = useTranslation();
  const { data: distros } = useDistros();
  const compactVhdx = useCompactVhdx();
  const [selectedDistro, setSelectedDistro] = useState("");

  const wsl2Distros = distros?.filter((d) => d.wsl_version === 2) ?? [];

  return (
    <div className="border-surface-1 bg-mantle rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <HardDrive className="text-teal h-5 w-5" />
        <h4 className="text-text font-semibold">{t("vhdxOptimization.title")}</h4>
      </div>

      <p className="text-subtext-0 mb-4 text-sm">{t("vhdxOptimization.description")}</p>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            {t("vhdxOptimization.distributionLabel")}
          </label>
          <Select
            value={selectedDistro}
            onChange={setSelectedDistro}
            options={wsl2Distros.map((d) => ({ value: d.name, label: `${d.name} (${d.state})` }))}
            placeholder={t("vhdxOptimization.selectDistro")}
          />
        </div>
        <button
          onClick={() => {
            if (selectedDistro) compactVhdx.mutate(selectedDistro);
          }}
          disabled={!selectedDistro || compactVhdx.isPending}
          className="bg-teal text-crust hover:bg-teal/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {compactVhdx.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {compactVhdx.isPending
            ? t("vhdxOptimization.optimizing")
            : t("vhdxOptimization.enableSparse")}
        </button>
      </div>

      <div className="border-surface-0 bg-base/50 text-subtext-0 mt-4 rounded-lg border p-3 text-xs">
        <Trans i18nKey="vhdxOptimization.note" components={{ strong: <strong /> }} />
      </div>
    </div>
  );
}
