import { cn } from "@/lib/utils";
import type { DisplayStatus } from "@/lib/types";

export function ProgressFlow({
  value,
  status = "active",
  className,
  height = "h-1.5",
}: {
  value: number;
  status?: DisplayStatus;
  className?: string;
  height?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const fill =
    status === "cancelled"
      ? "bg-coral/70"
      : status === "completed"
        ? "bg-info/70"
        : "flow-gradient";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-elevated",
        height,
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={`${clamped.toFixed(1)} percent of the stream elapsed`}
    >
      <div
        className={cn(
          "h-full origin-left rounded-full transition-transform duration-1000 ease-linear",
          fill,
          status === "active" && "flow-shine overflow-hidden",
        )}
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}

export function TimelineMarks({
  startLabel,
  endLabel,
  className,
}: {
  startLabel: string;
  endLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between text-[11px] text-faint",
        className,
      )}
    >
      <span>{startLabel}</span>
      <span>{endLabel}</span>
    </div>
  );
}
