"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Toaster } from "sonner";
import { wagmiConfig } from "@/lib/wagmi";
import { ClockProvider } from "@/lib/providers/clock-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DemoAutoConnect } from "@/components/app/demo-connect";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 8_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DemoAutoConnect />
        <ClockProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster
            theme="dark"
            position="bottom-right"
            closeButton
            toastOptions={{
              style: {
                background: "#111712",
                border: "1px solid rgba(236,241,228,0.14)",
                color: "#ECF1E4",
                borderRadius: "14px",
                fontFamily: "var(--font-geist-sans)",
              },
              className: "shadow-2xl",
            }}
          />
        </ClockProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
