"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Droplets,
  Fuel,
  Info,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { isAddress, type Address } from "viem";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Amount } from "@/components/brand/amount";
import { TestnetNote } from "@/components/brand/testnet";
import { ConnectGate } from "@/components/app/connect-gate";
import { TxHash } from "@/components/app/tx-hash";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateStream, type CreateMode } from "@/lib/hooks/use-create-stream";
import { useTokenBalance, useGasBalance } from "@/lib/hooks/use-streams";
import { useClock } from "@/lib/providers/clock-provider";
import { DURATION_PRESETS, DURATION_UNITS } from "@/lib/types";
import {
  formatAmountInput,
  formatDateTime,
  formatDuration,
  formatTokenAmount,
  parseTokenInput,
} from "@/lib/format";
import { QDAY, TUSD8, IS_CONTRACT_CONFIGURED } from "@/lib/config";
import { isSameAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

const START_BUFFER_SECONDS = 20;
const MIN_SCHEDULE_BUFFER_SECONDS = 15;

function nowUnix(nowMs: number) {
  return Math.floor((nowMs || Date.now()) / 1_000);
}

function SectionTitle({
  step,
  title,
  hint,
}: {
  step: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="numeric mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-[11px] text-muted">
        {step}
      </span>
      <div>
        <h2 className="text-[14px] font-medium tracking-[-0.01em] text-foreground">
          {title}
        </h2>
        {hint ? <p className="mt-0.5 text-[12px] leading-5 text-faint">{hint}</p> : null}
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-[12.5px]">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-foreground/90">{children}</dd>
    </div>
  );
}

export function CreateStreamForm() {
  const { address, isConnected, chainId } = useAccount();
  const { nowMs } = useClock();
  const { balance } = useTokenBalance(address);
  const gas = useGasBalance(address);
  const {
    create,
    reset,
    step,
    error,
    txHash,
    streamId,
    isBusy,
  } = useCreateStream();

  const [recipient, setRecipient] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [unitIndex, setUnitIndex] = useState(2);
  const [durationValue, setDurationValue] = useState("24");
  const [startMode, setStartMode] = useState<"now" | "scheduled">("now");
  const [startInput, setStartInput] = useState("");
  const [mode, setMode] = useState<CreateMode>("permit");
  const [reviewOpen, setReviewOpen] = useState(false);

  function selectScheduledStart() {
    setStartMode("scheduled");
    if (!startInput) {
      const date = new Date((nowUnix(nowMs) + 3_600) * 1_000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setStartInput(
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`,
      );
    }
  }

  const parsed = parseTokenInput(amountInput);
  const amount = parsed.value;
  const unit = DURATION_UNITS[unitIndex];
  const durationCount = Number(durationValue);
  const durationSeconds =
    Number.isFinite(durationCount) && durationCount > 0
      ? Math.floor(durationCount * unit.seconds)
      : 0;

  const scheduledStart = useMemo(() => {
    if (startMode !== "scheduled" || !startInput) return null;
    const ms = new Date(startInput).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1_000) : null;
  }, [startMode, startInput]);

  const startTimePreview =
    startMode === "now"
      ? nowUnix(nowMs) + START_BUFFER_SECONDS
      : scheduledStart;
  const endTimePreview =
    startTimePreview != null && durationSeconds > 0
      ? startTimePreview + durationSeconds
      : null;

  const recipientError = useMemo(() => {
    if (!recipient) return null;
    if (!isAddress(recipient.trim())) return "That doesn't look like an EVM address.";
    if (address && isSameAddress(recipient, address)) {
      return "You can't stream to your own wallet.";
    }
    if (/^0x0{40}$/i.test(recipient.trim())) return "Use a real recipient address.";
    return null;
  }, [recipient, address]);

  const durationError = useMemo(() => {
    if (!durationValue.trim()) return "Enter a duration.";
    if (!Number.isFinite(durationCount) || durationCount <= 0) {
      return "Duration must be greater than zero.";
    }
    if (durationSeconds < 1) return "Duration must be at least one second.";
    return null;
  }, [durationCount, durationSeconds, durationValue]);

  const startError = useMemo(() => {
    if (startMode !== "scheduled") return null;
    if (scheduledStart == null) return "Choose a start date and time.";
    if (scheduledStart < nowUnix(nowMs) + MIN_SCHEDULE_BUFFER_SECONDS) {
      return "Scheduled starts must be at least a few seconds in the future.";
    }
    return null;
  }, [startMode, scheduledStart, nowMs]);

  const balanceError =
    amount != null && balance != null && amount > balance
      ? `You only have ${formatTokenAmount(balance)}. Claim more from the QDay faucet.`
      : null;

  const formValid =
    Boolean(address) &&
    isConnected &&
    chainId === QDAY.chainId &&
    IS_CONTRACT_CONFIGURED &&
    Boolean(recipient) &&
    !recipientError &&
    amount != null &&
    !parsed.error &&
    !balanceError &&
    !durationError &&
    !startError;

  const perSecond = amount != null && durationSeconds > 0
    ? Number(amount) / 1_000_000 / durationSeconds
    : 0;

  function resolvedTimes(): { startTime: bigint; endTime: bigint } | null {
    if (!formValid) return null;
    const start =
      startMode === "now"
        ? BigInt(nowUnix(nowMs) + START_BUFFER_SECONDS)
        : BigInt(scheduledStart as number);
    const end = start + BigInt(durationSeconds);
    return { startTime: start, endTime: end };
  }

  function handleReview() {
    if (!formValid) {
      if (!recipientError && !recipient) toast.error("Add a recipient address.");
      else if (parsed.error) toast.error(parsed.error);
      else if (balanceError) toast.error("Amount exceeds your balance", { description: balanceError });
      else if (durationError) toast.error(durationError);
      else if (startError) toast.error(startError);
      else toast.error("Finish the form before reviewing.");
      return;
    }
    reset();
    setReviewOpen(true);
  }

  async function handleCreate() {
    const times = resolvedTimes();
    if (!address || !amount || !times) return;
    const result = await create({
      recipient: recipient.trim() as Address,
      amount,
      startTime: times.startTime,
      endTime: times.endTime,
      mode,
    });
    if (!result.ok) return;
  }

  function handleClose(next: boolean) {
    if (!next && isBusy) return;
    setReviewOpen(next);
    if (!next && step === "success") {
      reset();
      setRecipient("");
      setAmountInput("");
    }
  }

  if (!isConnected || !address) {
    return (
      <div className="container-page py-8 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-[30px] font-medium tracking-[-0.04em] sm:text-[36px]">
            Create a stream
          </h1>
          <p className="mt-2 max-w-xl text-[13.5px] leading-6 text-muted">
            Fund the full amount once. It unlocks to the recipient every second, and you can
            cancel to recover whatever hasn&apos;t accrued.
          </p>
          <ConnectGate
            className="mt-8"
            title="Connect a wallet to create a stream"
            description="You'll choose a recipient, an amount, and a duration. The stream is funded upfront from your tUSD8 balance."
          />
          <TestnetNote className="mx-auto mt-6 max-w-xl" />
        </div>
      </div>
    );
  }

  const wrongNetwork = chainId !== QDAY.chainId;
  const noGas = gas.data != null && gas.data.value === 0n;

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-7">
        <h1 className="text-[30px] font-medium tracking-[-0.04em] sm:text-[36px]">
          Create a stream
        </h1>
        <p className="mt-2 max-w-xl text-[13.5px] leading-6 text-muted">
          The full amount is escrowed when you confirm. Accrual is linear and computed from
          block timestamps — no per-second transactions.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-5">
          {/* Recipient ------------------------------------------------------- */}
          <Card className="p-5 sm:p-6">
            <SectionTitle
              step="01"
              title="Recipient"
              hint="Any EVM address on Aevum. It doesn't need to be registered."
            />
            <div className="mt-4">
              <Label htmlFor="recipient">Wallet address</Label>
              <Input
                id="recipient"
                className="numeric mt-2"
                placeholder="0x…"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value.trim())}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={Boolean(recipientError)}
                aria-describedby={recipientError ? "recipient-error" : undefined}
              />
              <div className="mt-1.5 flex min-h-5 items-center justify-between gap-2">
                <FieldError id="recipient-error">{recipientError}</FieldError>
                {recipient && !recipientError ? (
                  <span className="text-[11.5px] text-mint">Valid address</span>
                ) : null}
              </div>
            </div>
          </Card>

          {/* Amount ---------------------------------------------------------- */}
          <Card className="p-5 sm:p-6">
            <SectionTitle
              step="02"
              title="Amount"
              hint={`Paid in ${TUSD8.symbol}, the QDay test stablecoin.`}
            />
            <div className="mt-4">
              <div className="flex items-end justify-between gap-3">
                <Label htmlFor="amount">Total to stream</Label>
                <span className="numeric text-[11.5px] text-faint">
                  Balance: <Amount value={balance} />
                </span>
              </div>
              <div className="relative mt-2">
                <Input
                  id="amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className="numeric h-14 pr-24 text-[22px] tracking-[-0.02em]"
                  aria-invalid={Boolean(parsed.error || balanceError)}
                  aria-describedby="amount-error"
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (balance != null) setAmountInput(formatAmountInput(balance));
                    }}
                    className="rounded-md px-2 py-1 text-[11.5px] font-medium text-primary transition-colors duration-100 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    MAX
                  </button>
                  <span className="pr-1 text-[12px] text-muted">{TUSD8.symbol}</span>
                </div>
              </div>
              <div className="mt-1.5 min-h-5">
                <FieldError id="amount-error">{parsed.error ?? balanceError}</FieldError>
              </div>
              {balance != null && balance === 0n ? (
                <a
                  href={QDAY.faucetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-amber underline decoration-amber/30 underline-offset-4 hover:decoration-amber"
                >
                  <Droplets className="size-3.5" />
                  Your tUSD8 balance is zero — claim test tokens
                </a>
              ) : null}
            </div>
          </Card>

          {/* Duration -------------------------------------------------------- */}
          <Card className="p-5 sm:p-6">
            <SectionTitle
              step="03"
              title="Duration"
              hint="Choose the unit and how long the stream should run."
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
              <div>
                <Label htmlFor="duration">Length</Label>
                <Input
                  id="duration"
                  className="numeric mt-2"
                  inputMode="decimal"
                  value={durationValue}
                  onChange={(event) => setDurationValue(event.target.value)}
                  aria-invalid={Boolean(durationError)}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <div className="mt-2 grid grid-cols-4 gap-1 rounded-[10px] border border-line bg-elevated p-1">
                  {DURATION_UNITS.map((item, index) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setUnitIndex(index)}
                      className={cn(
                        "h-8 rounded-[7px] text-[11.5px] font-medium transition-colors duration-100",
                        unitIndex === index
                          ? "bg-surface text-foreground shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]"
                          : "text-faint hover:text-foreground",
                      )}
                      aria-pressed={unitIndex === index}
                    >
                      {item.short}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {DURATION_PRESETS.map((preset) => {
                const active = durationSeconds === preset.seconds;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const matchingUnit = DURATION_UNITS.findIndex(
                        (candidate) => preset.seconds % candidate.seconds === 0,
                      );
                      for (let i = DURATION_UNITS.length - 1; i >= 0; i -= 1) {
                        if (preset.seconds % DURATION_UNITS[i].seconds === 0) {
                          setUnitIndex(i);
                          setDurationValue(String(preset.seconds / DURATION_UNITS[i].seconds));
                          break;
                        }
                      }
                      void matchingUnit;
                    }}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors duration-100",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-line text-muted hover:border-line-strong hover:text-foreground",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
              {durationSeconds > 0 ? (
                <span className="numeric ml-auto text-[11.5px] text-faint">
                  {formatDuration(durationSeconds)}
                </span>
              ) : null}
            </div>
            <FieldError>{durationError}</FieldError>
          </Card>

          {/* Start ----------------------------------------------------------- */}
          <Card className="p-5 sm:p-6">
            <SectionTitle
              step="04"
              title="Start"
              hint="Start now after confirmation, or schedule a future start."
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setStartMode("now")}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors duration-100",
                  startMode === "now"
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-line bg-elevated/40 hover:border-line-strong",
                )}
                aria-pressed={startMode === "now"}
              >
                <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block text-[13px] font-medium">Start now</span>
                  <span className="mt-0.5 block text-[11.5px] leading-5 text-faint">
                    Begins at the next block after confirmation.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={selectScheduledStart}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors duration-100",
                  startMode === "scheduled"
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-line bg-elevated/40 hover:border-line-strong",
                )}
                aria-pressed={startMode === "scheduled"}
              >
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden="true" />
                <span>
                  <span className="block text-[13px] font-medium">Schedule</span>
                  <span className="mt-0.5 block text-[11.5px] leading-5 text-faint">
                    Nothing accrues until the chosen time.
                  </span>
                </span>
              </button>
            </div>
            {startMode === "scheduled" ? (
              <div className="mt-3">
                <Label htmlFor="start">Start date and time</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  className="mt-2 max-w-xs"
                  value={startInput}
                  onChange={(event) => setStartInput(event.target.value)}
                  aria-invalid={Boolean(startError)}
                />
                <FieldError>{startError}</FieldError>
              </div>
            ) : null}
          </Card>

          {/* Method ---------------------------------------------------------- */}
          <Card className="p-5 sm:p-6">
            <SectionTitle
              step="05"
              title="Approval method"
              hint="tUSD8 supports EIP-2612 permits. Permit saves a transaction."
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("permit")}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors duration-100",
                  mode === "permit"
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-line bg-elevated/40 hover:border-line-strong",
                )}
                aria-pressed={mode === "permit"}
              >
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  <Sparkles className="size-4 text-primary" aria-hidden="true" />
                  Sign &amp; create
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.06em] text-primary">
                    one tx
                  </span>
                </span>
                <span className="mt-1 block text-[11.5px] leading-5 text-faint">
                  Sign a gasless permit, then submit one transaction.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("approve")}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors duration-100",
                  mode === "approve"
                    ? "border-primary/40 bg-primary/[0.06]"
                    : "border-line bg-elevated/40 hover:border-line-strong",
                )}
                aria-pressed={mode === "approve"}
              >
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  <ShieldCheck className="size-4 text-mint" aria-hidden="true" />
                  Approve first
                </span>
                <span className="mt-1 block text-[11.5px] leading-5 text-faint">
                  Standard ERC-20 approval, then a second transaction.
                </span>
              </button>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-5 text-faint">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Some hardware wallets can&apos;t sign typed data. Choose Approve first if the
              permit signature fails.
            </p>
          </Card>

          <TestnetNote />
        </div>

        {/* Sticky summary -------------------------------------------------- */}
        <div className="lg:sticky lg:top-20">
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-elevated/30 p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
                Stream summary
              </p>
              <p className="mt-2 text-[32px] font-medium leading-none tracking-[-0.04em]">
                <Amount value={amount} zeroSubscript={false} />
              </p>
              <p className="mt-1.5 text-[12px] text-muted">
                {durationSeconds > 0 ? (
                  <>over {formatDuration(durationSeconds)}</>
                ) : (
                  "Set an amount and duration"
                )}
              </p>
            </div>

            <dl className="divide-y divide-line px-5">
              <ReviewRow label="Rate">
                {durationSeconds > 0 && perSecond > 0 ? (
                  <span className="numeric">
                    {perSecond >= 0.01
                      ? `${perSecond.toFixed(2)} ${TUSD8.symbol}/sec`
                      : `${(perSecond * 86_400).toFixed(2)} ${TUSD8.symbol}/day`}
                  </span>
                ) : (
                  "—"
                )}
              </ReviewRow>
              <ReviewRow label="Starts">
                {startTimePreview != null ? formatDateTime(startTimePreview) : "—"}
              </ReviewRow>
              <ReviewRow label="Ends">
                {endTimePreview != null ? formatDateTime(endTimePreview) : "—"}
              </ReviewRow>
              <ReviewRow label="Recipient">
                <span className="numeric">
                  {recipient && !recipientError
                    ? `${recipient.slice(0, 6)}…${recipient.slice(-4)}`
                    : "—"}
                </span>
              </ReviewRow>
              <ReviewRow label="Network">
                <span className="text-muted">{QDAY.name}</span>
              </ReviewRow>
              <ReviewRow label="Approval">
                <span className="text-muted">
                  {mode === "permit" ? "Permit signature" : "ERC-20 approval"}
                </span>
              </ReviewRow>
            </dl>

            <div className="p-5">
              {wrongNetwork ? (
                <p className="mb-3 rounded-lg border border-amber/25 bg-amber/[0.07] px-3 py-2 text-[12px] leading-5 text-amber">
                  Switch to {QDAY.name} (chain {QDAY.chainId}) to continue.
                </p>
              ) : null}
              {noGas ? (
                <p className="mb-3 flex items-start gap-1.5 rounded-lg border border-amber/25 bg-amber/[0.07] px-3 py-2 text-[12px] leading-5 text-amber">
                  <Fuel className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  Your tQDAY gas balance is zero.{" "}
                  <a
                    href={QDAY.faucetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    Claim gas
                  </a>
                </p>
              ) : null}
              {!IS_CONTRACT_CONFIGURED ? (
                <p className="mb-3 rounded-lg border border-coral/25 bg-coral/10 px-3 py-2 text-[12px] leading-5 text-coral">
                  This build has no StreamPay contract address configured.
                </p>
              ) : null}

              <Button
                size="lg"
                className="w-full"
                onClick={handleReview}
                disabled={!formValid}
              >
                Review stream
                <ArrowRight className="size-4" />
              </Button>
              <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-faint">
                <Wallet className="size-3" aria-hidden="true" />
                Funds leave your wallet only when you confirm
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={handleClose}>
        <DialogContent>
          {step === "success" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-mint" />
                  Stream created
                </DialogTitle>
                <DialogDescription>
                  {amount != null ? formatTokenAmount(amount) : "Your stream"} is now
                  accruing to the recipient. The contract holds the full amount.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-mint/25 bg-mint/[0.07] p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-mint/80">
                  Stream ID
                </p>
                <p className="numeric mt-1 text-2xl font-medium">
                  #{streamId?.toString() ?? "—"}
                </p>
                {txHash ? (
                  <div className="mt-3 flex items-center justify-between border-t border-mint/15 pt-2.5 text-[11.5px]">
                    <span className="text-muted">Transaction</span>
                    <TxHash hash={txHash} />
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => handleClose(false)}>
                  Create another
                </Button>
                {streamId != null ? (
                  <Button asChild>
                    <Link href={`/streams/${streamId.toString()}`}>
                      Open stream
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/dashboard">Go to dashboard</Link>
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {mode === "permit" ? "Sign and create stream" : "Approve and create stream"}
                </DialogTitle>
                <DialogDescription>
                  {mode === "permit"
                    ? "First sign a permit in your wallet, then confirm the create transaction. Two prompts, one on-chain transaction."
                    : "First approve the exact amount, then create the stream. Two on-chain transactions."}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-line bg-elevated/50 p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
                  You are funding
                </p>
                <p className="mt-1 text-3xl font-medium tracking-[-0.03em]">
                  <Amount value={amount} zeroSubscript={false} />
                </p>
                <dl className="mt-3 space-y-1.5 border-t border-line pt-2.5 text-[12.5px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Recipient</dt>
                    <dd className="numeric">{recipient.slice(0, 10)}…{recipient.slice(-8)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Duration</dt>
                    <dd>{formatDuration(durationSeconds)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Starts</dt>
                    <dd>
                      {startTimePreview != null
                        ? formatDateTime(startTimePreview)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Ends</dt>
                    <dd>{endTimePreview != null ? formatDateTime(endTimePreview) : "—"}</dd>
                  </div>
                </dl>
              </div>

              <p className="text-[12px] leading-5 text-muted">
                The stream is non-custodial: the contract escrows the funds and the recipient
                withdraws directly. Cancel before the end to recover the unaccrued remainder.
              </p>

              {step !== "idle" && step !== "error" ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-line bg-elevated/60 p-3.5 text-[12.5px] leading-5 text-muted">
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                  <span>
                    {step === "signing"
                      ? mode === "permit"
                        ? "Confirm the permit signature in your wallet."
                        : "Approving tUSD8 in your wallet…"
                      : step === "approving"
                        ? "Waiting for the approval to confirm…"
                        : step === "submitting"
                          ? "Confirm the stream transaction in your wallet."
                          : "Waiting for the Aevum block to confirm…"}
                  </span>
                </div>
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
                  onClick={() => handleClose(false)}
                  disabled={isBusy}
                >
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={isBusy || !formValid}>
                  {isBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Fund &amp; create
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
