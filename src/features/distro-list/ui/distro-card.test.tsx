import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DistroCard } from "./distro-card";
import type { Distro } from "@/shared/types/distro";

function makeDistro(overrides: Partial<Distro> = {}): Distro {
  return {
    name: "Ubuntu",
    state: "Running",
    wsl_version: 2,
    is_default: false,
    base_path: null,
    vhdx_size_bytes: null,
    last_seen: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const noop = () => {};

describe("DistroCard", () => {
  it("displays the distro name", () => {
    render(
      <DistroCard
        distro={makeDistro({ name: "Debian" })}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
      />,
    );
    expect(screen.getByText("Debian")).toBeInTheDocument();
  });

  it("shows Running badge when running", () => {
    render(
      <DistroCard
        distro={makeDistro({ state: "Running" })}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
      />,
    );
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("shows Stopped badge when stopped", () => {
    render(
      <DistroCard
        distro={makeDistro({ state: "Stopped" })}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
      />,
    );
    expect(screen.getByText("Stopped")).toBeInTheDocument();
  });

  it("shows WSL version", () => {
    render(
      <DistroCard
        distro={makeDistro({ wsl_version: 2 })}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
      />,
    );
    expect(screen.getByText("WSL 2")).toBeInTheDocument();
  });

  it("shows Start button when stopped", () => {
    render(
      <DistroCard
        distro={makeDistro({ state: "Stopped" })}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
      />,
    );
    expect(screen.getByTitle("Start")).toBeInTheDocument();
    expect(screen.queryByTitle("Stop")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Restart")).not.toBeInTheDocument();
  });

  it("shows Stop and Restart buttons when running", () => {
    render(
      <DistroCard
        distro={makeDistro({ state: "Running" })}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
      />,
    );
    expect(screen.getByTitle("Stop")).toBeInTheDocument();
    expect(screen.getByTitle("Restart")).toBeInTheDocument();
    expect(screen.queryByTitle("Start")).not.toBeInTheDocument();
  });

  it("calls onStart when Start button is clicked", () => {
    const onStart = vi.fn();
    render(
      <DistroCard
        distro={makeDistro({ state: "Stopped" })}
        onStart={onStart}
        onStop={noop}
        onRestart={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Start"));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("calls onStop when Stop button is clicked", () => {
    const onStop = vi.fn();
    render(
      <DistroCard
        distro={makeDistro({ state: "Running" })}
        onStart={noop}
        onStop={onStop}
        onRestart={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Stop"));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("calls onRestart when Restart button is clicked", () => {
    const onRestart = vi.fn();
    render(
      <DistroCard
        distro={makeDistro({ state: "Running" })}
        onStart={noop}
        onStop={noop}
        onRestart={onRestart}
      />,
    );
    fireEvent.click(screen.getByTitle("Restart"));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it("shows star icon when is_default is true", () => {
    const { container } = render(
      <DistroCard
        distro={makeDistro({ is_default: true })}
        onStart={noop}
        onStop={noop}
        onRestart={noop}
      />,
    );
    // Star icon from lucide-react renders as an SVG with class fill-warning
    const starSvg = container.querySelector(".fill-warning");
    expect(starSvg).toBeTruthy();
  });
});
