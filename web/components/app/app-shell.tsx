"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, LayoutDashboard, Plus } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { TestnetBadge } from "@/components/brand/testnet";
import { WalletButton } from "@/components/app/wallet-button";
import { NetworkBanner } from "@/components/app/network-banner";
import { IS_CONTRACT_CONFIGURED } from "@/lib/config";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "New stream", icon: Plus },
  { href: "/docs", label: "Docs", icon: BookOpen },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-xl">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Logo href="/dashboard" />
            <nav
              aria-label="Primary"
              className="hidden items-center gap-0.5 md:flex"
            >
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-colors duration-100",
                      active
                        ? "bg-elevated text-foreground"
                        : "text-muted hover:bg-elevated/60 hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon className="size-3.5" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <TestnetBadge className="hidden lg:inline-flex" />
            <WalletButton />
          </div>
        </div>
      </header>

      <NetworkBanner />

      {!IS_CONTRACT_CONFIGURED ? (
        <div className="border-b border-coral/20 bg-coral/[0.07]">
          <div className="container-page py-2.5">
            <p className="text-[12.5px] leading-5 text-coral">
              StreamPay has not been deployed to this build yet. Reads and writes stay
              disabled until a contract address is configured.
            </p>
          </div>
        </div>
      ) : null}

      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      <footer className="hidden border-t border-line py-5 md:block">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-faint">
          <p>
            StreamPay on QDay Aevum · non-custodial · tUSD8 has no monetary value.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-muted">
              Protocol docs
            </Link>
            <a
              href="https://wiki.qday.info"
              target="_blank"
              rel="noreferrer"
              className="hover:text-muted"
            >
              QDay docs
            </a>
          </div>
        </div>
      </footer>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] transition-colors duration-100",
                  active ? "text-primary" : "text-faint hover:text-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-[18px]" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
