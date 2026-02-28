import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { validateWslConfig, hasErrors } from "./validation";
import type { WslGlobalConfig } from "../api/queries";

function emptyConfig(): WslGlobalConfig {
  return {
    memory: null,
    processors: null,
    swap: null,
    swap_file: null,
    localhost_forwarding: null,
    kernel: null,
    kernel_command_line: null,
    nested_virtualization: null,
    vm_idle_timeout: null,
    dns_tunneling: null,
    firewall: null,
    auto_proxy: null,
    networking_mode: null,
    gui_applications: null,
    default_vhd_size: null,
    dns_proxy: null,
    safe_mode: null,
    auto_memory_reclaim: null,
    sparse_vhd: null,
  };
}

describe("validateWslConfig", () => {
  describe("memory field", () => {
    it("accepts null memory (optional)", () => {
      const errors = validateWslConfig(emptyConfig());
      expect(errors.memory).toBeUndefined();
    });

    it.each(["4GB", "4gb", "4Gb", "512MB", "512mb", "1024KB", "1024kb"])(
      "accepts valid memory value: %s",
      (value) => {
        const errors = validateWslConfig({ ...emptyConfig(), memory: value });
        expect(errors.memory).toBeUndefined();
      },
    );

    it("treats empty string as no value (no error)", () => {
      const errors = validateWslConfig({ ...emptyConfig(), memory: "" });
      expect(errors.memory).toBeUndefined();
    });

    it.each([
      "4.5GB", // decimal not allowed
      "GB", // no number
      "4 GB", // space
      "4TB", // unsupported unit
      "4", // no unit
      "abc", // random string
      "-4GB", // negative
      "4GiB", // wrong unit style
      "4 mb", // space before unit
    ])("rejects invalid memory value: '%s'", (value) => {
      const errors = validateWslConfig({ ...emptyConfig(), memory: value });
      expect(errors.memory).toBeDefined();
    });
  });

  describe("swap field", () => {
    it("accepts null swap (optional)", () => {
      const errors = validateWslConfig(emptyConfig());
      expect(errors.swap).toBeUndefined();
    });

    it("accepts valid swap value", () => {
      const errors = validateWslConfig({ ...emptyConfig(), swap: "2GB" });
      expect(errors.swap).toBeUndefined();
    });

    it("rejects invalid swap value", () => {
      const errors = validateWslConfig({ ...emptyConfig(), swap: "invalid" });
      expect(errors.swap).toBeDefined();
    });
  });

  describe("processors field", () => {
    it("accepts null processors (optional)", () => {
      const errors = validateWslConfig(emptyConfig());
      expect(errors.processors).toBeUndefined();
    });

    it.each([1, 2, 64, 128])("accepts valid processor count: %d", (value) => {
      const errors = validateWslConfig({ ...emptyConfig(), processors: value });
      expect(errors.processors).toBeUndefined();
    });

    it.each([0, -1, 129, 256])("rejects out-of-range processor count: %d", (value) => {
      const errors = validateWslConfig({ ...emptyConfig(), processors: value });
      expect(errors.processors).toBeDefined();
    });

    it("rejects non-integer processor count", () => {
      const errors = validateWslConfig({ ...emptyConfig(), processors: 2.5 });
      expect(errors.processors).toBeDefined();
    });
  });

  describe("vm_idle_timeout field", () => {
    it("accepts null vm_idle_timeout (optional)", () => {
      const errors = validateWslConfig(emptyConfig());
      expect(errors.vm_idle_timeout).toBeUndefined();
    });

    it.each([0, 1, 60, 3600])("accepts valid timeout: %d", (value) => {
      const errors = validateWslConfig({ ...emptyConfig(), vm_idle_timeout: value });
      expect(errors.vm_idle_timeout).toBeUndefined();
    });

    it("rejects negative timeout", () => {
      const errors = validateWslConfig({ ...emptyConfig(), vm_idle_timeout: -1 });
      expect(errors.vm_idle_timeout).toBeDefined();
    });

    it("rejects non-integer timeout", () => {
      const errors = validateWslConfig({ ...emptyConfig(), vm_idle_timeout: 1.5 });
      expect(errors.vm_idle_timeout).toBeDefined();
    });
  });

  describe("multiple errors", () => {
    it("returns errors for multiple invalid fields", () => {
      const errors = validateWslConfig({
        ...emptyConfig(),
        memory: "invalid",
        swap: "bad",
        processors: 0,
        vm_idle_timeout: -5,
      });
      expect(errors.memory).toBeDefined();
      expect(errors.swap).toBeDefined();
      expect(errors.processors).toBeDefined();
      expect(errors.vm_idle_timeout).toBeDefined();
    });
  });
});

