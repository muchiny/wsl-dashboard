import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "./use-theme";

describe("useThemeStore", () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: "dark" });
  });

  it("has dark as initial theme", () => {
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("toggles to light", () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("toggles back to dark", () => {
    useThemeStore.getState().toggleTheme();
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("alternates correctly", () => {
    const store = useThemeStore.getState();
    store.toggleTheme(); // -> light
    expect(useThemeStore.getState().theme).toBe("light");
    useThemeStore.getState().toggleTheme(); // -> dark
    expect(useThemeStore.getState().theme).toBe("dark");
  });
});
