"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  CheckCircle2,
  CircleSlash,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/brand/amount";
import { TxHash } from "@/components/app/tx-hash";
import { useWithdraw } from "@/lib/hooks/use-withdraw";
import { useCancelStream } from "@/lib/hooks/use-cancel-stream";
import { accruedAt, streamStatus, withdrawableAt } from "@/lib/accrual";
import { TUSD8 } from "@/lib/config";
import { formatDuration, formatTokenAmount } from "@/lib/format";
import type { Stream } from "@/lib/types";
import { cn } from "@/lib/utils";

function StepHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-line bg-elevated/60 p-3.5 text-[12.5px] leading-5 text-muted">
      <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Withdraw                                 */
/* -------------------------------------------------------------------------- */

export function WithdrawStreamButton({
  stream,
  nowMs,
  size = "sm",
  className,
  label = "Withdraw",
}: {
  stream: Stream;
  nowMs: number;
  size?: "sm" | "default";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const { withdraw, reset, step, error, txHash, amount, isBusy } = useWithdraw();
  const estimate = withdrawableAt(stream, nowMs);
  const disabled = estimate === 0n || isBusy;

  function handleOpenChange(next: boolean) {
    if (!next && step === "confirming") return;
    setOpen(next);
    if (!next) reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size={size}
          className={cn("gap-1.5", className)}
          disabled={estimate === 0n}
          title={estimate === 0n ? "Nothing has accrued yet" : undefined}
        >
          <ArrowDownToLine className="size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw from stream #{stream.id.toString()}</DialogTitle>
          <DialogDescription>
            The contract pays the balance accrued up to the block that confirms this
            transaction. The number below is a live estimate.
          </DialogDescription>
        </DialogHeader>

        {step === "success" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-mint/25 bg-mint/[0.08] p-4">
              <p className="flex items-center gap-2 text-[12.5px] text-mint">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Withdrawal confirmed
              </p>
              <p className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                <Amount value={amount ?? estimate} />
              </p>
              <p className="mt-1 text-[12px] text-muted">
                Sent to your wallet. Any remaining accrual stays in the stream.
              </p>
            </div>
            {txHash ? (
              <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                <span className="text-[11.5px] text-faint">Transaction</span>
                <TxHash hash={txHash} />
              </div>
            ) : null}
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-elevated/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
                Estimated withdrawable
              </p>
              <p className="mt-1 text-3xl font-medium tracking-[-0.03em]">
                <Amount value={estimate} zeroSubscript={false} />
              </p>
              <p className="mt-1.5 text-[12px] text-muted">
                Already withdrawn: <Amount value={stream.withdrawn} /> · Accrued so far:{" "}
                <Amount value={accruedAt(stream, nowMs)} />
              </p>
            </div>

            <p className="text-[12.5px] leading-5 text-muted">
              Withdrawals are pull-based: funds sit in the StreamPay contract until you
              claim them. Only this wallet, the recipient, can withdraw.
            </p>

            {step === "signing" || step === "confirming" ? (
              <StepHint>
                {step === "signing"
                  ? "Confirm the withdrawal in your wallet."
                  : "Waiting for the Aevum block to confirm…"}
              </StepHint>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-coral/25 bg-coral/10 px-3 py-2 text-[12.5px] leading-5 text-coral"
              >
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button
                onClick={() => withdraw(stream.id)}
                disabled={disabled}
                className="min-w-32"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Withdrawing…
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="size-4" />
                    Withdraw
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Withdraw all                               */
/* -------------------------------------------------------------------------- */

export function WithdrawAllButton({
  streams,
  nowMs,
  className,
}: {
  streams: Stream[];
  nowMs: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { withdrawMany, reset, step, error, txHash, amount, isBusy } = useWithdraw();

  const candidates = useMemo(
    () =>
      streams
        .filter((stream) => withdrawableAt(stream, nowMs) > 0n)
        .slice(0, 50),
    [streams, nowMs],
  );
  const total = useMemo(
    () => candidates.reduce((sum, stream) => sum + withdrawableAt(stream, nowMs), 0n),
    [candidates, nowMs],
  );

  function handleOpenChange(next: boolean) {
    if (!next && step === "confirming") return;
    setOpen(next);
    if (!next) reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={candidates.length === 0} className={className}>
          <ArrowDownToLine className="size-4" />
          Withdraw all
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Withdraw from {candidates.length}{" "}
            {candidates.length === 1 ? "stream" : "streams"}
          </DialogTitle>
          <DialogDescription>
            One transaction claims every available balance. Streams with nothing accrued
            are skipped automatically.
          </DialogDescription>
        </DialogHeader>

        {step === "success" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-mint/25 bg-mint/[0.08] p-4">
              <p className="flex items-center gap-2 text-[12.5px] text-mint">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Batch withdrawal confirmed
              </p>
              <p className="mt-2 text-2xl font-medium tracking-[-0.03em]">
                <Amount value={amount ?? total} />
              </p>
              <p className="mt-1 text-[12px] text-muted">
                Paid to your wallet in a single tUSD8 transfer.
              </p>
            </div>
            {txHash ? (
              <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                <span className="text-[11.5px] text-faint">Transaction</span>
                <TxHash hash={txHash} />
              </div>
            ) : null}
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-elevated/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
                Estimated total
              </p>
              <p className="mt-1 text-3xl font-medium tracking-[-0.03em]">
                <Amount value={total} zeroSubscript={false} />
              </p>
              <p className="mt-1.5 text-[12px] text-muted">
                Across {candidates.length}{" "}
                {candidates.length === 1 ? "stream" : "streams"}.
              </p>
            </div>

            {candidates.length > 1 ? (
              <ul className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-line p-2">
                {candidates.map((stream) => (
                  <li
                    key={stream.id.toString()}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[12.5px] odd:bg-elevated/40"
                  >
                    <span className="text-muted">Stream #{stream.id.toString()}</span>
                    <Amount value={withdrawableAt(stream, nowMs)} />
                  </li>
                ))}
              </ul>
            ) : null}

            {step === "signing" || step === "confirming" ? (
              <StepHint>
                {step === "signing"
                  ? "Confirm the batch withdrawal in your wallet."
                  : "Waiting for the Aevum block to confirm…"}
              </StepHint>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-coral/25 bg-coral/10 px-3 py-2 text-[12.5px] leading-5 text-coral"
              >
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button
                onClick={() => withdrawMany(candidates.map((stream) => stream.id))}
                disabled={isBusy || candidates.length === 0}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Withdrawing…
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="size-4" />
                    Withdraw {formatTokenAmount(total, { symbol: TUSD8.symbol })}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Cancel                                   */
/* -------------------------------------------------------------------------- */

export function CancelStreamDialog({
  stream,
  nowMs,
  className,
  label = "Cancel stream",
}: {
  stream: Stream;
  nowMs: number;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const {
    cancel,
    reset,
    step,
    error,
    txHash,
    senderRefund,
    recipientWithdrawable,
    isBusy,
  } = useCancelStream();

  const status = streamStatus(stream, nowMs);
  const accrued = accruedAt(stream, nowMs);
  const refund = stream.amount > accrued ? stream.amount - accrued : 0n;
  const keeps = accrued > stream.withdrawn ? accrued - stream.withdrawn : 0n;
  const cancellable = status === "scheduled" || status === "active";

  function handleOpenChange(next: boolean) {
    if (!next && step === "confirming") return;
    setOpen(next);
    if (!next) reset();
  }

  async function handleConfirm() {
    const result = await cancel(stream.id);
    if (!result.ok) return;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          disabled={!cancellable}
          className={cn("gap-1.5 text-muted hover:text-coral", className)}
          title={!cancellable ? "Only streams that have not ended can be cancelled" : undefined}
        >
          <CircleSlash className="size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel stream #{stream.id.toString()}?</DialogTitle>
          <DialogDescription>
            Either party can cancel while the stream is running. Accrual freezes at the
            cancellation block, the sender gets the unaccrued remainder, and the recipient
            keeps everything already accrued.
          </DialogDescription>
        </DialogHeader>

        {step === "success" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-coral/25 bg-coral/[0.07] p-4">
              <p className="flex items-center gap-2 text-[12.5px] text-coral">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Stream cancelled and frozen
              </p>
              <dl className="mt-3 space-y-2 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Returned to sender</dt>
                  <dd>
                    <Amount value={senderRefund ?? refund} />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Left for recipient</dt>
                  <dd>
                    <Amount value={recipientWithdrawable ?? keeps} />
                  </dd>
                </div>
              </dl>
            </div>
            {txHash ? (
              <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                <span className="text-[11.5px] text-faint">Transaction</span>
                <TxHash hash={txHash} />
              </div>
            ) : null}
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-elevated/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
                Estimated split
              </p>
              <dl className="mt-2 space-y-2.5 text-[13px]">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Sender refund</dt>
                  <dd className="font-medium">
                    <Amount value={refund} />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Recipient keeps</dt>
                  <dd className="font-medium">
                    <Amount value={keeps} />
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2.5 text-[12px]">
                  <dt className="text-faint">Original stream</dt>
                  <dd className="text-muted">
                    <Amount value={stream.amount} /> over{" "}
                    {formatDuration(Number(stream.endTime - stream.startTime))}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber/25 bg-amber/[0.07] p-3.5 text-[12px] leading-5 text-amber">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                The final split is fixed by the cancellation block timestamp and may differ
                by a few seconds of accrual from this preview. This cannot be undone.
              </span>
            </div>

            {step === "signing" || step === "confirming" ? (
              <StepHint>
                {step === "signing"
                  ? "Confirm the cancellation in your wallet."
                  : "Waiting for the Aevum block to confirm…"}
              </StepHint>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-coral/25 bg-coral/10 px-3 py-2 text-[12.5px] leading-5 text-coral"
              >
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={isBusy}
              >
                Keep stream
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={isBusy}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  <>
                    <CircleSlash className="size-4" />
                    Cancel stream
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Compact row                                */
/* -------------------------------------------------------------------------- */

export function InlineWithdraw({
  stream,
  nowMs,
}: {
  stream: Stream;
  nowMs: number;
}) {
  const value = withdrawableAt(stream, nowMs);
  if (value === 0n) return null;
  return <WithdrawStreamButton stream={stream} nowMs={nowMs} size="sm" />;
}
