import { CheckCircle2, XCircle } from "lucide-react";
import type { IacToolset } from "../api/queries";

interface ToolsetPanelProps {
  toolset: IacToolset | undefined;
  isLoading: boolean;
}

const tools = [
  { key: "ansible_version" as const, name: "Ansible", icon: "A" },
  { key: "kubectl_version" as const, name: "kubectl", icon: "K" },
  { key: "terraform_version" as const, name: "Terraform", icon: "T" },
  { key: "helm_version" as const, name: "Helm", icon: "H" },
] as const;

export function ToolsetPanel({ toolset, isLoading }: ToolsetPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-border bg-card h-24 animate-pulse rounded-lg border" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tools.map((tool) => {
        const version = toolset?.[tool.key];
        const installed = !!version;
        return (
          <div key={tool.key} className="border-border bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded text-sm font-bold">
                {tool.icon}
              </div>
              {installed ? (
                <CheckCircle2 className="text-success h-5 w-5" />
              ) : (
                <XCircle className="text-muted-foreground h-5 w-5" />
              )}
            </div>
            <p className="mt-2 font-medium">{tool.name}</p>
            <p className="text-muted-foreground truncate text-xs">{version ?? "Not installed"}</p>
          </div>
        );
      })}
    </div>
  );
}
