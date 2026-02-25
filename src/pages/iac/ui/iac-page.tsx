import { useState, useEffect, useMemo } from "react";
import { Wrench } from "lucide-react";
import { useDistros } from "@/features/distro-list/api/queries";
import { useIacTools, useK8sInfo } from "@/features/iac-integrations/api/queries";
import { ToolsetPanel } from "@/features/iac-integrations/ui/toolset-panel";
import { K8sPanel } from "@/features/iac-integrations/ui/k8s-panel";

export function IacPage() {
  const { data: distros } = useDistros();
  const runningDistros = useMemo(
    () => distros?.filter((d) => d.state === "Running") ?? [],
    [distros],
  );
  const [selectedDistro, setSelectedDistro] = useState("");

  const { data: toolset, isLoading: toolsLoading } = useIacTools(selectedDistro || null);
  const hasKubectl = !!toolset?.kubectl_version;
  const { data: k8sInfo, isLoading: k8sLoading } = useK8sInfo(selectedDistro || null, hasKubectl);

  useEffect(() => {
    if (!selectedDistro && runningDistros.length > 0) {
      const first = runningDistros[0];
      if (first) setSelectedDistro(first.name);
    }
  }, [runningDistros, selectedDistro]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="text-primary h-6 w-6" />
            <h2 className="text-2xl font-bold">IaC Integrations</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Detect and manage Infrastructure as Code tools in your distributions.
          </p>
        </div>
        <select
          value={selectedDistro}
          onChange={(e) => setSelectedDistro(e.target.value)}
          className="border-border bg-background focus:border-primary rounded-md border px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Select a distro...</option>
          {runningDistros.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedDistro && (
        <div className="border-border bg-card text-muted-foreground rounded-lg border p-8 text-center">
          {runningDistros.length === 0
            ? "No running distributions. Start a distro first."
            : "Select a distribution to detect IaC tools."}
        </div>
      )}

      {selectedDistro && (
        <>
          <div>
            <h3 className="mb-3 text-lg font-semibold">Detected Tools</h3>
            <ToolsetPanel toolset={toolset} isLoading={toolsLoading} />
          </div>

          {hasKubectl && (
            <div>
              <h3 className="mb-3 text-lg font-semibold">Kubernetes</h3>
              <K8sPanel cluster={k8sInfo} isLoading={k8sLoading} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
