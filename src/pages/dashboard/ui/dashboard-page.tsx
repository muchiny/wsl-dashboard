import { DistroList } from "@/features/distro-list/ui/distro-list";
import { useDistroEvents } from "@/features/distro-events/hooks/use-distro-events";
import { useDistros } from "@/features/distro-list/api/queries";

export function DashboardPage() {
  useDistroEvents();
  const { data: distros } = useDistros();

  const running = distros?.filter((d) => d.state === "Running").length ?? 0;
  const total = distros?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground text-sm">
          {total} distribution{total !== 1 ? "s" : ""} detected, {running} running
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Total Distros</p>
          <p className="text-3xl font-bold">{total}</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Running</p>
          <p className="text-success text-3xl font-bold">{running}</p>
        </div>
        <div className="border-border bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">Stopped</p>
          <p className="text-muted-foreground text-3xl font-bold">{total - running}</p>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Distributions</h3>
        <DistroList />
      </div>
    </div>
  );
}
