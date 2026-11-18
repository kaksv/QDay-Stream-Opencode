import { Spinner } from "@/components/brand/feedback";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner className="size-5 text-muted" />
      <p className="text-[12px] text-faint">Loading…</p>
    </div>
  );
}
