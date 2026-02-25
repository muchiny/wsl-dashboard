import { DistroList } from "@/features/distro-list/ui/distro-list";
import { useDistroEvents } from "@/features/distro-events/hooks/use-distro-events";
import { useShutdownAll } from "@/features/distro-list/api/mutations";

export function DistrosPage() {
  useDistroEvents();
  const shutdownAll = useShutdownAll();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Distributions</h2>
          <p className="text-muted-foreground text-sm">Manage your WSL distributions</p>
        </div>
        <button
          onClick={() => shutdownAll.mutate()}
          disabled={shutdownAll.isPending}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {shutdownAll.isPending ? "Shutting down..." : "Shutdown All WSL"}
        </button>
      </div>

      <DistroList />
    </div>
  );
}
