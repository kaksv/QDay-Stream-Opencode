"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleSlash,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  History,
  Printer,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Amount } from "@/components/brand/amount";
import { AddressDisplay } from "@/components/brand/address";
import { StatusBadge } from "@/components/brand/status-badge";
import { ProgressFlow, TimelineMarks } from "@/components/brand/progress";
import { EmptyState } from "@/components/brand/feedback";
import { TestnetNote } from "@/components/brand/testnet";
import { TxHash } from "@/components/app/tx-hash";
import {
  CancelStreamDialog,
  WithdrawStreamButton,
} from "@/components/app/stream-actions";
import { useStream } from "@/lib/hooks/use-streams";
import { useStreamEvents } from "@/lib/hooks/use-stream-events";
import { useClock } from "@/lib/providers/clock-provider";
import {
  accruedAt,
  progressAt,
  streamStatus,
  withdrawableAt,
} from "@/lib/accrual";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatRate,
} from "@/lib/format";
import { APP_URL, DEPLOYMENT, QDAY, TUSD8 } from "@/lib/config";
import { contractUrl } from "@/lib/explorer";
import { cn, copyText, isSameAddress, truncateAddress } from "@/lib/utils";
import type { Stream, StreamEvent } from "@/lib/types";

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "mint" | "coral" | "primary" | "muted";
}) {
  return (
    <div className="rounded-xl border border-line bg-elevated/40 p-3.5">
      <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-[18px] font-medium leading-none tracking-[-0.02em]",
          tone === "mint" && "text-mint",
          tone === "coral" && "text-coral",
          tone === "primary" && "text-primary",
          !tone && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EventIcon({ kind }: { kind: StreamEvent["kind"] }) {
  if (kind === "created") return <ArrowUpRight className="size-3.5 text-primary" />;
  if (kind === "withdrawal") return <ArrowDownLeft className="size-3.5 text-mint" />;
  return <CircleSlash className="size-3.5 text-coral" />;
}

function EventRow({ event, stream }: { event: StreamEvent; stream: Stream }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(event.txHash);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  const title =
    event.kind === "created"
      ? "Stream funded"
      : event.kind === "withdrawal"
        ? "Withdrawal"
        : "Stream cancelled";

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span className="relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
        <EventIcon kind={event.kind} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-[13px] font-medium text-foreground">{title}</p>
          <p className="text-[11px] text-faint">
            {event.timestamp
              ? formatDateTime(event.timestamp)
              : `Block ${event.blockNumber.toString()}`}
          </p>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          {event.kind === "created" ? (
            <>
              <span>
                <Amount value={event.amount ?? stream.amount} /> escrowed
              </span>
              <span className="text-faint">·</span>
              <span>{formatDuration(Number(stream.endTime - stream.startTime))}</span>
            </>
          ) : null}
          {event.kind === "withdrawal" ? (
            <>
              <Amount value={event.amount} /> to{" "}
              {truncateAddress(event.actor ?? stream.recipient, 6, 4)}
            </>
          ) : null}
          {event.kind === "cancelled" ? (
            <>
              <span>
                <Amount value={event.senderRefund} /> refunded to sender
              </span>
              <span className="text-faint">·</span>
              <span>
                <Amount value={event.recipientWithdrawable} /> left for recipient
              </span>
            </>
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <TxHash hash={event.txHash} className="text-faint" />
          <button
            type="button"
            onClick={handleCopy}
            className="text-faint transition-colors duration-100 hover:text-muted"
            aria-label="Copy transaction hash"
          >
            {copied ? <Check className="size-3 text-mint" /> : <Copy className="size-3" />}
          </button>
        </div>
      </div>
    </li>
  );
}

function LoadingState() {
  return (
    <div className="container-page py-8 sm:py-10">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-5 h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-12 w-56" />
          <Skeleton className="mt-6 h-2 w-full rounded-full" />
          <div className="mt-8 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-16 w-40" />
          <Skeleton className="mt-6 h-10 w-full" />
        </Card>
      </div>
    </div>
  );
}

export function StreamDetailView({ id }: { id: string }) {
  const streamId = useMemo(() => {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }, [id]);

  const { address } = useAccount();
  const { nowMs, mounted } = useClock();
  const { stream, isLoading, isError, error, refetch } = useStream(streamId);
  const { data: events = [], isLoading: eventsLoading } = useStreamEvents(streamId);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!streamId) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<FileText className="size-5" />}
          title="That stream ID isn't valid"
          description="Stream identifiers are whole numbers. Check the link and try again."
          action={
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!mounted || isLoading) return <LoadingState />;

  if (isError || !stream) {
    const notFound = `${error ?? ""}`.toLowerCase().includes("streamnotfound");
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<TriangleAlert className="size-5 text-coral" />}
          title={notFound ? "This stream doesn't exist" : "Couldn't load this stream"}
          description={
            notFound
              ? `Stream #${streamId.toString()} was never created on this StreamPay deployment.`
              : "The Aevum RPC didn't answer. Nothing about the stream changed — try again."
          }
          action={
            <div className="flex gap-2">
              <Button asChild variant="secondary">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              {!notFound ? (
                <Button onClick={() => refetch()}>Try again</Button>
              ) : null}
            </div>
          }
        />
      </div>
    );
  }

  const status = streamStatus(stream, nowMs);
  const accrued = accruedAt(stream, nowMs);
  const withdrawable = withdrawableAt(stream, nowMs);
  const progress = progressAt(stream, nowMs);
  const rate = formatRate(stream.amount, Number(stream.endTime - stream.startTime));
  const isSender = isSameAddress(stream.sender, address);
  const isRecipient = isSameAddress(stream.recipient, address);
  const isParty = isSender || isRecipient;
  const cancelledEvent = events.find((event) => event.kind === "cancelled");
  const refunded = cancelledEvent?.senderRefund;
  const leftForRecipient = cancelledEvent?.recipientWithdrawable;
  const shareUrl = `${APP_URL}/streams/${stream.id.toString()}`;
  const tokenUrl = contractUrl();
  const explorerToken = `${QDAY.explorerUrl}/token/${TUSD8.address}`;

  async function handleShare() {
    const ok = await copyText(shareUrl);
    if (!ok) {
      toast.error("Couldn't copy the link.");
      return;
    }
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1_500);
    toast.success("Stream link copied");
  }

  return (
    <div className="container-page py-6 sm:py-9">
      <div className="flex items-center justify-between gap-3 no-print">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors duration-100 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Your streams
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[11.5px] text-muted transition-colors duration-100 hover:border-line-strong hover:text-foreground"
          >
            {copiedLink ? <Check className="size-3.5 text-mint" /> : <Copy className="size-3.5" />}
            {copiedLink ? "Copied" : "Share"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[11.5px] text-muted transition-colors duration-100 hover:border-line-strong hover:text-foreground"
          >
            <Printer className="size-3.5" />
            Receipt
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] font-medium leading-none tracking-[-0.04em] sm:text-[34px]">
              Stream <span className="numeric">#{stream.id.toString()}</span>
            </h1>
            <StatusBadge status={status} />
          </div>
          <p className="mt-2.5 text-[12.5px] text-muted">
            Created {formatDate(stream.createdAt)} ·{" "}
            {isRecipient
              ? "You are the recipient"
              : isSender
                ? "You are the sender"
                : "Public stream view"}
            {status === "cancelled" && stream.cancelledAt > 0n
              ? ` · frozen ${formatDateTime(stream.cancelledAt)}`
              : ""}
          </p>
        </div>
        {isRecipient && status !== "completed" ? (
          <WithdrawStreamButton
            stream={stream}
            nowMs={nowMs}
            size="default"
            className="h-10"
            label={withdrawable === 0n ? "Nothing to withdraw yet" : "Withdraw"}
          />
        ) : null}
        {isParty && (status === "active" || status === "scheduled") ? (
          <CancelStreamDialog stream={stream} nowMs={nowMs} label="Cancel stream" />
        ) : null}
      </div>

      {status === "cancelled" ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-coral/25 bg-coral/[0.06] p-4">
          <CircleSlash className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
          <div className="text-[12.5px] leading-5">
            <p className="font-medium text-coral">This stream was cancelled.</p>
            <p className="mt-0.5 text-muted">
              Accrual stopped at the cancellation block.{" "}
              {refunded != null ? (
                <>
                  <Amount value={refunded} /> returned to the sender and{" "}
                  <Amount value={leftForRecipient} /> remains for the recipient to withdraw.
                </>
              ) : (
                "The recipient can still withdraw any accrued balance."
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
        <div className="space-y-4">
          {/* Live balance -------------------------------------------------- */}
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-[linear-gradient(120deg,rgba(125,226,195,0.06),transparent_55%)] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-faint">
                  <Clock3 className="size-3.5" />
                  {status === "cancelled"
                    ? "Accrued before cancellation"
                    : status === "completed"
                      ? "Fully accrued"
                      : "Accruing live"}
                </p>
                <p className="numeric text-[11px] text-faint">{progress.toFixed(1)}%</p>
              </div>
              <p className="mt-2 text-[38px] font-medium leading-none tracking-[-0.045em] text-foreground sm:text-[46px]">
                <Amount value={accrued} zeroSubscript={false} />
              </p>
              <p className="mt-2 text-[12.5px] text-muted">
                of <Amount value={stream.amount} /> · {rate.value} {rate.unit}
              </p>

              <div className="mt-5">
                <ProgressFlow value={progress} status={status} height="h-2" />
                <TimelineMarks
                  className="mt-2"
                  startLabel={formatDateTime(stream.startTime)}
                  endLabel={formatDateTime(stream.endTime)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">
              <Stat label="Escrowed" value={<Amount value={stream.amount} />} />
              <Stat
                label="Withdrawn"
                value={<Amount value={stream.withdrawn} />}
              />
              <Stat
                label="Withdrawable now"
                value={<Amount value={withdrawable} />}
                tone={withdrawable > 0n ? "mint" : undefined}
              />
              <Stat
                label={
                  status === "cancelled" || status === "completed"
                    ? "Unaccrued"
                    : "Still to accrue"
                }
                value={
                  <Amount
                    value={stream.amount > accrued ? stream.amount - accrued : 0n}
                  />
                }
              />
            </div>

            <div className="border-t border-line px-5 py-3 sm:px-6">
              <p className="flex items-start gap-2 text-[11.5px] leading-5 text-faint">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                Live balances are derived from the chain clock in your browser. The contract
                computes the authoritative amount when a transaction executes.
              </p>
            </div>
          </Card>

          {/* Parties ------------------------------------------------------- */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-[13px] font-medium text-foreground">Parties</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-elevated/40 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                    Sender
                  </p>
                  {isSender ? (
                    <span className="rounded-full border border-line px-1.5 py-0.5 text-[10px] text-muted">
                      you
                    </span>
                  ) : null}
                </div>
                <AddressDisplay
                  address={stream.sender}
                  showAvatar
                  className="mt-2"
                />
              </div>
              <div className="rounded-xl border border-line bg-elevated/40 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">
                    Recipient
                  </p>
                  {isRecipient ? (
                    <span className="rounded-full border border-mint/30 bg-mint/10 px-1.5 py-0.5 text-[10px] text-mint">
                      you
                    </span>
                  ) : null}
                </div>
                <AddressDisplay
                  address={stream.recipient}
                  showAvatar
                  className="mt-2"
                />
              </div>
            </div>

            {!isParty ? (
              <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2.5 text-[11.5px] leading-5 text-muted">
                You&apos;re viewing this stream as an observer. Only the recipient can withdraw
                and only the two parties can cancel.
              </p>
            ) : null}
          </Card>

          {/* History ------------------------------------------------------- */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                <History className="size-4 text-muted" />
                Receipt &amp; history
              </h2>
              {eventsLoading ? (
                <span className="text-[11px] text-faint">Loading…</span>
              ) : (
                <span className="numeric text-[11px] text-faint">
                  {events.length} {events.length === 1 ? "event" : "events"}
                </span>
              )}
            </div>

            {events.length === 0 && !eventsLoading ? (
              <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12px] text-faint">
                No events indexed yet. New activity appears after the next block.
              </p>
            ) : (
              <ol className="mt-5">
                {events.map((event) => (
                  <EventRow
                    key={`${event.txHash}-${event.logIndex}`}
                    event={event}
                    stream={stream}
                  />
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Sidebar ------------------------------------------------------- */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[13px] font-medium text-foreground">Terms</h2>
            <dl className="mt-3 divide-y divide-line text-[12px]">
              <div className="flex items-center justify-between py-2">
                <dt className="text-muted">Total</dt>
                <dd><Amount value={stream.amount} /></dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-muted">Duration</dt>
                <dd>{formatDuration(Number(stream.endTime - stream.startTime))}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-muted">Rate</dt>
                <dd className="numeric">
                  {rate.value} {rate.unit}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-muted">Start</dt>
                <dd>{formatDateTime(stream.startTime)}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-muted">End</dt>
                <dd>{formatDateTime(stream.endTime)}</dd>
              </div>
              {stream.cancelledAt > 0n ? (
                <div className="flex items-center justify-between py-2">
                  <dt className="text-muted">Cancelled</dt>
                  <dd>{formatDateTime(stream.cancelledAt)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-[13px] font-medium text-foreground">Contracts</h2>
            <div className="mt-3 space-y-3 text-[11.5px]">
              <div>
                <p className="text-faint">StreamPay</p>
                <AddressDisplay address={DEPLOYMENT.streamPay} className="mt-1" />
              </div>
              <div>
                <p className="text-faint">tUSD8 token</p>
                <AddressDisplay address={TUSD8.address} className="mt-1" />
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
                {tokenUrl ? (
                  <a
                    href={tokenUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-muted hover:text-foreground"
                  >
                    StreamPay on explorer
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
                <a
                  href={explorerToken}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-muted hover:text-foreground"
                >
                  Token on explorer
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </Card>

          <TestnetNote compact />
        </div>
      </div>
    </div>
  );
}
