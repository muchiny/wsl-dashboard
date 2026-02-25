import { useDistros } from "../api/queries";
import { useStartDistro, useStopDistro, useRestartDistro } from "../api/mutations";
import { DistroCard } from "./distro-card";

export function DistroList() {
  const { data: distros, isLoading, error } = useDistros();
  const startDistro = useStartDistro();
  const stopDistro = useStopDistro();
  const restartDistro = useRestartDistro();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-border bg-card h-24 animate-pulse rounded-lg border" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
        Failed to load distributions: {error.message}
      </div>
    );
  }

  if (!distros?.length) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-lg border p-8 text-center">
        No WSL distributions found. Install one to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {distros.map((distro) => (
        <DistroCard
          key={distro.name}
          distro={distro}
          onStart={() => startDistro.mutate(distro.name)}
          onStop={() => stopDistro.mutate(distro.name)}
          onRestart={() => restartDistro.mutate(distro.name)}
        />
      ))}
    </div>
  );
}
