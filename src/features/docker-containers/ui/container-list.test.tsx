import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContainerList } from "./container-list";
import type { Container } from "@/shared/types/docker";

function makeContainer(overrides: Partial<Container> = {}): Container {
  return {
    id: "abc123",
    name: "my-app",
    image: "node:20",
    state: "Running",
    status: "Up 2 hours",
    ports: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const noop = () => {};

describe("ContainerList", () => {
  it("shows empty state when no containers", () => {
    render(<ContainerList containers={[]} distroName="Ubuntu" onStart={noop} onStop={noop} />);
    expect(screen.getByText("No containers found.")).toBeInTheDocument();
  });

  it("displays container names", () => {
    const containers = [
      makeContainer({ id: "1", name: "web-server" }),
      makeContainer({ id: "2", name: "db-postgres" }),
    ];
    render(
      <ContainerList containers={containers} distroName="Ubuntu" onStart={noop} onStop={noop} />,
    );
    expect(screen.getByText("web-server")).toBeInTheDocument();
    expect(screen.getByText("db-postgres")).toBeInTheDocument();
  });

  it("displays container image and status", () => {
    render(
      <ContainerList
        containers={[makeContainer({ image: "postgres:16", status: "Up 5 minutes" })]}
        distroName="Ubuntu"
        onStart={noop}
        onStop={noop}
      />,
    );
    expect(screen.getByText("postgres:16")).toBeInTheDocument();
    expect(screen.getByText("Up 5 minutes")).toBeInTheDocument();
  });

  it("shows Running state badge", () => {
    render(
      <ContainerList
        containers={[makeContainer({ state: "Running" })]}
        distroName="Ubuntu"
        onStart={noop}
        onStop={noop}
      />,
    );
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("shows Exited state badge", () => {
    render(
      <ContainerList
        containers={[makeContainer({ state: "Exited" })]}
        distroName="Ubuntu"
        onStart={noop}
        onStop={noop}
      />,
    );
    expect(screen.getByText("Exited")).toBeInTheDocument();
  });

  it("shows Stop button when running", () => {
    render(
      <ContainerList
        containers={[makeContainer({ state: "Running" })]}
        distroName="Ubuntu"
        onStart={noop}
        onStop={noop}
      />,
    );
    expect(screen.getByTitle("Stop container")).toBeInTheDocument();
    expect(screen.queryByTitle("Start container")).not.toBeInTheDocument();
  });

  it("shows Start button when not running", () => {
    render(
      <ContainerList
        containers={[makeContainer({ state: "Exited" })]}
        distroName="Ubuntu"
        onStart={noop}
        onStop={noop}
      />,
    );
    expect(screen.getByTitle("Start container")).toBeInTheDocument();
    expect(screen.queryByTitle("Stop container")).not.toBeInTheDocument();
  });

  it("calls onStart with container id", () => {
    const onStart = vi.fn();
    render(
      <ContainerList
        containers={[makeContainer({ id: "xyz", state: "Exited" })]}
        distroName="Ubuntu"
        onStart={onStart}
        onStop={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Start container"));
    expect(onStart).toHaveBeenCalledWith("xyz");
  });

  it("calls onStop with container id", () => {
    const onStop = vi.fn();
    render(
      <ContainerList
        containers={[makeContainer({ id: "xyz", state: "Running" })]}
        distroName="Ubuntu"
        onStart={noop}
        onStop={onStop}
      />,
    );
    fireEvent.click(screen.getByTitle("Stop container"));
    expect(onStop).toHaveBeenCalledWith("xyz");
  });

  it("displays port mappings", () => {
    render(
      <ContainerList
        containers={[
          makeContainer({
            ports: [
              { host_port: 8080, container_port: 80, protocol: "tcp" },
              { host_port: null, container_port: 443, protocol: "tcp" },
            ],
          }),
        ]}
        distroName="Ubuntu"
        onStart={noop}
        onStop={noop}
      />,
    );
    expect(screen.getByText("8080:80, 443")).toBeInTheDocument();
  });
});