describe("hasErrors", () => {
  it("returns false for empty errors", () => {
    expect(hasErrors({})).toBe(false);
  });

  it("returns true when any error exists", () => {
    expect(hasErrors({ memory: "Invalid" })).toBe(true);
  });
});

describe("validateWslConfig - property-based / fuzzing", () => {
  it("memory regex accepts any positive integer followed by KB|MB|GB (case insensitive)", () => {
    const unitArb = fc.constantFrom(
      "KB",
      "kb",
      "Kb",
      "kB",
      "MB",
      "mb",
      "Mb",
      "mB",
      "GB",
      "gb",
      "Gb",
      "gB",
    );
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999999 }), unitArb, (num, unit) => {
        const value = `${num}${unit}`;
        const errors = validateWslConfig({ ...emptyConfig(), memory: value });
        return errors.memory === undefined;
      }),
      { numRuns: 200 },
    );
  });

  it("memory regex rejects strings without a valid unit suffix", () => {
    const badUnits = fc.constantFrom(
      "TB",
      "PB",
      "B",
      "GiB",
      "MiB",
      "KiB",
      "",
      "bytes",
      "g",
      "m",
      "k",
    );
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999999 }), badUnits, (num, unit) => {
        const value = `${num}${unit}`;
        const errors = validateWslConfig({ ...emptyConfig(), memory: value });
        return errors.memory !== undefined;
      }),
      { numRuns: 100 },
    );
  });

  it("memory regex rejects strings with spaces or decimals", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999 }),
        fc.constantFrom("KB", "MB", "GB"),
        fc.constantFrom(" ", ".", ",", "-"),
        (num, unit, sep) => {
          const value = `${num}${sep}${unit}`;
          const errors = validateWslConfig({ ...emptyConfig(), memory: value });
          return errors.memory !== undefined;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("memory regex rejects arbitrary strings", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 20 }).filter((s) => !/^\d+(KB|MB|GB)$/i.test(s)),
        (value) => {
          if (!value) return true; // falsy values skip validation
          const errors = validateWslConfig({ ...emptyConfig(), memory: value });
          return errors.memory !== undefined;
        },
      ),
      { numRuns: 500 },
    );
  });

  it("processors: any integer in [1, 128] is valid", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 128 }), (n) => {
        const errors = validateWslConfig({ ...emptyConfig(), processors: n });
        return errors.processors === undefined;
      }),
    );
  });

  it("processors: any integer outside [1, 128] is invalid", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer({ min: -1000, max: 0 }), fc.integer({ min: 129, max: 10000 })),
        (n) => {
          const errors = validateWslConfig({ ...emptyConfig(), processors: n });
          return errors.processors !== undefined;
        },
      ),
    );
  });

  it("processors: non-integer floats are always invalid", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 200, noNaN: true }).filter((n) => !Number.isInteger(n)),
        (n) => {
          const errors = validateWslConfig({ ...emptyConfig(), processors: n });
          return errors.processors !== undefined;
        },
      ),
    );
  });

  it("vm_idle_timeout: any non-negative integer is valid", () => {
    fc.assert(
      fc.property(fc.nat(100000), (n) => {
        const errors = validateWslConfig({ ...emptyConfig(), vm_idle_timeout: n });
        return errors.vm_idle_timeout === undefined;
      }),
    );
  });

  it("vm_idle_timeout: negative integers are always invalid", () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: -1 }), (n) => {
        const errors = validateWslConfig({ ...emptyConfig(), vm_idle_timeout: n });
        return errors.vm_idle_timeout !== undefined;
      }),
    );
  });

  it("a fully null config always produces zero errors", () => {
    const errors = validateWslConfig(emptyConfig());
    expect(hasErrors(errors)).toBe(false);
  });
});
