import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { cn } from "./utils";

describe("cn", () => {
  it("merges conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("filters falsy values", () => {
    const shouldHide = false;
    expect(cn("base", shouldHide && "hidden")).toBe("base");
  });

  it("combines multiple class names", () => {
    const result = cn("text-sm", "font-bold");
    expect(result).toContain("text-sm");
    expect(result).toContain("font-bold");
  });
});

describe("cn - property-based", () => {
  it("falsy values produce empty or equivalent result", () => {
    fc.assert(
      fc.property(fc.constantFrom(null, undefined, false, 0, ""), (falsy) => {
        const result = cn(falsy);
        return result === "" || result === cn();
      }),
    );
  });

  it("always returns a string", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        return typeof cn(a, b) === "string";
      }),
    );
  });
});
