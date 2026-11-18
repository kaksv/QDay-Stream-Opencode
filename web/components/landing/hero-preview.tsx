"use client";

import { useState } from "react";
import { ArrowDownToLine, Clock3, Sparkles } from "lucide-react";
import { Amount } from "@/components/brand/amount";
import { AddressAvatar } from "@/components/brand/address";
import { ProgressFlow, TimelineMarks } from "@/components/brand/progress";
import { useClock } from "@/lib/providers/clock-provider";
import { accruedAt, progressAt, withdrawableAt } from "@/lib/accrual";
import { formatDateTime, formatDuration, formatRate } from "@/lib/format";
import type { Stream } from "@/lib/types";

const AMOUNT = 600_000_000n; // 600 tUSD8
const DURATION_SECONDS = 3_600;

/**
 * A clock-driven simulation. It never talks to the chain and is labelled as a demo; the
 * numbers use the same accrual math as the contract so the preview stays honest.
 */
export function HeroPreview() {
  const { nowMs, mounted } = useClock();
  // Start 41 minutes in so the hero shows meaningful progress on first paint. The
  // initializer only affects the client; the loading state hides it during hydration.
  const [startMs] = useState(() => Date.now() - 41 * 60 * 1_000);

  if (!mounted) {
    return (
      <div className="relative overflow-hidden rounded-[24px] border border-line-strong bg-surface p-5">
        <div className="h-4 w-32 rounded bg-elevated" />
        <div className="mt-4 h-6 w-40 rounded bg-elevated" />
        <div className="mt-6 h-14 w-56 rounded bg-elevated" />
        <div className="mt-8 h-2 w-full rounded-full bg-elevated" />
        <div className="mt-8 h-11 w-full rounded-[10px] bg-elevated" />
      </div>
    );
  }

  const start = Math.floor(startMs / 1_000);
  const end = start + DURATION_SECONDS;

  const demo: Stream = {
    id: 1042n,
    sender: "0x7a3f1d9e5c2b8a460f1d3e5a7c9b0d2e4f6a8c10",
    recipient: "0x4d2c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c",
    amount: AMOUNT,
    withdrawn: 0n,
    accrued: 0n,
    withdrawable: 0n,
    startTime: BigInt(start),
    endTime: BigInt(end),
    createdAt: BigInt(start),
    cancelledAt: 0n,
    status: 0,
  };

  const accrued = accruedAt(demo, nowMs);
  const withdrawable = withdrawableAt(demo, nowMs);
  const progress = progressAt(demo, nowMs);
  const rate = formatRate(AMOUNT, DURATION_SECONDS);

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 -z-10 rounded-[36px] bg-[radial-gradient(closest-side,rgba(200,241,105,0.14),transparent)] blur-2xl"
      />

      <div className="relative overflow-hidden rounded-[24px] border border-line-strong bg-surface shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-faint">
            <span className="size-1.5 rounded-full bg-mint live-dot" />
            Incoming stream
          </p>
          <span className="inline-flex items-center gap-1 rounded-full border border-amber/25 bg-amber/[0.08] px-2 py-0.5 text-[10px] text-amber">
            <Sparkles className="size-2.5" />
            Simulated
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AddressAvatar address={demo.sender} size={28} />
              <div>
                <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">From</p>
                <p className="numeric text-[12.5px] text-foreground/90">0x7a3f…8c10</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">Stream</p>
              <p className="numeric text-[12.5px] text-foreground/90">#1042</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[11px] text-faint">Withdrawable now</p>
            <p className="mt-1 flex items-baseline gap-2 text-[40px] font-medium leading-none tracking-[-0.045em] text-foreground">
              <Amount value={withdrawable} zeroSubscript={false} symbol={false} />
              <span className="text-[14px] font-normal tracking-normal text-muted">tUSD8</span>
            </p>
            <p className="mt-2 text-[12px] text-muted">
              of <Amount value={AMOUNT} /> · {rate.value} {rate.unit}
            </p>
          </div>

          <div className="mt-5">
            <ProgressFlow value={progress} status="active" height="h-2" />
            <TimelineMarks
              className="mt-2"
              startLabel={formatDateTime(demo.startTime)}
              endLabel={formatDateTime(demo.endTime)}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-elevated/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-faint">Accrued</p>
              <p className="numeric mt-1 text-[15px] text-foreground">
                <Amount value={accrued} />
              </p>
            </div>
            <div className="rounded-xl border border-line bg-elevated/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.08em] text-faint">Duration</p>
              <p className="numeric mt-1 text-[15px] text-foreground">
                {formatDuration(DURATION_SECONDS, true)}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-[14px] font-medium text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]"
            tabIndex={-1}
            aria-hidden="true"
          >
            <ArrowDownToLine className="size-4" />
            Withdraw now
          </button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-faint">
            <Clock3 className="size-3" />
            Demo only · same accrual math as the contract
          </p>
        </div>
      </div>
    </div>
  );
}
