import { useState } from "react";
import { Settings, FileText, HardDrive, ScrollText } from "lucide-react";
import { WslConfigEditor } from "@/features/wsl-config/ui/wslconfig-editor";
import { VhdxCompactPanel } from "@/features/wsl-config/ui/vhdx-compact-panel";
import { AuditLogViewer } from "@/features/audit-log/ui/audit-log-viewer";
import { cn } from "@/shared/lib/utils";

type SettingsTab = "config" | "optimization" | "audit";

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("config");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-peach/15">
          <Settings className="h-5 w-5 text-peach" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text">Settings</h2>
          <p className="text-sm text-subtext-0">Configure WSL2, optimize disks, and view logs</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-surface-1 bg-mantle p-1">
        {(
          [
            { id: "config", label: "WSL Configuration", icon: FileText },
            { id: "optimization", label: "Optimization", icon: HardDrive },
            { id: "audit", label: "Audit Log", icon: ScrollText },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:gap-2 sm:px-4 sm:py-2.5",
              tab === item.id
                ? "bg-blue text-crust shadow-md"
                : "text-subtext-1 hover:bg-surface-0 hover:text-text",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "config" && <WslConfigEditor />}
      {tab === "optimization" && <VhdxCompactPanel />}
      {tab === "audit" && <AuditLogViewer />}
    </div>
  );
}
