import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { renderHook, act } from "@testing-library/react";
import { useMetricsHistory } from "./use-metrics-history";
import type { SystemMetrics } from "@/shared/types/monitoring";

function makeMetrics(overrides: Partial<SystemMetrics> = {}): SystemMetrics {
  return {
    distro_name: "Ubuntu",
    timestamp: new Date().toISOString(),
    cpu: { usage_percent: 50, per_core: [50], load_average: [1, 1, 1] },
    memory: {
      total_bytes: 8000,
      used_bytes: 4000,
      available_bytes: 4000,
      cached_bytes: 1000,
      swap_total_bytes: 0,
      swap_used_bytes: 0,
    },
    disk: {
      total_bytes: 100000,
      used_bytes: 50000,
      available_bytes: 50000,
      usage_percent: 50,
    },
    network: {
      interfaces: [
        {
          name: "eth0",
          rx_bytes: 1000,
          tx_bytes: 500,
          rx_packets: 10,
          tx_packets: 5,
        },
      ],
    },
    ...overrides,
  };
}

describe("useMetricsHistory", () => {
  it("starts with empty history", () => {
    const { result } = renderHook(() => useMetricsHistory());
    expect(result.current.history).toEqual([]);
  });

  it("push adds a point to history", () => {
    const { result } = renderHook(() => useMetricsHistory());
    let points: ReturnType<typeof result.current.push>;
    act(() => {
      points = result.current.push(makeMetrics());
    });
    expect(points!.length).toBe(1);
  });

  it("calculates memory percent", () => {
    const { result } = renderHook(() => useMetricsHistory());
    let points: ReturnType<typeof result.current.push>;
    act(() => {
      points = result.current.push(makeMetrics());
    });
    expect(points![0]!.memPercent).toBe(50);
  });

  it("maps cpu from metrics", () => {
    const { result } = renderHook(() => useMetricsHistory());
    let points: ReturnType<typeof result.current.push>;
    act(() => {
      points = result.current.push(
        makeMetrics({ cpu: { usage_percent: 75, per_core: [75], load_average: [1, 1, 1] } }),
      );
    });
    expect(points![0]!.cpu).toBe(75);
  });

  it("maps disk percent from metrics", () => {
    const { result } = renderHook(() => useMetricsHistory());
    let points: ReturnType<typeof result.current.push>;
    act(() => {
      points = result.current.push(makeMetrics());
    });
    expect(points![0]!.diskPercent).toBe(50);
  });

  it("first push has zero network rate", () => {
    const { result } = renderHook(() => useMetricsHistory());
    let points: ReturnType<typeof result.current.push>;
    act(() => {
      points = result.current.push(makeMetrics());
    });
    expect(points![0]!.netRx).toBe(0);
    expect(points![0]!.netTx).toBe(0);
  });

  it("second push calculates network rate", () => {
    const { result } = renderHook(() => useMetricsHistory());
    act(() => {
      result.current.push(
        makeMetrics({
          network: {
            interfaces: [
              { name: "eth0", rx_bytes: 1000, tx_bytes: 500, rx_packets: 10, tx_packets: 5 },
            ],
          },
        }),
      );
    });
    let points: ReturnType<typeof result.current.push>;
    act(() => {
      points = result.current.push(
        makeMetrics({
          network: {
            interfaces: [
              { name: "eth0", rx_bytes: 3000, tx_bytes: 1500, rx_packets: 30, tx_packets: 15 },
            ],
          },
        }),
      );
    });
    // rate = (3000 - 1000) / 2 = 1000
    expect(points![1]!.netRx).toBe(1000);
    // rate = (1500 - 500) / 2 = 500
    expect(points![1]!.netTx).toBe(500);
  });

  it("clamps negative network rate to zero", () => {
    const { result } = renderHook(() => useMetricsHistory());
    act(() => {
      result.current.push(
        makeMetrics({
          network: {
            interfaces: [
              { name: "eth0", rx_bytes: 5000, tx_bytes: 3000, rx_packets: 10, tx_packets: 5 },
            ],
          },
        }),
      );
    });
    let points: ReturnType<typeof result.current.push>;
    act(() => {
      // Counter reset: rx decreased
      points = result.current.push(
        makeMetrics({
          network: {
            interfaces: [
              { name: "eth0", rx_bytes: 1000, tx_bytes: 500, rx_packets: 5, tx_packets: 2 },
            ],
          },
        }),
      );
    });
    expect(points![1]!.netRx).toBe(0);
    expect(points![1]!.netTx).toBe(0);
  });

  it("caps history at 60 points", () => {
    const { result } = renderHook(() => useMetricsHistory());
    let points: ReturnType<typeof result.current.push>;
    act(() => {
      for (let i = 0; i < 65; i++) {
        points = result.current.push(makeMetrics());
      }
    });
    expect(points!.length).toBe(60);
  });

  it("clear resets history", () => {
    const { result } = renderHook(() => useMetricsHistory());
    act(() => {
      result.current.push(makeMetrics());
      result.current.push(makeMetrics());
      result.current.clear();
    });
    expect(result.current.history).toEqual([]);
  });

  it("clear resets prevNetRef so next push has zero rates", () => {
    const { result } = renderHook(() => useMetricsHistory());
    act(() => {
      result.current.push(
        makeMetrics({
          network: {
            interfaces: [
              { name: "eth0", rx_bytes: 5000, tx_bytes: 3000, rx_packets: 10, tx_packets: 5 },
            ],
          },
        }),
      );
      result.current.clear();
    });
    let points: ReturnType<typeof result.current.push>;
    act(() => {
      points = result.current.push(
        makeMetrics({
          network: {
            interfaces: [
              { name: "eth0", rx_bytes: 10000, tx_bytes: 6000, rx_packets: 10, tx_packets: 5 },
            ],
          },
        }),
      );
    });
    expect(points![0]!.netRx).toBe(0);
    expect(points![0]!.netTx).toBe(0);
  });
});

