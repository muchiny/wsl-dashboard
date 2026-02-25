import { Info } from "lucide-react";
import { useWslVersion } from "../api/queries";

export function WslInfoPanel() {
  const { data: version, isLoading, isError, error } = useWslVersion();

  if (isLoading) {
    return <div className="border-surface-1 bg-mantle h-40 animate-pulse rounded-xl border" />;
  }

  const items = [
    { label: "WSL Version", value: version?.wsl_version },
    { label: "Kernel Version", value: version?.kernel_version },
    { label: "WSLg Version", value: version?.wslg_version },
    { label: "Windows Version", value: version?.windows_version },
  ];

  return (
    <div className="border-surface-1 bg-mantle rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-2">
        <Info className="text-sapphire h-5 w-5" />
        <h4 className="text-text font-semibold">WSL System Information</h4>
      </div>

      {isError && (
        <p className="text-red text-sm">
          {error instanceof Error ? error.message : "Failed to retrieve WSL version"}
        </p>
      )}

      {!isError && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map(({ label, value }) => (
            <div key={label} className="bg-base border-surface-0 rounded-lg border p-3">
              <p className="text-subtext-0 text-xs font-medium">{label}</p>
              <p className="text-text mt-1 font-mono text-sm">{value ?? "N/A"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
