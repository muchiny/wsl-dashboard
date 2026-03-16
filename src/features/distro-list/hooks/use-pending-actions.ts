import { useCallback, useEffect, useState } from "react";
import type { Distro } from "@/shared/types/distro";

const FALLBACK_TIMEOUT_MS = 30_000;

/**
 * Manages optimistic pending action state for distro operations.
 * Tracks which distros have in-flight actions and auto-clears when the
 * real state matches the expected target, or after a 30s safety timeout.
 */
export function usePendingActions(distros: Distro[]) {
  const [pendingActions, setPendingActions] = useState<Map<string, string>>(new Map());
  const [expectedStates, setExpectedStates] = useState<Map<string, Distro["state"]>>(new Map());

  const markPending = useCallback(
    (name: string, action: string, expectedState: Distro["state"]) => {
      setPendingActions((prev) => new Map(prev).set(name, action));
      setExpectedStates((prev) => new Map(prev).set(name, expectedState));
    },
    [],
  );

  const clearPending = useCallback((name: string) => {
    setPendingActions((prev) => {
      const next = new Map(prev);
      next.delete(name);
      return next;
    });
    setExpectedStates((prev) => {
      const next = new Map(prev);
      next.delete(name);
      return next;
    });
  }, []);

  // Auto-clear when real state matches expected target (state-during-render pattern)
  const [prevDistros, setPrevDistros] = useState(distros);
  if (distros !== prevDistros) {
    setPrevDistros(distros);
    if (pendingActions.size > 0) {
      const toRemove: string[] = [];
      for (const [name] of pendingActions) {
        const target = expectedStates.get(name);
        const actual = distros.find((d) => d.name === name)?.state;
        if (target && actual === target) {
          toRemove.push(name);
        }
      }
      if (toRemove.length > 0) {
        setPendingActions((prev) => {
          const next = new Map(prev);
          for (const name of toRemove) {
            next.delete(name);
          }
          return next;
        });
        setExpectedStates((prev) => {
          const next = new Map(prev);
          for (const name of toRemove) {
            next.delete(name);
          }
          return next;
        });
      }
    }
  }

  // Fallback timeout: clear stuck pending actions after 30s
  useEffect(() => {
    if (pendingActions.size === 0) return;
    const timer = setTimeout(() => {
      setPendingActions(new Map());
      setExpectedStates(new Map());
    }, FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pendingActions]);

  return {
    pendingActions,
    hasPending: pendingActions.size > 0,
    markPending,
    clearPending,
    getPending: (name: string) => pendingActions.get(name),
  } as const;
}
