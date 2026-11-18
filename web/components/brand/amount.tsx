import { formatTokenAmount, rawAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TUSD8 } from "@/lib/config";

export function Amount({
  value,
  className,
  compact = false,
  maxFractionDigits = 6,
  minFractionDigits = 0,
  symbol = true,
  zeroSubscript = true,
  rawTitle = true,
}: {
  value: bigint | null | undefined;
  className?: string;
  compact?: boolean;
  maxFractionDigits?: number;
  minFractionDigits?: number;
  symbol?: boolean;
  zeroSubscript?: boolean;
  rawTitle?: boolean;
}) {
  if (value == null) {
    return <span className={cn("numeric text-muted", className)}>—</span>;
  }

  const display = formatTokenAmount(value, {
    compact,
    maxFractionDigits,
    minFractionDigits,
    symbol: symbol ? TUSD8.symbol : false,
    zeroSubscript,
  });

  return (
    <span
      className={cn("numeric tabular-nums", className)}
      title={rawTitle ? `${rawAmount(value)} ${TUSD8.symbol}` : undefined}
      aria-label={`${rawAmount(value)} ${TUSD8.symbol}`}
    >
      {display}
    </span>
  );
}

export function AmountValue({
  value,
  className,
  compact = false,
  maxFractionDigits = 6,
  minFractionDigits = 0,
  zeroSubscript = true,
}: {
  value: bigint | null | undefined;
  className?: string;
  compact?: boolean;
  maxFractionDigits?: number;
  minFractionDigits?: number;
  zeroSubscript?: boolean;
}) {
  return (
    <Amount
      value={value}
      className={className}
      compact={compact}
      maxFractionDigits={maxFractionDigits}
      minFractionDigits={minFractionDigits}
      symbol={false}
      zeroSubscript={zeroSubscript}
    />
  );
}
