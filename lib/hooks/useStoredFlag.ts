"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A boolean preference persisted in localStorage, read through
 * useSyncExternalStore so the server render and the first client render agree
 * (both see the server snapshot) and the stored value applies without a
 * setState-in-effect cascade. Cross-tab changes arrive via the storage event;
 * same-tab writes notify through a local listener set.
 */

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function useStoredFlag(key: string, fallback = false): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => fallback
  );

  const setValue = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Storage unavailable (private mode): the flag simply does not persist.
      }
      notify();
    },
    [key]
  );

  return [value, setValue];
}
