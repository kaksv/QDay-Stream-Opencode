import { formatUnits, parseUnits } from "viem";
import { TUSD8 } from "./config";

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
};

function group(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function trimFraction(fraction: string, min: number): string {
  let f = fraction.replace(/0+$/, "");
  if (f.length < min) f = fraction.slice(0, min);
  return f;
}

function subscript(value: string): string {
  return value
    .split("")
    .map((d) => SUBSCRIPT_DIGITS[d] ?? d)
    .join("");
}

/** Stable token display with exact bigint math. No scientific notation, ever. */
export function formatTokenAmount(
  value: bigint,
  options: {
    decimals?: number;
    maxFractionDigits?: number;
    minFractionDigits?: number;
    compact?: boolean;
    symbol?: string | false;
    zeroSubscript?: boolean;
  } = {},
): string {
  const {
    decimals = TUSD8.decimals,
    maxFractionDigits = 6,
    minFractionDigits = 0,
    compact = false,
    symbol = TUSD8.symbol,
    zeroSubscript = true,
  } = options;

  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);

  if (compact) {
    const units: Array<{ threshold: bigint; suffix: string }> = [
      { threshold: 1_000_000_000_000n, suffix: "T" },
      { threshold: 1_000_000_000n, suffix: "B" },
      { threshold: 1_000_000n, suffix: "M" },
      { threshold: 1_000n, suffix: "K" },
    ];
    for (const { threshold, suffix } of units) {
      if (abs >= threshold * base) {
        // One decimal, computed with integers, then trimmed.
        const tenths = (abs * 10n) / (threshold * base);
        const whole = tenths / 10n;
        const frac = tenths % 10n;
        const text =
          frac === 0n ? whole.toString() : `${whole}.${frac.toString()}`;
        return `${negative ? "-" : ""}${text}${suffix}${symbol ? ` ${symbol}` : ""}`;
      }
    }
  }

  const whole = abs / base;
  const remainder = abs % base;
  const fullFraction = remainder.toString().padStart(decimals, "0");
  const fraction = trimFraction(
    fullFraction.slice(0, maxFractionDigits),
    Math.min(minFractionDigits, maxFractionDigits),
  );

  const equallyZero = abs === 0n;

  let number: string;
  if (
    zeroSubscript &&
    !equallyZero &&
    whole === 0n &&
    fullFraction.startsWith("000")
  ) {
    const leadingZeros = fullFraction.match(/^0*/)?.[0].length ?? 0;
    const sig = fullFraction.slice(leadingZeros).replace(/0+$/, "");
    const sigDigits = sig.slice(0, 4);
    if (sigDigits.length > 0) {
      number = `0.0${subscript(String(leadingZeros))}${sigDigits}`;
    } else {
      number = "0";
    }
  } else {
    number = `${group(whole.toString())}${fraction ? `.${fraction}` : ""}`;
  }

  return `${negative ? "-" : ""}${number}${symbol ? ` ${symbol}` : ""}`;
}

/** Unformatted exact decimal string, for copy/export. */
export function rawAmount(value: bigint, decimals = TUSD8.decimals): string {
  return formatUnits(value, decimals);
}

export function formatCompactCount(value: number | bigint): string {
  const n = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `${trimNumber(n / 1_000_000_000, 1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${trimNumber(n / 1_000_000, 1)}M`;
  if (Math.abs(n) >= 1_000) return `${trimNumber(n / 1_000, 1)}K`;
  return Math.round(n).toLocaleString("en-US");
}

export function trimNumber(value: number, maxFractionDigits = 6): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  if (Math.abs(value) < 10 ** -maxFractionDigits && value !== 0) {
    return `<${10 ** -maxFractionDigits}`;
  }
  return value.toLocaleString("en-US", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
    useGrouping: true,
  });
}

