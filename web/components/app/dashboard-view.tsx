"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  Plus,
  Radio,
  RefreshCw,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Amount } from "@/components/brand/amount";
import { EmptyState } from "@/components/brand/feedback";
import { LiveDot } from "@/components/brand/status-badge";
import { ConnectGate } from "@/components/app/connect-gate";
import { StreamCard } from "@/components/app/stream-card";
import { WithdrawAllButton } from "@/components/app/stream-actions";
import { useAccountStreams, useStreamCounts } from "@/lib/hooks/use-streams";
import { useClock } from "@/lib/providers/clock-provider";
import {
  accruedAt,
  streamStatus,
  withdrawableAt,
} from "@/lib/accrual";
import { formatCompactCount } from "@/lib/format";
import { copyText, truncateAddress } from "@/lib/utils";
import { useAccount } from "wagmi";
import type { Stream, StreamRole } from "@/lib/types";

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="flex items-start justify-between gap-3 p-4 sm:p-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-faint">{label}</p>
        <p className="mt-1.5 text-[24px] font-medium leading-none tracking-[-0.03em] text-foreground">
          {value}
        </p>
        {hint ? <p className="mt-1.5 text-[11.5px] text-muted">{hint}</p> : null}
      </div>
      {icon ? (
        <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-elevated text-muted">
          {icon}
        </span>
      ) : null}
    </Card>
  );
}

