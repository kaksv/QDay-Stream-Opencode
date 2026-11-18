import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="atmosphere flex min-h-dvh flex-col items-center justify-center px-5 py-16 text-center">
      <Logo href={null} />
      <p className="mt-10 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-faint">
        <Compass className="size-3.5" />
        404 · not found
      </p>
      <h1 className="mt-3 max-w-lg text-[34px] font-medium leading-tight tracking-[-0.04em] sm:text-[44px]">
        This page never accrued.
      </h1>
      <p className="mt-3 max-w-md text-[13.5px] leading-6 text-muted">
        The link may be wrong, or the stream ID doesn&apos;t exist on this deployment. Your
        funds are unaffected — contracts don&apos;t depend on this page.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
