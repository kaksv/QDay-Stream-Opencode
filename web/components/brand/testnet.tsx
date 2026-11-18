import Link from "next/link";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import { QDAY } from "@/lib/config";
import { cn } from "@/lib/utils";

export function TestnetBadge({ className }: { className?: string }) {
  return (
    <Link
      href={QDAY.faucetUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] text-muted transition-colors duration-100 hover:border-line-strong hover:text-foreground",
        className,
      )}
    >
      <FlaskConical className="size-3 text-amber" aria-hidden="true" />
      Aevum Testnet
      <ArrowUpRight className="size-3 text-faint transition-transform duration-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

export function TestnetNote({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className={cn("text-[11.5px] leading-5 text-faint", className)}>
        Testnet only · tUSD8 has no monetary value.
      </p>
    );
  }
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-line bg-surface p-4",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true" />
      <div className="text-[12.5px] leading-5">
        <p className="font-medium text-foreground">This is a testnet deployment.</p>
        <p className="mt-0.5 text-muted">
          tUSD8 and tQDAY are free test tokens on QDay Aevum. They carry no monetary
          value and no expectation of value.{" "}
          <a
            href={QDAY.faucetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline decoration-line-strong underline-offset-4 hover:decoration-primary"
          >
            Get test tokens
          </a>
          .
        </p>
      </div>
    </div>
  );
}
