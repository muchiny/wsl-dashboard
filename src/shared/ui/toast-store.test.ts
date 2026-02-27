import { describe, it, expect, beforeEach } from "vitest";
import { useToastStore, toast } from "./toast-store";

describe("useToastStore", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  describe("add", () => {
    it("adds a toast with default variant and duration", () => {
      useToastStore.getState().add("Hello");
      const toasts = useToastStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0]!.message).toBe("Hello");
      expect(toasts[0]!.variant).toBe("info");
      expect(toasts[0]!.duration).toBe(4000);
    });

    it("adds a toast with specified variant", () => {
      useToastStore.getState().add("Error!", "error", 6000);
      const toasts = useToastStore.getState().toasts;
      expect(toasts[0]!.variant).toBe("error");
      expect(toasts[0]!.duration).toBe(6000);
    });

    it("generates unique IDs for each toast", () => {
      useToastStore.getState().add("First");
      useToastStore.getState().add("Second");
      const toasts = useToastStore.getState().toasts;
      expect(toasts[0]!.id).not.toBe(toasts[1]!.id);
    });

    it("appends to existing toasts", () => {
      useToastStore.getState().add("First");
      useToastStore.getState().add("Second");
      expect(useToastStore.getState().toasts).toHaveLength(2);
    });
  });

  describe("dismiss", () => {
    it("removes a specific toast by id", () => {
      useToastStore.getState().add("Keep me");
      useToastStore.getState().add("Remove me");
      const toasts = useToastStore.getState().toasts;
      const toRemove = toasts[1]!.id;

      useToastStore.getState().dismiss(toRemove);
      const remaining = useToastStore.getState().toasts;
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.message).toBe("Keep me");
    });

    it("does nothing if id does not exist", () => {
      useToastStore.getState().add("Hello");
      useToastStore.getState().dismiss("nonexistent-id");
      expect(useToastStore.getState().toasts).toHaveLength(1);
    });
  });
});

describe("toast helper", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("toast.success adds a success toast", () => {
    toast.success("Done!");
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0]!.variant).toBe("success");
    expect(toasts[0]!.message).toBe("Done!");
  });

  it("toast.error adds an error toast with 6s duration", () => {
    toast.error("Failed!");
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0]!.variant).toBe("error");
    expect(toasts[0]!.duration).toBe(6000);
  });

  it("toast.warning adds a warning toast with 5s duration", () => {
    toast.warning("Careful!");
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0]!.variant).toBe("warning");
    expect(toasts[0]!.duration).toBe(5000);
  });

  it("toast.info adds an info toast", () => {
    toast.info("FYI");
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0]!.variant).toBe("info");
    expect(toasts[0]!.duration).toBe(4000);
  });
});
