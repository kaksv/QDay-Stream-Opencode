/**
 * Submission-time helpers.
 *
 * The contract rejects a stream whose start time is in the past
 * (`StartTimeInPast`). Wallet prompts take time, so the start is resolved as
 * late as possible — after any permit signature or approval — and "start now"
 * gets a small forward buffer instead of reusing a preview timestamp.
 */

/** Forward slack for an immediate stream, in seconds. */
export const START_BUFFER_SECONDS = 20;

/** Smallest lead for a user-chosen start, in seconds. */
const MIN_SCHEDULE_LEAD_SECONDS = 5n;

export type SubmissionWindow =
  | { ok: true; startTime: bigint; endTime: bigint }
  | { ok: false; error: "invalid-duration" | "scheduled-start-passed" };

export function resolveSubmissionWindow({
  nowMs,
  scheduledStart,
  durationSeconds,
  bufferSeconds = START_BUFFER_SECONDS,
}: {
  /** Current clock time in milliseconds (chain-corrected where available). */
  nowMs: number;
  /** Absolute start for a scheduled stream, or null for "start now". */
  scheduledStart: bigint | null;
  /** Requested stream length in seconds. */
  durationSeconds: number;
  bufferSeconds?: number;
}): SubmissionWindow {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 1) {
    return { ok: false, error: "invalid-duration" };
  }

  const nowSeconds = BigInt(Math.floor(nowMs / 1_000));

  let startTime: bigint;
  if (scheduledStart == null) {
    startTime = nowSeconds + BigInt(bufferSeconds);
  } else {
    if (scheduledStart <= nowSeconds + MIN_SCHEDULE_LEAD_SECONDS) {
      return { ok: false, error: "scheduled-start-passed" };
    }
    startTime = scheduledStart;
  }

  return {
    ok: true,
    startTime,
    endTime: startTime + BigInt(Math.floor(durationSeconds)),
  };
}
