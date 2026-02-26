import { useState } from "react";
import {
  Settings,
  FileText,
  HardDrive,
  ScrollText,
  SlidersHorizontal,
  Network,
} from "lucide-react";
import { WslConfigEditor } from "@/features/wsl-config/ui/wslconfig-editor";
import { WslInfoPanel } from "@/features/wsl-config/ui/wsl-info-panel";
import { VhdxCompactPanel } from "@/features/wsl-config/ui/vhdx-compact-panel";
import { AuditLogViewer } from "@/features/audit-log/ui/audit-log-viewer";
import { PreferencesPanel } from "@/features/app-preferences/ui/preferences-panel";
import { PortForwardingPanel } from "@/features/port-forwarding/ui/port-forwarding-panel";
import { cn } from "@/shared/lib/utils";

const tabs = [
  { id: "config", label: "WSL Configuration", icon: FileText },
  { id: "network", label: "Network", icon: Network },
  { id: "optimization", label: "Optimization", icon: HardDrive },
  { id: "audit", label: "Audit Log", icon: ScrollText },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
] as const;

type SettingsTab = (typeof tabs)[number]["id"];

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>("config");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-peach/15 flex h-9 w-9 items-center justify-center rounded-lg">
          <Settings className="text-peach h-5 w-5" />
        </div>
        <div>
          <h2 className="text-text text-xl font-bold">Settings</h2>
          <p className="text-subtext-0 text-sm">Configure WSL2, optimize disks, and view logs</p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Settings sections"
        className="border-surface-1 bg-mantle flex flex-wrap gap-1 rounded-xl border p-1"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`tabpanel-${item.id}`}
            id={`tab-${item.id}`}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:gap-2 sm:px-4 sm:py-2.5",
              tab === item.id
                ? "bg-blue text-crust shadow-md"
                : "text-subtext-1 hover:bg-surface-0 hover:text-text",
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "config" && (
        <div
          role="tabpanel"
          id="tabpanel-config"
          aria-labelledby="tab-config"
          className="space-y-6"
        >
          <WslInfoPanel />
          <WslConfigEditor />
        </div>
      )}
      {tab === "network" && (
        <div role="tabpanel" id="tabpanel-network" aria-labelledby="tab-network">
          <PortForwardingPanel />
        </div>
      )}
      {tab === "optimization" && (
        <div role="tabpanel" id="tabpanel-optimization" aria-labelledby="tab-optimization">
          <VhdxCompactPanel />
        </div>
      )}
      {tab === "audit" && (
        <div role="tabpanel" id="tabpanel-audit" aria-labelledby="tab-audit">
          <AuditLogViewer />
        </div>
      )}
      {tab === "preferences" && (
        <div role="tabpanel" id="tabpanel-preferences" aria-labelledby="tab-preferences">
          <PreferencesPanel />
        </div>
      )}
    </div>
  );
}