export function formatRate(
  amount: bigint,
  duration: number,
  symbol = TUSD8.symbol,
): { value: string; unit: string } {
  if (duration <= 0) return { value: "0", unit: `${symbol} / sec` };
  const perSecond = Number(amount) / 10 ** TUSD8.decimals / duration;
  if (!Number.isFinite(perSecond) || perSecond <= 0) {
    return { value: "0", unit: `${symbol} / sec` };
  }
  if (perSecond >= 0.01) {
    return {
      value: trimNumber(perSecond, perSecond >= 1 ? 2 : 5),
      unit: `${symbol} / sec`,
    };
  }
  const perHour = perSecond * 3_600;
  if (perHour >= 0.01) {
    return { value: trimNumber(perHour, 4), unit: `${symbol} / hr` };
  }
  const perDay = perSecond * 86_400;
  return { value: trimNumber(perDay, 4), unit: `${symbol} / day` };
}

export function formatDuration(totalSeconds: number, compact = false): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0 sec";
  const seconds = Math.floor(totalSeconds);

  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (seconds < 3_600) {
    if (compact) return `${minutes} min`;
    return remSeconds && minutes < 10 ? `${minutes} min ${remSeconds} sec` : `${minutes} min`;
  }
  const hours = Math.floor(seconds / 3_600);
  const remMinutes = Math.floor((seconds % 3_600) / 60);
  if (seconds < 86_400) {
    if (compact) return `${hours} hr`;
    return remMinutes ? `${hours} hr ${remMinutes} min` : `${hours} hr`;
  }
  const days = Math.floor(seconds / 86_400);
  const remHours = Math.floor((seconds % 86_400) / 3_600);
  if (compact) return `${days} ${days === 1 ? "day" : "days"}`;
  return remHours
    ? `${days} ${days === 1 ? "day" : "days"} ${remHours} hr`
    : `${days} ${days === 1 ? "day" : "days"}`;
}

export function formatDateTime(unixSeconds: number | bigint): string {
  const ms = Number(unixSeconds) * 1_000;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}

export function formatDate(unixSeconds: number | bigint): string {
  const ms = Number(unixSeconds) * 1_000;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(ms);
}

export function formatToLocalInput(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function formatRelative(unixSeconds: number | bigint, nowMs: number): string {
  const seconds = Number(unixSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const delta = seconds - Math.floor(nowMs / 1_000);
  const abs = Math.abs(delta);
  if (abs < 30) return delta >= 0 ? "moments from now" : "just now";
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (abs >= size) {
      return formatter.format(Math.round(delta / size), unit);
    }
  }
  return "just now";
}

export type ParsedAmount = {
  value: bigint | null;
  error: string | null;
};

export function parseTokenInput(
  input: string,
  decimals = TUSD8.decimals,
): ParsedAmount {
  const normalized = input.trim().replace(/,/g, "");
  if (!normalized) return { value: null, error: null };
  if (!/^\d*\.?\d*$/.test(normalized)) {
    return { value: null, error: "Enter a valid number." };
  }
  if (normalized === "." || normalized === "") {
    return { value: null, error: "Enter an amount." };
  }
  const [, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    return {
      value: null,
      error: `${TUSD8.symbol} supports up to ${decimals} decimals.`,
    };
  }
  try {
    const value = parseUnits(normalized, decimals);
    if (value <= 0n) {
      return { value: null, error: "Amount must be greater than zero." };
    }
    if (value > 340282366920938463463374607431768211455n) {
      return { value: null, error: "Amount is too large for this contract." };
    }
    return { value, error: null };
  } catch {
    return { value: null, error: "Enter a valid number." };
  }
}

export function formatAmountInput(value: bigint, decimals = TUSD8.decimals): string {
  return formatUnits(value, decimals).replace(/\.?0+$/, "") || "0";
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value > 0 && value < 0.01) return "<0.01%";
  if (value >= 1_000) {
    return `${Math.round(value).toLocaleString("en-US")}%`;
  }
  if (value >= 100) return `${value.toFixed(1)}%`;
  return `${value.toFixed(2)}%`;
}
