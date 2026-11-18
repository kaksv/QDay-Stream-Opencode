import { Badge } from "@/components/ui/badge";
import { STATUS_META, type DisplayStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
  showDot = true,
}: {
  status: DisplayStatus;
  className?: string;
  showDot?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", meta.className, className)}
    >
      {showDot ? (
        <span
          className={cn(
            "size-1.5 rounded-full",
            meta.dot,
            status === "active" && "live-dot",
          )}
          aria-hidden="true"
        />
      ) : null}
      {meta.label}
    </Badge>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex size-1.5 rounded-full bg-mint live-dot", className)}
      aria-hidden="true"
    />
  );
}
