"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/hooks/use-mounted";
import { QDAY } from "@/lib/config";
import { switchToAevum } from "@/lib/wallet";

export function NetworkBanner() {
  const mounted = useMounted();
  const { isConnected, chainId, connector } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const [busy, setBusy] = useState(false);

  if (!mounted || !isConnected) return null;
  if (chainId === QDAY.chainId) return null;

  async function handleSwitch() {
    setBusy(true);
    try {
      await switchToAevum(connector, switchChainAsync);
      toast.success(`Switched to ${QDAY.name}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message.toLowerCase() : "";
      toast.error("Couldn't switch networks", {
        description: message.includes("reject")
          ? "The wallet request was declined. Switch networks when you're ready."
          : `Add ${QDAY.name} (chain ${QDAY.chainId}) in your wallet, then retry.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-amber/20 bg-amber/[0.07]">
      <div className="container-page flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-[12.5px] leading-5 text-amber">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Your wallet is on chain{" "}
            <span className="numeric">{chainId ?? "unknown"}</span>. StreamPay runs on{" "}
            {QDAY.name} (chain <span className="numeric">{QDAY.chainId}</span>).
          </span>
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSwitch}
          disabled={busy || isPending}
          className="h-8 shrink-0 border-amber/30 bg-amber/10 text-amber hover:bg-amber/15"
        >
          {busy || isPending ? "Switching…" : "Switch network"}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