describe("useMetricsHistory - property-based", () => {
  it("buffer never exceeds 60 points", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), (count) => {
        const { result } = renderHook(() => useMetricsHistory());
        let points: ReturnType<typeof result.current.push> = [];
        act(() => {
          for (let i = 0; i < count; i++) {
            points = result.current.push(makeMetrics());
          }
        });
        return points.length <= 60;
      }),
    );
  });

  it("network rate is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.nat(1_000_000_000),
        fc.nat(1_000_000_000),
        fc.nat(1_000_000_000),
        fc.nat(1_000_000_000),
        (rx1, tx1, rx2, tx2) => {
          const { result } = renderHook(() => useMetricsHistory());
          let points: ReturnType<typeof result.current.push> = [];
          act(() => {
            result.current.push(
              makeMetrics({
                network: {
                  interfaces: [
                    { name: "eth0", rx_bytes: rx1, tx_bytes: tx1, rx_packets: 0, tx_packets: 0 },
                  ],
                },
              }),
            );
            points = result.current.push(
              makeMetrics({
                network: {
                  interfaces: [
                    { name: "eth0", rx_bytes: rx2, tx_bytes: tx2, rx_packets: 0, tx_packets: 0 },
                  ],
                },
              }),
            );
          });
          return points[1]!.netRx >= 0 && points[1]!.netTx >= 0;
        },
      ),
    );
  });

  it("memPercent is always between 0 and 100", () => {
    fc.assert(
      fc.property(
        fc.nat(1_000_000_000),
        fc.nat(1_000_000_000),
        (total, used) => {
          if (total === 0) return true;
          const adjustedUsed = Math.min(used, total);
          const { result } = renderHook(() => useMetricsHistory());
          let points: ReturnType<typeof result.current.push> = [];
          act(() => {
            points = result.current.push(
              makeMetrics({
                memory: {
                  total_bytes: total,
                  used_bytes: adjustedUsed,
                  available_bytes: total - adjustedUsed,
                  cached_bytes: 0,
                  swap_total_bytes: 0,
                  swap_used_bytes: 0,
                },
              }),
            );
          });
          return points[0]!.memPercent >= 0 && points[0]!.memPercent <= 100;
        },
      ),
    );
  });
});
