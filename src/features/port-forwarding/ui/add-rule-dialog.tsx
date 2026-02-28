import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Plus, X, Loader2 } from "lucide-react";
import { Select } from "@/shared/ui/select";
import { DialogShell } from "@/shared/ui/dialog-shell";
import { useDistros } from "@/shared/api/distro-queries";
import { useAddPortForwarding } from "../api/mutations";

interface AddRuleDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDistro?: string;
}

export function AddRuleDialog({ open, onClose, defaultDistro }: AddRuleDialogProps) {
  const { t } = useTranslation();
  const { data: distros } = useDistros();
  const addRule = useAddPortForwarding();

  const [distroName, setDistroName] = useState(defaultDistro ?? "");
  const [wslPort, setWslPort] = useState("");
  const [hostPort, setHostPort] = useState("");

  const runningDistros = distros?.filter((d) => d.state === "Running") ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const wsl = parseInt(wslPort, 10);
    const host = parseInt(hostPort, 10);
    if (!distroName || isNaN(wsl) || isNaN(host)) return;

    addRule.mutate(
      { distroName, wslPort: wsl, hostPort: host },
      {
        onSuccess: () => {
          setWslPort("");
          setHostPort("");
          onClose();
        },
      },
    );
  }

  return (
    <DialogShell open={open} onClose={onClose} ariaLabelledby="add-rule-title" maxWidth="max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h3 id="add-rule-title" className="text-text text-lg font-semibold">
          {t("portForwarding.add.title")}
        </h3>
        <button
          onClick={onClose}
          className="text-subtext-0 hover:text-text transition-colors"
          aria-label={t("portForwarding.add.closeDialog")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-subtext-0 mb-1 block text-xs font-medium">
            {t("portForwarding.add.distribution")}
          </label>
          <Select
            value={distroName}
            onChange={setDistroName}
            options={runningDistros.map((d) => ({ value: d.name, label: d.name }))}
            placeholder={t("portForwarding.add.selectDistro")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              {t("portForwarding.add.wslPort")}
            </label>
            <input
              type="number"
              min={1}
              max={65535}
              value={wslPort}
              onChange={(e) => setWslPort(e.target.value)}
              placeholder={t("portForwarding.add.portPlaceholder")}
              className="focus-ring border-surface-1 bg-mantle text-text placeholder:text-overlay-0 w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-subtext-0 mb-1 block text-xs font-medium">
              {t("portForwarding.add.hostPort")}
            </label>
            <input
              type="number"
              min={1}
              max={65535}
              value={hostPort}
              onChange={(e) => setHostPort(e.target.value)}
              placeholder={t("portForwarding.add.portPlaceholder")}
              className="focus-ring border-surface-1 bg-mantle text-text placeholder:text-overlay-0 w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
          </div>
        </div>

        <div className="border-surface-0 bg-mantle/50 text-subtext-0 rounded-lg border p-3 text-xs">
          <Trans
            i18nKey="portForwarding.add.description"
            values={{
              hostPort: hostPort || "?",
              distroName: distroName || "distro",
              wslPort: wslPort || "?",
            }}
            components={{ strong: <strong /> }}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring text-subtext-0 hover:text-text rounded-lg px-4 py-2 text-sm transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={addRule.isPending}
            className="focus-ring bg-blue text-crust hover:bg-blue/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {addRule.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {addRule.isPending ? t("portForwarding.add.adding") : t("portForwarding.add.submit")}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}
