"use client";

import { useState } from "react";
import { ChevronRight, Download, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useConnect, useConnectors } from "wagmi";
import type { Connector } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/brand/feedback";
import { QDAY } from "@/lib/config";
import { describeTxError } from "@/lib/errors";
import { cn } from "@/lib/utils";

const PRIORITY = ["metaMask", "metaMaskSDK", "coinbaseWallet", "walletConnect"];

function connectorRank(connector: Connector) {
  if (connector.type === "mock") return 99;
  const index = PRIORITY.findIndex(
    (id) => connector.id.toLowerCase() === id.toLowerCase(),
  );
  return index === -1 ? 10 : index;
}

function connectorLabel(connector: Connector) {
  if (connector.type === "mock") return "Demo wallet (local)";
  if (connector.id === "injected") return "Browser wallet";
  return connector.name;
}

function connectorHint(connector: Connector) {
  if (connector.type === "mock") return "Unlocked Anvil account for local testing";
  if (connector.id === "injected") return "MetaMask, Rabby, Brave or any injected wallet";
  if (connector.id === "metaMaskSDK") return "Connect with the MetaMask extension or mobile app";
  return "Connect with this wallet";
}

export function ConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const connectors = useConnectors();
  const { connectAsync, isPending } = useConnect();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...connectors].sort(
    (a, b) => connectorRank(a) - connectorRank(b),
  );

  async function handleConnect(connector: Connector) {
    setError(null);
    setPendingId(connector.id);
    try {
      await connectAsync({ connector });
      toast.success("Wallet connected", {
        description: `You're on ${QDAY.name}.`,
      });
      onOpenChange(false);
    } catch (caught) {
      const info = describeTxError(caught);
      if (info.rejected) {
        toast.info("Connection cancelled");
      } else {
        setError(
          connector.id === "injected"
            ? "No injected wallet answered. Install MetaMask or another EVM wallet, then reload."
            : info.description,
        );
      }
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Your wallet is your identity. StreamPay never asks for a password and never
            takes custody of your funds.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {sorted.length === 0 ? (
            <div className="rounded-xl border border-line bg-elevated p-4 text-sm text-muted">
              No wallet detected. Install an EVM wallet extension and reload this page.
            </div>
          ) : null}

          {sorted.map((connector) => {
            const busy = isPending && pendingId === connector.id;
            return (
              <button
                key={connector.uid}
                type="button"
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border border-line bg-elevated/60 p-3.5 text-left transition-colors duration-100 hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
                  {connector.icon ? (
                    // Wallet-supplied data URI; rendered as an image, never as markup.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={connector.icon}
                      alt=""
                      className="size-6 object-contain"
                    />
                  ) : (
                    <Wallet className="size-5 text-muted" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-foreground">
                    {connectorLabel(connector)}
                  </span>
                  <span className="block truncate text-[12px] text-faint">
                    {connectorHint(connector)}
                  </span>
                </span>
                {busy ? (
                  <Spinner className="text-muted" />
                ) : (
                  <ChevronRight className="size-4 text-faint transition-transform duration-100 group-hover:translate-x-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="rounded-lg border border-coral/25 bg-coral/10 px-3 py-2 text-[12.5px] leading-5 text-coral">
            {error}
          </p>
        ) : null}

        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-[12px] leading-5 text-muted">
            You&apos;ll be asked to add or switch to{" "}
            <span className="text-foreground">{QDAY.name}</span> (chain{" "}
            <span className="numeric">{QDAY.chainId}</span>) if your wallet isn&apos;t on it
            yet.
          </p>
          <div className="mt-2 flex items-center gap-4 text-[11.5px] text-faint">
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              <Download className="size-3" aria-hidden="true" />
              Get MetaMask
            </a>
            <span aria-hidden="true">·</span>
            <span>Testnet only</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
