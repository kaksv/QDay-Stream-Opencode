import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Amount } from "@/components/brand/amount";
import { StatusBadge } from "@/components/brand/status-badge";
import { ProgressFlow, TimelineMarks } from "@/components/brand/progress";
import { AddressAvatar } from "@/components/brand/address";
import {
  CancelStreamDialog,
  WithdrawStreamButton,
} from "@/components/app/stream-actions";
import {
  accruedAt,
  progressAt,
  streamStatus,
  withdrawableAt,
} from "@/lib/accrual";
import { formatDate, formatDuration, formatRate } from "@/lib/format";
import type { Stream, StreamRole } from "@/lib/types";
import { cn, truncateAddress } from "@/lib/utils";

export function StreamCard({
  stream,
  role,
  nowMs,
  className,
}: {
  stream: Stream;
  role: StreamRole;
  nowMs: number;
  className?: string;
}) {
  const status = streamStatus(stream, nowMs);
  const accrued = accruedAt(stream, nowMs);
  const withdrawable = withdrawableAt(stream, nowMs);
  const progress = progressAt(stream, nowMs);
  const rate = formatRate(stream.amount, Number(stream.endTime - stream.startTime));
  const counterparty = role === "recipient" ? stream.sender : stream.recipient;
  const counterpartyLabel = role === "recipient" ? "From" : "To";
  const primaryValue = role === "recipient" ? withdrawable : accrued;
  const primaryLabel =
    role === "recipient"
      ? status === "cancelled"
        ? "Frozen, ready to withdraw"
        : "Withdrawable now"
      : status === "cancelled"
        ? "Released before cancellation"
        : "Released to recipient";

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-colors duration-150 hover:border-line-strong",
        className,
      )}
    >
      <Link
        href={`/streams/${stream.id.toString()}`}
        className="block p-5 pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Stream ${stream.id.toString()} details`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-faint">
              <span>{counterpartyLabel}</span>
              <span className="text-line-strong">/</span>
              <span className="numeric normal-case tracking-normal text-muted">
                #{stream.id.toString()}
              </span>
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <AddressAvatar address={counterparty} size={22} />
              <span className="numeric truncate text-[13px] text-foreground/90">
                {truncateAddress(counterparty, 8, 6)}
              </span>
              <ArrowUpRight className="size-3 text-faint opacity-0 transition-opacity duration-100 group-hover:opacity-100" />
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] text-faint">{primaryLabel}</p>
            <p className="mt-0.5 truncate text-[26px] font-medium leading-tight tracking-[-0.035em] text-foreground">
              <Amount value={primaryValue} zeroSubscript={false} />
            </p>
            <p className="mt-1 text-[11.5px] text-muted">
              of <Amount value={stream.amount} /> · {formatDuration(Number(stream.endTime - stream.startTime), true)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="numeric text-[13px] text-foreground/80">{rate.value}</p>
            <p className="text-[10.5px] text-faint">{rate.unit}</p>
          </div>
        </div>

        <div className="mt-4">
          <ProgressFlow value={progress} status={status} />
          <TimelineMarks
            className="mt-2"
            startLabel={formatDate(stream.startTime)}
            endLabel={formatDate(stream.endTime)}
          />
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
        <Link
          href={`/streams/${stream.id.toString()}`}
          className="text-[12px] text-muted transition-colors duration-100 hover:text-foreground"
        >
          {status === "cancelled"
            ? `${formatDate(stream.cancelledAt)} · open receipt`
            : status === "completed"
              ? "Stream complete · open receipt"
              : `Ends ${formatDate(stream.endTime)}`}
        </Link>
        <div className="flex items-center gap-2">
          {role === "recipient" ? (
            <WithdrawStreamButton
              stream={stream}
              nowMs={nowMs}
              label={withdrawable === 0n ? "Nothing yet" : "Withdraw"}
            />
          ) : (
            <CancelStreamDialog stream={stream} nowMs={nowMs} label="Cancel" />
          )}
        </div>
      </div>
    </Card>
  );
}
