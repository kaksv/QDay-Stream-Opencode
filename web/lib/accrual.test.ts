import { describe, expect, it } from "vitest";
import {
  accruedAt,
  durationSeconds,
  effectiveTime,
  elapsedSeconds,
  isActive,
  isParty,
  progressAt,
  ratePerSecond,
  streamStatus,
  withdrawableAt,
} from "@/lib/accrual";
import type { Stream } from "@/lib/types";

const START = 1_700_000_000;
const END = START + 3_600;

function makeStream(overrides: Partial<Stream> = {}): Stream {
  return {
    id: 1n,
    sender: "0x1111111111111111111111111111111111111111",
    recipient: "0x2222222222222222222222222222222222222222",
    amount: 3_600_000_000n, // 3,600 tUSD8 over one hour = 1 per second
    withdrawn: 0n,
    accrued: 0n,
    withdrawable: 0n,
    startTime: BigInt(START),
    endTime: BigInt(END),
    createdAt: BigInt(START),
    cancelledAt: 0n,
    status: 0,
    ...overrides,
  };
}

function at(seconds: number) {
  return seconds * 1_000;
}

describe("accruedAt", () => {
  it("is zero before the start", () => {
    expect(accruedAt(makeStream(), at(START - 10))).toBe(0n);
  });

  it("is zero exactly at the start", () => {
    expect(accruedAt(makeStream(), at(START))).toBe(0n);
  });

  it("accrues linearly", () => {
    const stream = makeStream();
    expect(accruedAt(stream, at(START + 1))).toBe(1_000_000n);
    expect(accruedAt(stream, at(START + 30))).toBe(30_000_000n);
    expect(accruedAt(stream, at(START + 1_800))).toBe(1_800_000_000n);
  });

  it("caps at the full amount after the end", () => {
    const stream = makeStream();
    expect(accruedAt(stream, at(END))).toBe(stream.amount);
    expect(accruedAt(stream, at(END + 10_000))).toBe(stream.amount);
  });

  it("freezes accrual at cancellation", () => {
    const cancelledAt = START + 600;
    const stream = makeStream({ cancelledAt: BigInt(cancelledAt) });
    expect(accruedAt(stream, at(cancelledAt + 500))).toBe(600_000_000n);
    expect(effectiveTime(stream, at(cancelledAt + 500))).toBe(BigInt(cancelledAt));
  });
});

describe("withdrawableAt", () => {
  it("subtracts what was already withdrawn", () => {
    const stream = makeStream({ withdrawn: 500_000_000n });
    expect(withdrawableAt(stream, at(START + 600))).toBe(100_000_000n);
  });

  it("never returns a negative balance", () => {
    const stream = makeStream({ withdrawn: 900_000_000n });
    expect(withdrawableAt(stream, at(START + 600))).toBe(0n);
  });
});

describe("streamStatus", () => {
  it("reports scheduled, active, completed and cancelled", () => {
    const stream = makeStream();
    expect(streamStatus(stream, at(START - 1))).toBe("scheduled");
    expect(streamStatus(stream, at(START))).toBe("active");
    expect(streamStatus(stream, at(END - 1))).toBe("active");
    expect(streamStatus(stream, at(END))).toBe("completed");
    expect(
      streamStatus(makeStream({ cancelledAt: BigInt(START + 10) }), at(START + 20)),
    ).toBe("cancelled");
  });
});

describe("progressAt", () => {
  it("moves from 0 to 100", () => {
    const stream = makeStream();
    expect(progressAt(stream, at(START - 100))).toBe(0);
    expect(progressAt(stream, at(START + 900))).toBe(25);
    expect(progressAt(stream, at(START + 2_700))).toBe(75);
    expect(progressAt(stream, at(END + 1))).toBe(100);
  });

  it("freezes at cancellation", () => {
    const stream = makeStream({ cancelledAt: BigInt(START + 1_800) });
    expect(progressAt(stream, at(START + 3_000))).toBe(50);
  });
});

describe("helpers", () => {
  it("computes elapsed, duration and rate", () => {
    const stream = makeStream();
    expect(durationSeconds(stream)).toBe(3_600);
    expect(elapsedSeconds(stream, at(START + 120))).toBe(120);
    expect(elapsedSeconds(stream, at(START - 120))).toBe(0);
    expect(ratePerSecond(stream.amount, 3_600)).toBeCloseTo(1);
  });

  it("identifies active streams and parties", () => {
    const stream = makeStream();
    expect(isActive(stream, at(START + 10))).toBe(true);
    expect(isActive(stream, at(END + 10))).toBe(false);
    expect(isParty(stream, stream.sender.toUpperCase())).toBe(true);
    expect(isParty(stream, stream.recipient)).toBe(true);
    expect(
      isParty(stream, "0x3333333333333333333333333333333333333333"),
    ).toBe(false);
  });
});
