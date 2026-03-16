import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { GpuPanel } from "./gpu-panel";
import type { GpuMetrics } from "@/shared/types/monitoring";

describe("GpuPanel", () => {
  it("returns null when gpu is undefined", () => {
    const { container } = renderWithProviders(<GpuPanel gpu={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders GPU title", () => {
    const gpu: GpuMetrics = {
      utilization_percent: 50,
      vram_used_bytes: 2_000_000_000,
      vram_total_bytes: 4_000_000_000,
    };
    renderWithProviders(<GpuPanel gpu={gpu} />);
    expect(screen.getByText("GPU")).toBeInTheDocument();
  });

  it("shows GPU utilization percentage", () => {
    const gpu: GpuMetrics = {
      utilization_percent: 73.5,
      vram_used_bytes: null,
      vram_total_bytes: null,
    };
    renderWithProviders(<GpuPanel gpu={gpu} />);
    expect(screen.getByText("73.5%")).toBeInTheDocument();
    expect(screen.getByText("GPU Utilization")).toBeInTheDocument();
  });

  it("shows VRAM usage when available", () => {
    const gpu: GpuMetrics = {
      utilization_percent: 50,
      vram_used_bytes: 2_147_483_648, // 2 GB
      vram_total_bytes: 4_294_967_296, // 4 GB
    };
    renderWithProviders(<GpuPanel gpu={gpu} />);
    expect(screen.getByText("VRAM")).toBeInTheDocument();
    expect(screen.getByText(/2\.00 GB/)).toBeInTheDocument();
    expect(screen.getByText(/4\.00 GB/)).toBeInTheDocument();
  });

  it("hides VRAM section when vram_total is 0", () => {
    const gpu: GpuMetrics = {
      utilization_percent: 50,
      vram_used_bytes: 0,
      vram_total_bytes: 0,
    };
    renderWithProviders(<GpuPanel gpu={gpu} />);
    expect(screen.queryByText("VRAM")).not.toBeInTheDocument();
  });

  it("hides VRAM section when vram fields are null", () => {
    const gpu: GpuMetrics = {
      utilization_percent: 50,
      vram_used_bytes: null,
      vram_total_bytes: null,
    };
    renderWithProviders(<GpuPanel gpu={gpu} />);
    expect(screen.queryByText("VRAM")).not.toBeInTheDocument();
  });

  it("applies green bar for low utilization", () => {
    const gpu: GpuMetrics = {
      utilization_percent: 30,
      vram_used_bytes: null,
      vram_total_bytes: null,
    };
    const { container } = renderWithProviders(<GpuPanel gpu={gpu} />);
    const bar = container.querySelector(".bg-green");
    expect(bar).toBeTruthy();
  });

  it("applies yellow bar for medium utilization (70-89%)", () => {
    const gpu: GpuMetrics = {
      utilization_percent: 80,
      vram_used_bytes: null,
      vram_total_bytes: null,
    };
    const { container } = renderWithProviders(<GpuPanel gpu={gpu} />);
    const bar = container.querySelector(".bg-yellow");
    expect(bar).toBeTruthy();
  });

  it("applies red bar for high utilization (90%+)", () => {
    const gpu: GpuMetrics = {
      utilization_percent: 95,
      vram_used_bytes: null,
      vram_total_bytes: null,
    };
    const { container } = renderWithProviders(<GpuPanel gpu={gpu} />);
    const bar = container.querySelector(".bg-red");
    expect(bar).toBeTruthy();
  });

  it("handles null utilization_percent", () => {
    const gpu: GpuMetrics = {
      utilization_percent: null,
      vram_used_bytes: null,
      vram_total_bytes: null,
    };
    renderWithProviders(<GpuPanel gpu={gpu} />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  it("clamps bar width to 100%", () => {
    const gpu: GpuMetrics = {
      utilization_percent: 150,
      vram_used_bytes: null,
      vram_total_bytes: null,
    };
    const { container } = renderWithProviders(<GpuPanel gpu={gpu} />);
    const bar = container.querySelector(".bg-red");
    expect(bar).toBeTruthy();
    expect(bar!.getAttribute("style")).toContain("width: 100%");
  });
});
