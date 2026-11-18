"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { addressUrl } from "@/lib/explorer";
import { cn, copyText, truncateAddress } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CopyButton({
  value,
  label = "Copy address",
  className,
  size = "sm",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(value);
    if (!ok) {
      toast.error("Couldn't copy", { description: "Select the address manually." });
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : label}
          className={cn(
            "inline-flex items-center justify-center rounded-md text-muted transition-colors duration-100 hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            size === "sm" ? "size-7" : "size-8",
            className,
          )}
        >
          {copied ? (
            <Check className="size-3.5 text-mint" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied" : label}</TooltipContent>
    </Tooltip>
  );
}

export function AddressAvatar({
  address,
  size = 28,
  className,
}: {
  address: string;
  size?: number;
  className?: string;
}) {
  const seed = address.replace("0x", "").slice(0, 6);
  const hue = parseInt(seed.slice(0, 2) || "a0", 16) % 360;
  const hue2 = (hue + 68) % 360;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 text-[10px] font-semibold text-black/70",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 62% 66%), hsl(${hue2} 58% 52%))`,
      }}
    >
      {seed.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function AddressDisplay({
  address,
  label,
  showAvatar = false,
  showExplorer = true,
  className,
  full = false,
}: {
  address: string;
  label?: string;
  showAvatar?: boolean;
  showExplorer?: boolean;
  className?: string;
  full?: boolean;
}) {
  const url = showExplorer ? addressUrl(address) : null;

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      {showAvatar ? <AddressAvatar address={address} size={26} /> : null}
      <span className="min-w-0">
        {label ? (
          <span className="block text-[11px] uppercase tracking-[0.07em] text-faint">
            {label}
          </span>
        ) : null}
        <span className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="numeric cursor-default truncate text-[13px] text-foreground/90">
                {full ? address : truncateAddress(address)}
              </span>
            </TooltipTrigger>
            <TooltipContent className="numeric break-all">{address}</TooltipContent>
          </Tooltip>
          <CopyButton value={address} />
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label="View address on Aevum Explorer"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted transition-colors duration-100 hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </span>
      </span>
    </span>
  );
}
