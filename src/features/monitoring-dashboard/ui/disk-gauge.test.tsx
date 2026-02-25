import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiskGauge } from "./disk-gauge";
import type { DiskMetrics } from "@/shared/types/monitoring";

function makeDisk(overrides: Partial<DiskMetrics> = {}): DiskMetrics {
  return {
    total_bytes: 100_000_000_000,
    used_bytes: 50_000_000_000,
    available_bytes: 50_000_000_000,
    usage_percent: 50.0,
    ...overrides,
  };
}

describe("DiskGauge", () => {
  it("shows 'No data available' when disk is null", () => {
    render(<DiskGauge disk={null} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("displays usage percentage", () => {
    render(<DiskGauge disk={makeDisk({ usage_percent: 65.3 })} />);
    expect(screen.getByText("65.3%")).toBeInTheDocument();
  });

  it("displays used, free, and total values", () => {
    render(<DiskGauge disk={makeDisk()} />);
    expect(screen.getByText(/Used:/)).toBeInTheDocument();
    expect(screen.getByText(/Free:/)).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
  });

  it("applies warning style when usage > 80%", () => {
    render(<DiskGauge disk={makeDisk({ usage_percent: 85.0 })} />);
    const percentText = screen.getByText("85.0%");
    expect(percentText.className).toContain("text-yellow");
  });

  it("applies critical/destructive style when usage > 90%", () => {
    render(<DiskGauge disk={makeDisk({ usage_percent: 95.0 })} />);
    const percentText = screen.getByText("95.0%");
    expect(percentText.className).toContain("text-red");
  });

  it("applies normal style when usage <= 80%", () => {
    render(<DiskGauge disk={makeDisk({ usage_percent: 50.0 })} />);
    const percentText = screen.getByText("50.0%");
    expect(percentText.className).toContain("text-subtext-0");
  });
});
