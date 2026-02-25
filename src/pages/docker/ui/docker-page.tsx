import { useState, useEffect, useMemo } from "react";
import { Container as ContainerIcon, Box, Layers } from "lucide-react";
import { useDistros } from "@/features/distro-list/api/queries";
import { useDockerStatus } from "@/features/docker-containers/api/queries";
import { useStartContainer, useStopContainer } from "@/features/docker-containers/api/mutations";
import { ContainerList } from "@/features/docker-containers/ui/container-list";
import { ImageList } from "@/features/docker-containers/ui/image-list";

export function DockerPage() {
  const { data: distros } = useDistros();
  const runningDistros = useMemo(
    () => distros?.filter((d) => d.state === "Running") ?? [],
    [distros],
  );
  const [selectedDistro, setSelectedDistro] = useState("");
  const [tab, setTab] = useState<"containers" | "images">("containers");

  const { data: dockerStatus, isLoading } = useDockerStatus(selectedDistro || null);
  const startContainer = useStartContainer();
  const stopContainer = useStopContainer();

  useEffect(() => {
    if (!selectedDistro && runningDistros.length > 0) {
      const first = runningDistros[0];
      if (first) setSelectedDistro(first.name);
    }
  }, [runningDistros, selectedDistro]);

  const runningContainers =
    dockerStatus?.containers.filter((c) => c.state === "Running").length ?? 0;
  const totalContainers = dockerStatus?.containers.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ContainerIcon className="text-primary h-6 w-6" />
            <h2 className="text-2xl font-bold">Docker</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage Docker containers and images inside WSL distros.
          </p>
        </div>
        <select
          value={selectedDistro}
          onChange={(e) => setSelectedDistro(e.target.value)}
          className="border-border bg-background focus:border-primary rounded-md border px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">Select a distro...</option>
          {runningDistros.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedDistro && (
        <div className="border-border bg-card text-muted-foreground rounded-lg border p-8 text-center">
          {runningDistros.length === 0
            ? "No running distributions. Start a distro first."
            : "Select a distribution to manage Docker."}
        </div>
      )}

      {selectedDistro && isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-border bg-card h-16 animate-pulse rounded-lg border" />
          ))}
        </div>
      )}

      {selectedDistro && dockerStatus && !dockerStatus.available && (
        <div className="border-warning/50 bg-warning/10 rounded-lg border p-6 text-center">
          <ContainerIcon className="text-warning mx-auto mb-2 h-8 w-8" />
          <p className="text-warning font-medium">Docker Not Available</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Docker is not installed or not running in {selectedDistro}.
          </p>
        </div>
      )}

      {selectedDistro && dockerStatus?.available && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="border-border bg-card rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Containers</p>
              <p className="text-3xl font-bold">{totalContainers}</p>
            </div>
            <div className="border-border bg-card rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Running</p>
              <p className="text-success text-3xl font-bold">{runningContainers}</p>
            </div>
            <div className="border-border bg-card rounded-lg border p-4">
              <p className="text-muted-foreground text-sm">Images</p>
              <p className="text-3xl font-bold">{dockerStatus.images.length}</p>
            </div>
          </div>

          <div className="border-border bg-card flex gap-1 rounded-lg border p-1">
            <button
              onClick={() => setTab("containers")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "containers"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Box className="h-4 w-4" />
              Containers ({totalContainers})
            </button>
            <button
              onClick={() => setTab("images")}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "images" ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Layers className="h-4 w-4" />
              Images ({dockerStatus.images.length})
            </button>
          </div>

          {tab === "containers" && (
            <ContainerList
              containers={dockerStatus.containers}
              distroName={selectedDistro}
              onStart={(id) =>
                startContainer.mutate({
                  distroName: selectedDistro,
                  containerId: id,
                })
              }
              onStop={(id) =>
                stopContainer.mutate({
                  distroName: selectedDistro,
                  containerId: id,
                })
              }
            />
          )}

          {tab === "images" && <ImageList images={dockerStatus.images} />}
        </>
      )}
    </div>
  );
}
