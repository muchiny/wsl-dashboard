import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProcessTable } from "./process-table";
import type { ProcessInfo } from "../api/queries";

function makeProcess(overrides: Partial<ProcessInfo> = {}): ProcessInfo {
  return {
    pid: 1,
    user: "root",
    cpu_percent: 10.0,
    mem_percent: 5.0,
    vsz_bytes: 100000,
    rss_bytes: 50000,
    command: "/usr/bin/node",
    state: "S",
    ...overrides,
  };
}

describe("ProcessTable", () => {
  it("renders the correct number of processes", () => {
    const processes = [makeProcess({ pid: 1 }), makeProcess({ pid: 2 }), makeProcess({ pid: 3 })];
    render(<ProcessTable processes={processes} />);
    expect(screen.getByText("Processes (3)")).toBeInTheDocument();
  });

  it("displays process details in the table", () => {
    const p = makeProcess({
      pid: 42,
      user: "alice",
      cpu_percent: 15.3,
      mem_percent: 8.7,
      command: "/usr/bin/python",
      state: "R",
    });
    render(<ProcessTable processes={[p]} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("15.3")).toBeInTheDocument();
    expect(screen.getByText("8.7")).toBeInTheDocument();
    expect(screen.getByText("/usr/bin/python")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("filters processes by command (case-insensitive)", () => {
    const processes = [
      makeProcess({ pid: 1, command: "node server.js" }),
      makeProcess({ pid: 2, command: "python app.py" }),
      makeProcess({ pid: 3, command: "Node worker.js" }),
    ];
    render(<ProcessTable processes={processes} />);
    const input = screen.getByPlaceholderText("Filter processes...");
    fireEvent.change(input, { target: { value: "node" } });

    expect(screen.getByText("node server.js")).toBeInTheDocument();
    expect(screen.getByText("Node worker.js")).toBeInTheDocument();
    expect(screen.queryByText("python app.py")).not.toBeInTheDocument();
  });

  it("filters processes by user", () => {
    const processes = [
      makeProcess({ pid: 1, user: "root", command: "cmd1" }),
      makeProcess({ pid: 2, user: "alice", command: "cmd2" }),
    ];
    render(<ProcessTable processes={processes} />);
    const input = screen.getByPlaceholderText("Filter processes...");
    fireEvent.change(input, { target: { value: "alice" } });

    expect(screen.getByText("cmd2")).toBeInTheDocument();
    expect(screen.queryByText("cmd1")).not.toBeInTheDocument();
  });

  it("sorts by CPU% descending by default", () => {
    const processes = [
      makeProcess({ pid: 1, cpu_percent: 5.0, command: "low-cpu" }),
      makeProcess({ pid: 2, cpu_percent: 50.0, command: "high-cpu" }),
      makeProcess({ pid: 3, cpu_percent: 25.0, command: "mid-cpu" }),
    ];
    render(<ProcessTable processes={processes} />);
    const rows = screen.getAllByRole("row");
    // header + 3 data rows; first data row should be highest CPU
    expect(rows[1]!.textContent).toContain("high-cpu");
    expect(rows[2]!.textContent).toContain("mid-cpu");
    expect(rows[3]!.textContent).toContain("low-cpu");
  });

  it("toggles sort direction when clicking same column", () => {
    const processes = [
      makeProcess({ pid: 1, cpu_percent: 5.0, command: "low" }),
      makeProcess({ pid: 2, cpu_percent: 50.0, command: "high" }),
    ];
    render(<ProcessTable processes={processes} />);

    // Click CPU% to toggle to ascending
    const cpuButton = screen.getByText("CPU%");
    fireEvent.click(cpuButton);

    const rows = screen.getAllByRole("row");
    expect(rows[1]!.textContent).toContain("low");
    expect(rows[2]!.textContent).toContain("high");
  });

  it("switches sort key when clicking a different column", () => {
    const processes = [
      makeProcess({ pid: 100, cpu_percent: 5.0, command: "a" }),
      makeProcess({ pid: 1, cpu_percent: 50.0, command: "b" }),
    ];
    render(<ProcessTable processes={processes} />);

    // Click PID column
    const pidButton = screen.getByText("PID");
    fireEvent.click(pidButton);

    const rows = screen.getAllByRole("row");
    // Descending by PID: 100 first
    expect(rows[1]!.textContent).toContain("100");
    expect(rows[2]!.textContent).toContain("1");
  });

  it("limits display to 100 rows", () => {
    const processes = Array.from({ length: 120 }, (_, i) =>
      makeProcess({ pid: i + 1, command: `cmd-${i + 1}` }),
    );
    render(<ProcessTable processes={processes} />);
    // header + 100 data rows = 101
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(101);
  });

  it("renders empty table when no processes", () => {
    render(<ProcessTable processes={[]} />);
    expect(screen.getByText("Processes (0)")).toBeInTheDocument();
    // Only header row
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(1);
  });

  it("formats RSS bytes with formatBytes", () => {
    const p = makeProcess({ pid: 1, rss_bytes: 1073741824 }); // 1 GB
    render(<ProcessTable processes={[p]} />);
    expect(screen.getByText("1.00 GB")).toBeInTheDocument();
  });
});
