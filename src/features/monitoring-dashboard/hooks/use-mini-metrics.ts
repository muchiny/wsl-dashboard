import { useEffect, useSyncExternalStore } from "react";
import { listen } from "@tauri-apps/api/event";
import type { SystemMetrics } from "@/shared/types/monitoring";

const MAX_POINTS = 30;

interface MiniMetrics {
  cpuHistory: number[];
  cpuCurrent: number;
}

type Store = Map<string, MiniMetrics>;

let store: Store = new Map();
const listeners = new Set<() => void>();
let listenerCount = 0;
let unlisten: (() => void) | null = null;

function notify() {
  for (const l of listeners) l();
}

function getSnapshot() {
  return store;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function handleMetrics(metrics: SystemMetrics) {
  const name = metrics.distro_name;
  const prev = store.get(name);
  const cpuHistory = prev
    ? [...prev.cpuHistory, metrics.cpu.usage_percent].slice(-MAX_POINTS)
    : [metrics.cpu.usage_percent];

  const next = new Map(store);
  next.set(name, {
    cpuHistory,
    cpuCurrent: metrics.cpu.usage_percent,
  });
  store = next;
  notify();
}

/** Start a single Tauri event listener shared by all consumers. */
function startListening() {
  listenerCount++;
  if (listenerCount === 1) {
    listen<SystemMetrics>("system-metrics", (e) => handleMetrics(e.payload)).then(
      (fn) => {
        unlisten = fn;
      },
    );
  }
}

function stopListening() {
  listenerCount--;
  if (listenerCount === 0 && unlisten) {
    unlisten();
    unlisten = null;
  }
}

/**
 * Returns live CPU sparkline data for a single distro.
 * All consumers share one Tauri event listener.
 */
export function useMiniMetrics(distroName: string): MiniMetrics | null {
  useEffect(() => {
    startListening();
    return stopListening;
  }, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  return snapshot.get(distroName) ?? null;
}
