import type { DisplayStatus, Stream } from "./types";

export function nowSeconds(nowMs: number): bigint {
  return BigInt(Math.floor(nowMs / 1_000));
}

/** Effective chain timestamp, frozen at cancellation. Mirrors StreamPay._accruedAt. */
export function effectiveTime(stream: Stream, nowMs: number): bigint {
  const now = nowSeconds(nowMs);
  if (stream.cancelledAt > 0n && stream.cancelledAt < now) {
    return stream.cancelledAt;
  }
  return now;
}

/**
 * Local mirror of the contract's linear accrual:
 *   amount * clamp(now - start, 0, duration) / duration
 *
 * Display-only. The contract remains authoritative.
 */
export function accruedAt(stream: Stream, nowMs: number): bigint {
  const t = effectiveTime(stream, nowMs);
  if (t <= stream.startTime) return 0n;
  if (t >= stream.endTime) return stream.amount;
  const elapsed = t - stream.startTime;
  const duration = stream.endTime - stream.startTime;
  if (duration <= 0n) return stream.amount;
  return (stream.amount * elapsed) / duration;
}

export function withdrawableAt(stream: Stream, nowMs: number): bigint {
  const accrued = accruedAt(stream, nowMs);
  return accrued > stream.withdrawn ? accrued - stream.withdrawn : 0n;
}

export function streamStatus(stream: Stream, nowMs: number): DisplayStatus {
  if (stream.cancelledAt > 0n) return "cancelled";
  const t = nowSeconds(nowMs);
  if (t >= stream.endTime) return "completed";
  if (t < stream.startTime) return "scheduled";
  return "active";
}

export function progressAt(stream: Stream, nowMs: number): number {
  const t = effectiveTime(stream, nowMs);
  if (t <= stream.startTime) return 0;
  if (t >= stream.endTime) return 100;
  const duration = stream.endTime - stream.startTime;
  if (duration <= 0n) return 100;
  const elapsed = t - stream.startTime;
  return Number((elapsed * 10_000n) / duration) / 100;
}

export function elapsedSeconds(stream: Stream, nowMs: number): number {
  const t = effectiveTime(stream, nowMs);
  if (t <= stream.startTime) return 0;
  return Number(t - stream.startTime);
}

export function durationSeconds(stream: Stream): number {
  return Number(stream.endTime - stream.startTime);
}

/** Tokens per second as a JS number for rate display only. */
export function ratePerSecond(amount: bigint, duration: number): number {
  if (duration <= 0) return 0;
  return Number(amount) / 1_000_000 / duration;
}

export function isActive(stream: Stream, nowMs: number): boolean {
  const status = streamStatus(stream, nowMs);
  return status === "active" || status === "scheduled";
}

export function isParty(stream: Stream, address?: string): boolean {
  if (!address) return false;
  const a = address.toLowerCase();
  return stream.sender.toLowerCase() === a || stream.recipient.toLowerCase() === a;
}