function CardSkeletons() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-6 h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-28" />
          <Skeleton className="mt-5 h-1.5 w-full rounded-full" />
          <div className="mt-5 flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function RolePanel({
  role,
  enabled,
}: {
  role: StreamRole;
  enabled: boolean;
}) {
  const { address } = useAccount();
  const { nowMs } = useClock();
  const {
    streams,
    isLoading,
    isError,
    hasMore,
    fetchMore,
    isFetchingMore,
    refetch,
  } = useAccountStreams(role, { enabled });

  const totals = useMemo(() => {
    let withdrawable = 0n;
    let released = 0n;
    let remaining = 0n;
    let open = 0;
    for (const stream of streams) {
      const status = streamStatus(stream, nowMs);
      const accrued = accruedAt(stream, nowMs);
      withdrawable += withdrawableAt(stream, nowMs);
      released += accrued;
      if (status === "active" || status === "scheduled") {
        open += 1;
        remaining += stream.amount > accrued ? stream.amount - accrued : 0n;
      }
    }
    return { withdrawable, released, remaining, open };
  }, [streams, nowMs]);

  if (!address) {
    return (
      <ConnectGate
        title="Connect to see your streams"
        description="Incoming and outgoing streams are tied to your wallet address. Connect to view balances, withdraw, or cancel."
      />
    );
  }

  if (isLoading) return <CardSkeletons />;

  if (isError) {
    return (
      <EmptyState
        icon={<TriangleAlert className="size-5 text-coral" />}
        title="Couldn't load your streams"
        description="The Aevum RPC didn't answer. Your funds are untouched — this is a read-only failure."
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        }
      />
    );
  }

  if (streams.length === 0) {
    if (role === "recipient") {
      return (
        <EmptyState
          icon={<ArrowDownLeft className="size-5" />}
          title="No incoming streams yet"
          description={`When someone opens a stream to ${truncateAddress(address, 8, 6)}, it appears here and starts accruing every second.`}
          action={<CopyAddressButton address={address} />}
        />
      );
    }
    return (
      <EmptyState
        icon={<ArrowUpRight className="size-5" />}
        title="You haven't sent a stream yet"
        description="Fund a stream once and let it unlock by the second. The recipient can withdraw at any time; you can cancel to recover the unaccrued balance."
        action={
          <Button asChild>
            <Link href="/create">
              <Plus className="size-4" />
              Create your first stream
            </Link>
          </Button>
        }
      />
    );
  }

  const open = streams.filter((stream) => {
    const status = streamStatus(stream, nowMs);
    return status === "active" || status === "scheduled";
  });

  return (
    <div className="space-y-4">
      {role === "recipient" ? (
        <Card className="flex flex-col gap-4 border-primary/20 bg-[linear-gradient(120deg,rgba(200,241,105,0.07),transparent_60%)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-faint">
              <LiveDot /> Withdrawable across {streams.length}{" "}
              {streams.length === 1 ? "stream" : "streams"}
            </p>
            <p className="mt-1.5 text-[30px] font-medium leading-none tracking-[-0.035em]">
              <Amount value={totals.withdrawable} zeroSubscript={false} />
            </p>
            <p className="mt-1.5 text-[12px] text-muted">
              Accrued <Amount value={totals.released} /> so far ·{" "}
              {open.length} still running
            </p>
          </div>
          <WithdrawAllButton streams={streams} nowMs={nowMs} />
        </Card>
      ) : (
        <Card className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
              Released so far
            </p>
            <p className="mt-1.5 text-[22px] font-medium tracking-[-0.03em]">
              <Amount value={totals.released} />
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
              Still to release
            </p>
            <p className="mt-1.5 text-[22px] font-medium tracking-[-0.03em]">
              <Amount value={totals.remaining} />
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
              Open streams
            </p>
            <p className="mt-1.5 text-[22px] font-medium tracking-[-0.03em]">
              {totals.open}
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {streams.map((stream: Stream) => (
          <StreamCard
            key={stream.id.toString()}
            stream={stream}
            role={role}
            nowMs={nowMs}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            onClick={() => fetchMore()}
            disabled={isFetchingMore}
          >
            {isFetchingMore ? "Loading…" : "Load more streams"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    const ok = await copyText(address);
    if (!ok) {
      toast.error("Couldn't copy your address.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }
  return (
    <Button variant="secondary" onClick={handleCopy}>
      {copied ? <Check className="size-4 text-mint" /> : <Copy className="size-4" />}
      {copied ? "Copied" : "Copy your address"}
    </Button>
  );
}

export function DashboardView() {
  const [tab, setTab] = useState<StreamRole>("recipient");
  const { isConnected } = useAccount();
  const { blockNumber } = useClock();
  const counts = useStreamCounts();

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-faint">
            <LiveDot /> Live on Aevum
            {blockNumber ? (
              <span className="numeric normal-case tracking-normal text-faint/80">
                block {blockNumber.toString()}
              </span>
            ) : null}
          </p>
          <h1 className="mt-2 text-[30px] font-medium leading-none tracking-[-0.04em] sm:text-[36px]">
            Your streams
          </h1>
          <p className="mt-2 max-w-lg text-[13.5px] leading-6 text-muted">
            Balances accrue every second from the chain clock. Withdraw whenever you want;
            nothing is custodial.
          </p>
        </div>
        <Button asChild size="lg" className="h-10">
          <Link href="/create">
            <Plus className="size-4" />
            New stream
          </Link>
        </Button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Receiving"
          value={formatCompactCount(counts.received)}
          hint="streams opened to you"
          icon={<ArrowDownLeft className="size-4" />}
        />
        <StatCard
          label="Sending"
          value={formatCompactCount(counts.sent)}
          hint="streams funded by you"
          icon={<ArrowUpRight className="size-4" />}
        />
        <StatCard
          label="On Aevum"
          value={formatCompactCount(counts.total)}
          hint="streams created in total"
          icon={<Radio className="size-4" />}
        />
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as StreamRole)}
        className="mt-9"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="recipient">
              <ArrowDownLeft className="mr-1.5 size-3.5" />
              Receiving
              <span className="numeric ml-1.5 text-[11px] text-faint">
                {formatCompactCount(counts.received)}
              </span>
            </TabsTrigger>
            <TabsTrigger value="sender">
              <ArrowUpRight className="mr-1.5 size-3.5" />
              Sending
              <span className="numeric ml-1.5 text-[11px] text-faint">
                {formatCompactCount(counts.sent)}
              </span>
            </TabsTrigger>
          </TabsList>
          <p className="hidden items-center gap-1.5 text-[11.5px] text-faint sm:flex">
            <Wallet className="size-3.5" aria-hidden="true" />
            Auto-refreshing every few seconds
          </p>
        </div>

        <TabsContent value="recipient">
          <RolePanel role="recipient" enabled={isConnected && tab === "recipient"} />
        </TabsContent>
        <TabsContent value="sender">
          <RolePanel role="sender" enabled={isConnected && tab === "sender"} />
        </TabsContent>
      </Tabs>

      {!isConnected ? (
        <p className="mt-6 text-center text-[11.5px] text-faint">
          Not sure where to start? A wallet is all you need — no account, no email.
        </p>
      ) : null}
    </div>
  );
}
