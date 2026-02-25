import { useDistros } from "../api/queries";
import { useStartDistro, useStopDistro, useRestartDistro } from "../api/mutations";
import { DistroCard } from "./distro-card";

interface DistroListProps {
  onSnapshot: (distroName: string) => void;
}

export function DistroList({ onSnapshot }: DistroListProps) {
  const { data: distros, isLoading, error } = useDistros();
  const startDistro = useStartDistro();
  const stopDistro = useStopDistro();
  const restartDistro = useRestartDistro();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-surface-1 bg-mantle h-36 animate-pulse rounded-xl border"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-red/30 bg-red/10 text-red rounded-xl border p-4">
        Failed to load distributions: {error.message}
      </div>
    );
  }

  if (!distros?.length) {
    return (
      <div className="border-surface-1 bg-mantle text-subtext-0 rounded-xl border p-8 text-center">
        No WSL distributions found. Install one to get started.
      </div>
    );
  }

  const pendingAction =
    (startDistro.isPending && startDistro.variables) ||
    (stopDistro.isPending && stopDistro.variables) ||
    (restartDistro.isPending && restartDistro.variables)
      ? {
          distro:
            (startDistro.isPending && startDistro.variables) ||
            (stopDistro.isPending && stopDistro.variables) ||
            (restartDistro.isPending && restartDistro.variables) ||
            "",
          action: startDistro.isPending
            ? "Starting"
            : stopDistro.isPending
              ? "Stopping"
              : "Restarting",
        }
      : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {distros.map((distro) => (
        <DistroCard
          key={distro.name}
          distro={distro}
          onStart={() => startDistro.mutate(distro.name)}
          onStop={() => stopDistro.mutate(distro.name)}
          onRestart={() => restartDistro.mutate(distro.name)}
          onSnapshot={() => onSnapshot(distro.name)}
          pendingAction={pendingAction?.distro === distro.name ? pendingAction.action : undefined}
        />
      ))}
    </div>
  );
}
