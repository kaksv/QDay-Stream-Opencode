import type { Address } from "viem";

export const STREAM_STATUS = {
  ACTIVE: 0,
  COMPLETED: 1,
  CANCELLED: 2,
} as const;

export type OnChainStreamStatus = 0 | 1 | 2;

/** Decoded `StreamView` returned by the contract. uint64 values arrive as bigint. */
export interface Stream {
  id: bigint;
  sender: Address;
  recipient: Address;
  amount: bigint;
  withdrawn: bigint;
  accrued: bigint;
  withdrawable: bigint;
  startTime: bigint;
  endTime: bigint;
  createdAt: bigint;
  cancelledAt: bigint;
  status: OnChainStreamStatus;
}

export type DisplayStatus = "scheduled" | "active" | "completed" | "cancelled";

export type StreamRole = "sender" | "recipient";

export interface StreamEvent {
  kind: "created" | "withdrawal" | "cancelled";
  txHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
  amount?: bigint;
  senderRefund?: bigint;
  recipientWithdrawable?: bigint;
  actor?: Address;
  timestamp?: bigint;
}

export interface DurationUnit {
  label: string;
  short: string;
  seconds: number;
}

export const DURATION_UNITS: DurationUnit[] = [
  { label: "Seconds", short: "sec", seconds: 1 },
  { label: "Minutes", short: "min", seconds: 60 },
  { label: "Hours", short: "hr", seconds: 3_600 },
  { label: "Days", short: "days", seconds: 86_400 },
];

export const DURATION_PRESETS = [
  { label: "1 hour", seconds: 3_600 },
  { label: "1 day", seconds: 86_400 },
  { label: "7 days", seconds: 604_800 },
  { label: "30 days", seconds: 2_592_000 },
] as const;

export const STATUS_META: Record<
  DisplayStatus,
  { label: string; className: string; dot: string }
> = {
  scheduled: {
    label: "Scheduled",
    className: "border-amber/30 bg-amber/10 text-amber",
    dot: "bg-amber",
  },
  active: {
    label: "Accruing",
    className: "border-mint/30 bg-mint/10 text-mint",
    dot: "bg-mint",
  },
  completed: {
    label: "Completed",
    className: "border-info/30 bg-info/10 text-info",
    dot: "bg-info",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-coral/30 bg-coral/10 text-coral",
    dot: "bg-coral",
  },
};
