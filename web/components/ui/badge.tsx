import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium leading-none tracking-[0.01em]",
  {
    variants: {
      variant: {
        default: "border-line bg-elevated text-muted",
        primary: "border-primary/30 bg-primary/10 text-primary",
        mint: "border-mint/30 bg-mint/10 text-mint",
        amber: "border-amber/30 bg-amber/10 text-amber",
        coral: "border-coral/30 bg-coral/10 text-coral",
        info: "border-info/30 bg-info/10 text-info",
        outline: "border-line-strong bg-transparent text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
