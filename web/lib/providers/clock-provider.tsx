"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useBlock } from "wagmi";
import {
  getClockServerSnapshot,
  getClockSnapshot,
  getOffsetSnapshot,
  setClockOffset,
  subscribeClock,
} from "./clock-store";
import { useMounted } from "@/lib/hooks/use-mounted";

type ClockState = {
  /** Wall-clock milliseconds corrected against the latest Aevum block timestamp. */
  nowMs: number;
  /** False during SSR and the first client paint. */
  mounted: boolean;
  offsetMs: number;
  blockNumber?: bigint;
};

const ClockContext = createContext<ClockState>({
  nowMs: 0,
  mounted: false,
  offsetMs: 0,
});

/**
 * One shared one-second ticker for the whole app.
 *
 * The offset between the browser clock and the chain is recomputed on every block so a
 * laptop with a skewed clock still shows accrual that matches the chain. No chain writes
 * happen per tick; this only powers display.
 */
export function ClockProvider({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const nowMs = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getClockServerSnapshot,
  );
  const offsetMs = useSyncExternalStore(
    subscribeClock,
    getOffsetSnapshot,
    () => 0,
  );

  const { data: block } = useBlock({
    watch: true,
    query: {
      refetchInterval: 4_000,
      staleTime: 1_000,
    },
  });

  useEffect(() => {
    if (!block?.timestamp) return;
    setClockOffset(Number(block.timestamp) * 1_000 - Date.now());
  }, [block?.timestamp]);

  return (
    <ClockContext.Provider
      value={{ nowMs, mounted, offsetMs, blockNumber: block?.number }}
    >
      {children}
    </ClockContext.Provider>
  );
}

export function useClock(): ClockState {
  return useContext(ClockContext);
}
