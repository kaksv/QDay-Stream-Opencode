"use client";

import { useEffect, useRef } from "react";
import { useAccount, useConnect, useConnectors } from "wagmi";
import { DEMO_WALLET_ENABLED } from "@/lib/config";

/**
 * Local-only convenience: reconnects the unlocked Anvil demo wallet after a reload so the
 * demo and screenshot flows don't depend on a browser extension. Enabled only by
 * NEXT_PUBLIC_DEMO_WALLET=1 and never included in a production deployment.
 */
export function DemoAutoConnect() {
  const { isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const connectors = useConnectors();
  const attempted = useRef(false);

  useEffect(() => {
    if (!DEMO_WALLET_ENABLED || isConnected || attempted.current) return;
    const demo = connectors.find((connector) => connector.type === "mock");
    if (!demo) return;
    attempted.current = true;
    connectAsync({ connector: demo }).catch(() => {
      // The dialog still lists the demo wallet if automatic connection is unavailable.
    });
  }, [connectAsync, connectors, isConnected]);

  return null;
}
