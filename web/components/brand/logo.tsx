import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("size-8", className)}
      fill="none"
    >
      <rect width="40" height="40" rx="11" fill="#0C100D" />
      <rect x="10" y="11" width="20" height="2.6" rx="1.3" fill="#C8F169" />
      <rect x="10" y="18.7" width="13" height="2.6" rx="1.3" fill="#7DE2C3" />
      <rect x="16" y="26.4" width="14" height="2.6" rx="1.3" fill="#C8F169" opacity="0.55" />
      <circle cx="28.5" cy="27.7" r="2.2" fill="#C8F169" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  wordmark = true,
}: {
  className?: string;
  href?: string | null;
  wordmark?: boolean;
}) {
  const content = (
    <span className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8 transition-transform duration-200 group-hover:rotate-[-3deg]" />
      {wordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">
          Stream<span className="text-muted">Pay</span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="StreamPay home" className="inline-flex">
      {content}
    </Link>
  );
}
