"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Droplets,
  LogOut,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { useGasBalance } from "@/lib/hooks/use-streams";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AddressAvatar } from "@/components/brand/address";
import { ConnectDialog } from "@/components/app/connect-dialog";
import { useMounted } from "@/lib/hooks/use-mounted";
import { QDAY } from "@/lib/config";
import { addressUrl } from "@/lib/explorer";
import { cn, copyText, truncateAddress } from "@/lib/utils";
import { switchToAevum } from "@/lib/wallet";

export function WalletButton({ className }: { className?: string }) {
  const mounted = useMounted();
  const { address, isConnected, chainId, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const gas = useGasBalance(address);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function handleCopy() {
    if (!address) return;
    const ok = await copyText(address);
    if (!ok) {
      toast.error("Couldn't copy the address.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  async function handleSwitch() {
    setSwitching(true);
    try {
      await switchToAevum(connector, switchChainAsync);
      toast.success(`Switched to ${QDAY.name}`);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not switch networks.";
      toast.error("Network switch failed", {
        description: message.includes("rejected")
          ? "The wallet request was declined."
          : "Add QDay Aevum manually in your wallet, then try again.",
      });
    } finally {
      setSwitching(false);
    }
  }

  if (!mounted) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className={cn("pointer-events-none opacity-60", className)}
        aria-hidden="true"
      >
        <Wallet className="size-4" />
        Connect wallet
      </Button>
    );
  }

  if (!isConnected || !address) {
    return (
      <>
        <Button
          size="sm"
          className={cn("h-9", className)}
          onClick={() => setDialogOpen(true)}
        >
          <Wallet className="size-4" />
          Connect wallet
        </Button>
        <ConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  const wrongNetwork = chainId !== QDAY.chainId;
  const explorer = addressUrl(address);
  const gasValue = gas.data
    ? `${Number(gas.data.formatted).toLocaleString("en-US", {
        maximumFractionDigits: 4,
      })} ${gas.data.symbol}`
    : "—";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-[10px] border border-line bg-surface pl-1.5 pr-2.5 text-[13px] text-foreground transition-colors duration-100 hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
            aria-label="Wallet menu"
          >
            <AddressAvatar address={address} size={24} />
            <span className="numeric hidden text-[12.5px] sm:inline">
              {truncateAddress(address, 6, 4)}
            </span>
            {wrongNetwork ? (
              <span className="size-1.5 rounded-full bg-amber" aria-hidden="true" />
            ) : null}
            <ChevronDown className="size-3.5 text-faint" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[270px]">
          <DropdownMenuLabel>Connected wallet</DropdownMenuLabel>
          <div className="flex items-center gap-2.5 px-2.5 pb-2">
            <AddressAvatar address={address} size={32} />
            <div className="min-w-0">
              <p className="numeric truncate text-[12.5px] text-foreground">
                {truncateAddress(address, 10, 6)}
              </p>
              <p className="text-[11px] text-faint">
                {connector?.name ?? "Wallet"} ·{" "}
                {wrongNetwork ? (
                  <span className="text-amber">Wrong network</span>
                ) : (
                  <span className="text-mint">Aevum</span>
                )}
              </p>
            </div>
          </div>

          <div className="mx-1 mb-1 rounded-lg border border-line bg-elevated/60 px-2.5 py-2">
            <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
              tQDAY gas balance
            </p>
            <p className="numeric mt-0.5 text-[13px] text-foreground">{gasValue}</p>
          </div>

          <DropdownMenuSeparator className="mx-1 my-1 h-px bg-line" />

          {wrongNetwork ? (
            <DropdownMenuItem
              onSelect={handleSwitch}
              disabled={switching}
              className="text-amber focus:text-amber"
            >
              <Droplets />
              {switching ? "Switching…" : "Switch to Aevum"}
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem onSelect={handleCopy}>
            {copied ? <Check className="text-mint" /> : <Copy />}
            {copied ? "Copied" : "Copy address"}
          </DropdownMenuItem>

          {explorer ? (
            <DropdownMenuItem asChild>
              <a href={explorer} target="_blank" rel="noreferrer">
                <ArrowUpRight />
                View on explorer
              </a>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <Wallet />
              My streams
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="mx-1 my-1 h-px bg-line" />

          <DropdownMenuItem
            onSelect={() => disconnect()}
            className="text-coral focus:text-coral"
          >
            <LogOut />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConnectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
