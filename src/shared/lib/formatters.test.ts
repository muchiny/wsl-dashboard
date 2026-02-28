import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { formatBytes, formatRelativeTime } from "./formatters";

describe("formatBytes", () => {
  it("formats gigabytes", () => {
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2.00 GB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.00 KB");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats exact GB boundary", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
  });

  it("formats exact MB boundary", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats days ago", () => {
    expect(formatRelativeTime("2026-01-13T12:00:00Z")).toBe("2 days ago");
  });

  it("formats hours ago", () => {
    expect(formatRelativeTime("2026-01-15T09:00:00Z")).toBe("3 hours ago");
  });

  it("formats minutes ago", () => {
    expect(formatRelativeTime("2026-01-15T11:55:00Z")).toBe("5 minutes ago");
  });

  it("formats just now", () => {
    expect(formatRelativeTime("2026-01-15T11:59:45Z")).toBe("now");
  });
});

describe("formatBytes - property-based", () => {
  it("always returns a valid unit suffix", () => {
    fc.assert(
      fc.property(fc.nat(Number.MAX_SAFE_INTEGER), (n) => {
        const r = formatBytes(n);
        return r.endsWith(" B") || r.endsWith(" KB") || r.endsWith(" MB") || r.endsWith(" GB");
      }),
    );
  });

  it("numeric part is non-negative", () => {
    fc.assert(
      fc.property(fc.nat(Number.MAX_SAFE_INTEGER), (n) => {
        const r = formatBytes(n);
        const num = parseFloat(r.split(" ")[0]!);
        return !isNaN(num) && num >= 0;
      }),
    );
  });

  it("larger input gives same or larger display value within same unit", () => {
    fc.assert(
      fc.property(fc.nat(1_000_000_000), fc.nat(1_000_000_000), (a, b) => {
        if (a > b) {
          const ra = formatBytes(a);
          const rb = formatBytes(b);
          const ua = ra.split(" ")[1];
          const ub = rb.split(" ")[1];
          if (ua === ub) return parseFloat(ra) >= parseFloat(rb);
        }
        return true;
      }),
    );
  });
});

describe("formatRelativeTime - property-based", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("never throws for past dates and returns valid output", () => {
    const nowMs = new Date("2026-01-15T12:00:00Z").getTime();
    const minMs = new Date("2000-01-01").getTime();
    fc.assert(
      fc.property(fc.integer({ min: minMs, max: nowMs }), (ms) => {
        const isoStr = new Date(ms).toISOString();
        const result = formatRelativeTime(isoStr);
        return result === "now" || result.includes("ago");
      }),
    );
  });
});
