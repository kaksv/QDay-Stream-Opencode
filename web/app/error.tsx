"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Surface the digest in the console for debugging without leaking details into the UI.
    console.error("StreamPay route error", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl border border-coral/25 bg-coral/10 text-coral">
        <TriangleAlert className="size-5" />
      </span>
      <h1 className="mt-5 text-[30px] font-medium tracking-[-0.04em]">
        Something broke on this screen.
      </h1>
      <p className="mt-2 max-w-md text-[13.5px] leading-6 text-muted">
        This is a rendering error, not a transaction failure. No funds moved. Reloading the
        route usually fixes it.
      </p>
      {error.digest ? (
        <p className="numeric mt-3 text-[11px] text-faint">ref {error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-2">
        <Button onClick={() => reset()}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
          Dashboard
        </Button>
      </div>
    </div>
  );
}
