import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Network, Plus, Trash2, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { Select } from "@/shared/ui/select";
import { ActionIconButton } from "@/shared/ui/action-icon-button";
import { useDistros } from "@/shared/api/distro-queries";
import { useListeningPorts, usePortForwardingRules } from "../api/queries";
import { useRemovePortForwarding } from "../api/mutations";
import { AddRuleDialog } from "./add-rule-dialog";

export function PortForwardingPanel() {
  const { t } = useTranslation();
  const { data: distros } = useDistros();
  const [selectedDistro, setSelectedDistro] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const runningDistros = distros?.filter((d) => d.state === "Running") ?? [];
  const { data: listeningPorts, isLoading: loadingPorts } = useListeningPorts(selectedDistro);
  const { data: rules, isLoading: loadingRules } = usePortForwardingRules(
    selectedDistro || undefined,
  );
  const removeRule = useRemovePortForwarding();

  return (
    <div className="space-y-5">
      {/* Distro selector */}
      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <div className="mb-4 flex items-center gap-2">
          <Network className="text-blue h-5 w-5" />
          <h4 className="text-text font-semibold">{t("portForwarding.title")}</h4>
        </div>

        <p className="text-subtext-0 mb-4 text-sm">
          <Trans
            i18nKey="portForwarding.description"
            components={{ code: <code className="bg-surface-0 rounded px-1 text-xs" /> }}
          />
        </p>

        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            {t("portForwarding.distribution")}
          </label>
          <Select
            value={selectedDistro}
            onChange={setSelectedDistro}
            options={runningDistros.map((d) => ({ value: d.name, label: d.name }))}
            placeholder={t("portForwarding.allDistributions")}
            className="max-w-xs"
          />
        </div>
      </div>

      {/* Active rules */}
      <div className="border-surface-1 bg-mantle rounded-xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-text font-semibold">{t("portForwarding.activeRules")}</h4>
          <button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue text-crust hover:bg-blue/90 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("portForwarding.addRule")}
          </button>
        </div>

        {loadingRules ? (
          <div className="text-subtext-0 flex items-center gap-2 py-4 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("portForwarding.loadingRules")}
          </div>
        ) : !rules?.length ? (
          <p className="text-subtext-0 py-4 text-center text-sm">{t("portForwarding.noRules")}</p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="border-surface-0 bg-base flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-text text-sm font-medium">{rule.distro_name}</span>
                  <span className="text-subtext-0 font-mono text-xs">:{rule.wsl_port}</span>
                  <ArrowRight className="text-overlay-0 h-3.5 w-3.5" />
                  <span className="text-blue font-mono text-xs">localhost:{rule.host_port}</span>
                  <span className="bg-surface-0 text-subtext-1 rounded px-1.5 py-0.5 text-[10px] uppercase">
                    {rule.protocol}
                  </span>
                </div>
                <ActionIconButton
                  icon={Trash2}
                  loading={removeRule.isPending && removeRule.variables === rule.id}
                  disabled={removeRule.isPending}
                  onClick={() => removeRule.mutate(rule.id)}
                  className="text-overlay-0 hover:text-red"
                  iconClassName="h-4 w-4"
                  title={t("portForwarding.removeRule")}
                />
              </div>
            ))}
          </div>
        )}

        <div className="border-surface-0 bg-base/50 mt-4 flex items-start gap-2 rounded-lg border p-3">
          <AlertTriangle className="text-yellow mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="text-subtext-0 text-xs">{t("portForwarding.adminWarning")}</p>
        </div>
      </div>

      {/* Listening ports */}
      {selectedDistro && (
        <div className="border-surface-1 bg-mantle rounded-xl border p-5">
          <h4 className="text-text mb-4 font-semibold">
            {t("portForwarding.listeningPorts", { name: selectedDistro })}
          </h4>

          {loadingPorts ? (
            <div className="text-subtext-0 flex items-center gap-2 py-4 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("portForwarding.scanningPorts")}
            </div>
          ) : !listeningPorts?.length ? (
            <p className="text-subtext-0 py-4 text-center text-sm">
              {t("portForwarding.noListeningPorts", { name: selectedDistro })}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-subtext-0 border-surface-0 border-b text-left text-xs">
                    <th className="pr-4 pb-2 font-medium">{t("portForwarding.port")}</th>
                    <th className="pr-4 pb-2 font-medium">{t("portForwarding.protocol")}</th>
                    <th className="pr-4 pb-2 font-medium">{t("portForwarding.process")}</th>
                    <th className="pb-2 font-medium">{t("monitoring.pid")}</th>
                  </tr>
                </thead>
                <tbody>
                  {listeningPorts.map((port) => (
                    <tr key={port.port} className="border-surface-0 border-b last:border-0">
                      <td className="text-blue py-2 pr-4 font-mono">{port.port}</td>
                      <td className="text-subtext-0 py-2 pr-4 uppercase">{port.protocol}</td>
                      <td className="text-text py-2 pr-4">{port.process || "-"}</td>
                      <td className="text-subtext-0 py-2 font-mono">{port.pid ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AddRuleDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        defaultDistro={selectedDistro}
      />
    </div>
  );
}
