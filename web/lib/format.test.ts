import { describe, expect, it } from "vitest";
import {
  formatCompactCount,
  formatDuration,
  formatPercent,
  formatRate,
  formatTokenAmount,
  parseTokenInput,
  rawAmount,
  trimNumber,
} from "@/lib/format";

describe("formatTokenAmount", () => {
  it("formats whole and fractional token amounts with grouping", () => {
    expect(formatTokenAmount(1_000_000n)).toBe("1 tUSD8");
    expect(formatTokenAmount(1_234_500_000n)).toBe("1,234.5 tUSD8");
    expect(formatTokenAmount(1n)).toBe("0.0₅1 tUSD8");
    expect(formatTokenAmount(1n, { zeroSubscript: false })).toBe("0.000001 tUSD8");
  });

  it("omits the symbol when asked", () => {
    expect(formatTokenAmount(42_000_000n, { symbol: false })).toBe("42");
  });

  it("renders tiny values with a zero subscript", () => {
    expect(formatTokenAmount(1n, { symbol: false })).toBe("0.0₅1");
    expect(formatTokenAmount(12n, { symbol: false })).toBe("0.0₄12");
  });

  it("handles negative values", () => {
    expect(formatTokenAmount(-2_500_000n)).toBe("-2.5 tUSD8");
  });

  it("respects maxFractionDigits", () => {
    expect(
      formatTokenAmount(1_234_567n, { maxFractionDigits: 2, symbol: false }),
    ).toBe("1.23");
  });

  it("compacts large amounts", () => {
    expect(formatTokenAmount(2_500_000_000_000n, { compact: true })).toBe(
      "2.5M tUSD8",
    );
  });

  it("returns a raw decimal string", () => {
    expect(rawAmount(1_234_567n)).toBe("1.234567");
    expect(rawAmount(0n)).toBe("0");
  });
});

describe("parseTokenInput", () => {
  it("parses valid decimal input", () => {
    expect(parseTokenInput("12.5")).toEqual({ value: 12_500_000n, error: null });
    expect(parseTokenInput("1,200")).toEqual({ value: 1_200_000_000n, error: null });
  });

  it("rejects zero, negatives and malformed values", () => {
    expect(parseTokenInput("0").value).toBeNull();
    expect(parseTokenInput("-1").error).toBeTruthy();
    expect(parseTokenInput("abc").error).toBeTruthy();
    expect(parseTokenInput("1.2.3").error).toBeTruthy();
  });

  it("rejects more decimals than the token supports", () => {
    expect(parseTokenInput("1.1234567").error).toContain("6 decimals");
  });

  it("treats an empty field as empty, not invalid", () => {
    expect(parseTokenInput("")).toEqual({ value: null, error: null });
  });
});

describe("formatDuration", () => {
  it("formats seconds, minutes, hours and days", () => {
    expect(formatDuration(45)).toBe("45 sec");
    expect(formatDuration(90)).toBe("1 min 30 sec");
    expect(formatDuration(3_600)).toBe("1 hr");
    expect(formatDuration(90_000)).toBe("1 day 1 hr");
    expect(formatDuration(604_800, true)).toBe("7 days");
  });

  it("treats zero and negatives as zero", () => {
    expect(formatDuration(0)).toBe("0 sec");
    expect(formatDuration(-10)).toBe("0 sec");
  });
});

describe("formatRate", () => {
  it("scales the rate unit for readable numbers", () => {
    expect(formatRate(3_600_000_000n, 3_600)).toEqual({
      value: "1",
      unit: "tUSD8 / sec",
    });
    const perHour = formatRate(30_000_000n, 30 * 86_400);
    expect(perHour.unit).toBe("tUSD8 / hr");
  });

  it("returns a zero rate for invalid durations", () => {
    expect(formatRate(1n, 0)).toEqual({ value: "0", unit: "tUSD8 / sec" });
  });
});

describe("small formatters", () => {
  it("formats counts and percentages", () => {
    expect(formatCompactCount(999)).toBe("999");
    expect(formatCompactCount(1_500)).toBe("1.5K");
    expect(formatPercent(12.345)).toBe("12.35%");
    expect(formatPercent(0.001)).toBe("<0.01%");
  });

  it("trims numbers without scientific notation", () => {
    expect(trimNumber(0.0000123)).toBe("0.000012");
    expect(trimNumber(1234.5678, 2)).toBe("1,234.57");
  });
});
