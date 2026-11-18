"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True after hydration; false during SSR and the hydration render. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
