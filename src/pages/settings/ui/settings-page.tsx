import { useState } from "react";
import { Settings, FileText, HardDrive, ScrollText } from "lucide-react";
import { WslConfigEditor } from "@/features/wsl-config/ui/wslconfig-editor";
import { VhdxCompactPanel } from "@/features/wsl-config/ui/vhdx-compact-panel";
import { AuditLogViewer } from "@/features/audit-log/ui/audit-log-viewer";

type SettingsTab = "config" | "optimization" | "audit";

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("config");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="text-primary h-6 w-6" />
          <h2 className="text-2xl font-bold">Settings</h2>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure WSL2, optimize disks, and view the audit log.
        </p>
      </div>

      <div className="border-border bg-card flex gap-1 rounded-lg border p-1">
        <button
          onClick={() => setTab("config")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "config" ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <FileText className="h-4 w-4" />
          WSL Configuration
        </button>
        <button
          onClick={() => setTab("optimization")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "optimization"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <HardDrive className="h-4 w-4" />
          Optimization
        </button>
        <button
          onClick={() => setTab("audit")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "audit" ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <ScrollText className="h-4 w-4" />
          Audit Log
        </button>
      </div>

      {tab === "config" && <WslConfigEditor />}
      {tab === "optimization" && <VhdxCompactPanel />}
      {tab === "audit" && <AuditLogViewer />}
    </div>
  );
}
