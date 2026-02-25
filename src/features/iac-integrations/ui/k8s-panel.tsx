import { Server, Globe } from "lucide-react";
import type { KubernetesCluster } from "../api/queries";
import { cn } from "@/shared/lib/utils";

interface K8sPanelProps {
  cluster: KubernetesCluster | undefined;
  isLoading: boolean;
}

export function K8sPanel({ cluster, isLoading }: K8sPanelProps) {
  if (isLoading) {
    return <div className="border-border bg-card h-48 animate-pulse rounded-lg border" />;
  }

  if (!cluster || !cluster.context) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-lg border p-6 text-center">
        No Kubernetes cluster configured or kubectl not available.
      </div>
    );
  }

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2">
        <Globe className="text-primary h-5 w-5" />
        <h4 className="font-semibold">Kubernetes Cluster</h4>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-muted-foreground text-xs">Context</p>
          <p className="truncate font-mono text-sm">{cluster.context}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Server</p>
          <p className="truncate font-mono text-sm">{cluster.server || "N/A"}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Total Pods</p>
          <p className="text-lg font-bold">{cluster.pod_count}</p>
        </div>
      </div>

      {cluster.nodes.length > 0 && (
        <div>
          <h5 className="text-muted-foreground mb-2 text-sm font-medium">Nodes</h5>
          <div className="space-y-2">
            {cluster.nodes.map((node) => (
              <div
                key={node.name}
                className="border-border flex items-center justify-between rounded border p-2"
              >
                <div className="flex items-center gap-2">
                  <Server className="text-muted-foreground h-4 w-4" />
                  <span className="font-mono text-sm">{node.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{node.roles.join(", ")}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      node.status === "Ready"
                        ? "bg-success/20 text-success"
                        : "bg-warning/20 text-warning",
                    )}
                  >
                    {node.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
