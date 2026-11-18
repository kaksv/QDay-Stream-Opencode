import { describe, expect, it } from "vitest";
import {
  resolveSubmissionWindow,
  START_BUFFER_SECONDS,
} from "@/lib/time";

const NOW_MS = 1_700_000_000_000; // 1_700_000_000 seconds

describe("resolveSubmissionWindow", () => {
  it("starts an immediate stream after the buffer and honours the duration", () => {
    const result = resolveSubmissionWindow({
      nowMs: NOW_MS,
      scheduledStart: null,
      durationSeconds: 3_600,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.startTime).toBe(BigInt(1_700_000_000 + START_BUFFER_SECONDS));
    expect(result.endTime - result.startTime).toBe(3_600n);
  });

  it("recomputes the immediate start from the latest clock reading", () => {
    const first = resolveSubmissionWindow({
      nowMs: NOW_MS,
      scheduledStart: null,
      durationSeconds: 60,
    });
    const later = resolveSubmissionWindow({
      nowMs: NOW_MS + 45_000,
      scheduledStart: null,
      durationSeconds: 60,
    });

    expect(first.ok && later.ok).toBe(true);
    if (!first.ok || !later.ok) return;
    expect(later.startTime - first.startTime).toBe(45n);
  });

  it("keeps a scheduled start that is still in the future", () => {
    const scheduledStart = BigInt(1_700_000_000 + 600);
    const result = resolveSubmissionWindow({
      nowMs: NOW_MS,
      scheduledStart,
      durationSeconds: 300,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.startTime).toBe(scheduledStart);
    expect(result.endTime).toBe(scheduledStart + 300n);
  });

  it("rejects a scheduled start that passed while signing", () => {
    const result = resolveSubmissionWindow({
      nowMs: NOW_MS,
      scheduledStart: BigInt(1_700_000_000 - 1),
      durationSeconds: 300,
    });

    expect(result).toEqual({ ok: false, error: "scheduled-start-passed" });
  });

  it("rejects a start too close to the current block", () => {
    const result = resolveSubmissionWindow({
      nowMs: NOW_MS,
      scheduledStart: BigInt(1_700_000_000 + 3),
      durationSeconds: 300,
    });

    expect(result).toEqual({ ok: false, error: "scheduled-start-passed" });
  });

  it("rejects a non-positive duration", () => {
    expect(
      resolveSubmissionWindow({
        nowMs: NOW_MS,
        scheduledStart: null,
        durationSeconds: 0,
      }),
    ).toEqual({ ok: false, error: "invalid-duration" });
  });
});
