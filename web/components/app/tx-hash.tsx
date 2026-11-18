import { ArrowUpRight } from "lucide-react";
import { txUrl } from "@/lib/explorer";
import { cn, truncateAddress } from "@/lib/utils";

export function TxHash({
  hash,
  className,
  full = false,
}: {
  hash: `0x${string}`;
  className?: string;
  full?: boolean;
}) {
  const url = txUrl(hash);
  const label = full ? hash : truncateAddress(hash, 10, 8);

  const content = (
    <span className={cn("numeric inline-flex items-center gap-1 text-[12px]", className)}>
      {label}
      {url ? <ArrowUpRight className="size-3" aria-hidden="true" /> : null}
    </span>
  );

  if (!url) return content;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-muted underline-offset-4 transition-colors duration-100 hover:text-foreground hover:underline"
      title={hash}
    >
      {content}
    </a>
  );
}
