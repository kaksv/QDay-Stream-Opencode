import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Code2,
  ExternalLink,
  FlaskConical,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddressDisplay } from "@/components/brand/address";
import {
  DEPLOYMENT,
  IS_CONTRACT_CONFIGURED,
  QDAY,
  TUSD8,
} from "@/lib/config";
import { contractUrl } from "@/lib/explorer";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How StreamPay works on QDay Aevum: accrual math, contract permissions, cancellation, tUSD8, security model and deployment addresses.",
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8">
      <h2 className="text-[20px] font-medium tracking-[-0.02em] text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-[13px] leading-6 text-muted">{children}</div>
    </section>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="numeric rounded bg-elevated px-1.5 py-0.5 text-[12px] text-foreground/90">{children}</code>;
}

const TOC = [
  ["overview", "Overview"],
  ["network", "Network & token"],
  ["contract", "Contract"],
  ["accounting", "Accounting"],
  ["permissions", "Permissions"],
  ["cancellation", "Cancellation"],
  ["security", "Security model"],
  ["usage", "Using StreamPay"],
  ["troubleshooting", "Troubleshooting"],
  ["deployment", "Deployment"],
] as const;

export default function DocsPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors duration-100 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to app
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-faint">
              <BookOpen className="size-3.5" />
              Protocol documentation
            </p>
            <h1 className="mt-2 text-[32px] font-medium leading-tight tracking-[-0.04em] sm:text-[40px]">
              StreamPay, precisely.
            </h1>
            <p className="mt-2.5 max-w-2xl text-[13.5px] leading-6 text-muted">
              Everything the app does is a consequence of one immutable contract. This page
              documents the accrual math, the permission model, the token, and how to verify it
              yourself.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/create">
              Open the app
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-20 space-y-1">
              <p className="mb-2 text-[10.5px] uppercase tracking-[0.1em] text-faint">
                On this page
              </p>
              {TOC.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="block rounded-md px-2 py-1.5 text-[12px] text-muted transition-colors duration-100 hover:bg-elevated hover:text-foreground"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

          <div className="space-y-8">
            <section id="overview" className="scroll-mt-24">
              <div className="rounded-xl border border-line bg-[linear-gradient(120deg,rgba(200,241,105,0.06),transparent_55%)] p-5">
                <p className="text-[12.5px] leading-6 text-muted">
                  <span className="font-medium text-foreground">The short version.</span> A
                  sender escrows tUSD8 and names a recipient, a start, and an end. The balance
                  accrues linearly between those timestamps. The recipient withdraws whenever
                  they choose; either party can cancel before the end, which freezes accrual
                  and returns the unaccrued remainder to the sender.
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Card className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-faint">Custody</p>
                  <p className="mt-1.5 text-[13px] text-foreground">StreamPay contract</p>
                  <p className="mt-0.5 text-[11.5px] leading-5 text-muted">
                    Not StreamPay Labs, not the sender, not a server.
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-faint">Identity</p>
                  <p className="mt-1.5 text-[13px] text-foreground">Your wallet</p>
                  <p className="mt-0.5 text-[11.5px] leading-5 text-muted">
                    No accounts, passwords, sessions or database.
                  </p>
                </Card>
              </div>
            </section>

            <Section id="network" title="Network & token">
              <p>
                StreamPay runs on QDay Aevum Testnet. The app is configured with the official
                test stablecoin, tUSD8. Gas is paid in tQDAY, the native 18-decimal token.
              </p>
              <div className="overflow-hidden rounded-xl border border-line">
                {[
                  ["Network", QDAY.name],
                  ["Chain ID", `${QDAY.chainId} (${QDAY.chainIdHex})`],
                  ["RPC", QDAY.rpcUrl],
                  ["Explorer", QDAY.explorerUrl],
                  ["Gas token", `${QDAY.nativeCurrency.symbol} · ${QDAY.nativeCurrency.decimals} decimals`],
                  ["Stream token", `${TUSD8.symbol} · ${TUSD8.decimals} decimals`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col gap-0.5 border-b border-line px-4 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-[11.5px] text-faint">{label}</span>
                    <span className="numeric break-all text-[11.5px] text-foreground/90 sm:text-right">
                      {value}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11.5px] text-faint">tUSD8 address</span>
                  <AddressDisplay address={TUSD8.address} showExplorer />
                </div>
              </div>
              <p>
                tUSD8 supports EIP-2612 permits. The app can create a stream with one signature
                plus one transaction; if the permit fails or the wallet cannot sign typed data,
                the standard approval path remains available.
              </p>
            </Section>

            <Section id="contract" title="Contract">
              <p>
                StreamPay is a single-token escrow. The token address is fixed at
                construction; there is one deployment per token. It exposes creation,
                withdrawal, batch withdrawal, cancellation, paginated account views, and live
                accounting views.
              </p>
              <div className="overflow-hidden rounded-xl border border-line">
                <div className="border-b border-line bg-elevated/40 px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-faint">
                  Public interface
                </div>
                <pre className="overflow-x-auto p-4 text-[11.5px] leading-6 text-foreground/90">
{`createStream(recipient, amount, startTime, endTime)
createStreamWithPermit(recipient, amount, startTime, endTime,
                       deadline, v, r, s)
withdraw(streamId)
withdrawMany(streamIds)
cancelStream(streamId)

getStream(streamId)
accruedOf(streamId)
withdrawableOf(streamId)
getSenderStreams(account, offset, limit)
getRecipientStreams(account, offset, limit)`}
                </pre>
              </div>
              <p>
                Limits: <Mono>MAX_BATCH = 50</Mono> streams per batch withdrawal and{" "}
                <Mono>MAX_PAGE = 50</Mono> per account page. Amounts must fit in{" "}
                <Mono>uint128</Mono>; timestamps are <Mono>uint64</Mono>. The token must use 18
                decimals or fewer.
              </p>
            </Section>

            <Section id="accounting" title="Accounting">
              <p>
                Accrual is linear and uses integer division. The contract never stores a
                per-second balance; it derives balances from timestamps when asked.
              </p>
              <pre className="overflow-x-auto rounded-xl border border-line bg-elevated/40 p-4 text-[11.5px] leading-6 text-foreground/90">
{`duration    = endTime - startTime
elapsed(t)  = clamp(t - startTime, 0, duration)
accrued(t)  = amount * elapsed(t) / duration

withdrawable(t) = accrued(t) - withdrawn`}
              </pre>
              <p>
                <span className="text-foreground">Why rounding is safe.</span> Integer division
                floors, so the contract can only ever owe less than or equal to the escrow, never
                more. Withdrawals add to <Mono>withdrawn</Mono> before the transfer, and the
                contract is protected by a reentrancy guard.
              </p>
              <p>
                <span className="text-foreground">Who computes what.</span> The frontend mirrors
                this formula once per second using a chain-corrected clock. Those numbers are an
                estimate for display. When a transaction executes, the contract reads{" "}
                <Mono>block.timestamp</Mono> and computes the authoritative amount.
              </p>
            </Section>

            <Section id="permissions" title="Permissions">
              <div className="overflow-hidden rounded-xl border border-line">
                {[
                  ["Create", "Anyone with tUSD8. The recipient cannot be the sender."],
                  ["Withdraw", "Recipient only, always to the recipient's own address."],
                  ["Cancel", "Sender or recipient, only before endTime."],
                  ["Admin actions", "None. No owner, pause, upgrade, fee or rescue."],
                ].map(([role, rule]) => (
                  <div
                    key={role}
                    className="flex flex-col gap-0.5 border-b border-line px-4 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-[11.5px] text-faint">{role}</span>
                    <span className="text-[11.5px] text-foreground/90 sm:text-right">{rule}</span>
                  </div>
                ))}
              </div>
              <p>
                Anyone can read any stream by ID. Sender and recipient indexes are paginated, so
                a wallet with many streams loads incrementally rather than in one unbounded call.
              </p>
            </Section>

            <Section id="cancellation" title="Cancellation">
              <p>
                Either party may cancel while <Mono>block.timestamp &lt; endTime</Mono>.
                Accrual freezes at <Mono>cancelledAt</Mono>. The sender receives the unaccrued
                remainder immediately; the recipient keeps the accrued balance and can withdraw
                it later.
              </p>
              <pre className="overflow-x-auto rounded-xl border border-line bg-elevated/40 p-4 text-[11.5px] leading-6 text-foreground/90">
{`accrued    = accrued(cancelledAt)
refund     = amount - accrued
recipient  = accrued - withdrawn`}
              </pre>
              <p>
                Once the end time passes, cancellation reverts. The full amount has accrued and
                belongs to the recipient, who can withdraw it at any time.
              </p>
            </Section>

            <Section id="security" title="Security model">
              <div className="space-y-2.5">
                {[
                  "No privileged roles or upgradeability. The bytecode cannot be changed.",
                  "Every stream is fully collateralised at creation; fee-on-transfer tokens revert.",
                  "Checks-effects-interactions plus OpenZeppelin's ReentrancyGuard on state-changing entry points.",
                  "SafeERC20 is used for token transfers, including non-standard return values.",
                  "The permit path is best-effort inside try/catch; the allowance check still gates creation.",
                  "Foundry suite: unit, fuzz, permit/front-run, pagination, adversarial tokens, and solvency invariants.",
                ].map((item) => (
                  <div key={item} className="flex gap-2.5">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-mint" />
                    <span className="text-[12.5px] leading-6 text-muted">{item}</span>
                  </div>
                ))}
              </div>
              <p className="rounded-lg border border-amber/25 bg-amber/[0.06] p-3 text-[12px] leading-5 text-amber">
                This is testnet software provided as-is. Contracts have not been audited by a
                third party. Do not use it with assets that have value.
              </p>
            </Section>

            <Section id="usage" title="Using StreamPay">
              <ol className="space-y-3">
                {[
                  ["Connect", "Use any EVM wallet. If the wallet is on another chain, StreamPay offers to switch or add QDay Aevum."],
                  ["Get test tokens", "Claim tQDAY for gas and tUSD8 for streams from the QDay faucet."],
                  ["Create", "Choose a recipient, amount, duration and start. Review the split, then sign a permit (or approve) and confirm the funding transaction."],
                  ["Receive", "The dashboard shows a live accrued balance. Withdraw any amount that has accrued; the contract pays the exact figure at execution."],
                  ["Cancel", "Either party can cancel a running stream. The dialog previews the refund and the amount left for the recipient before you confirm."],
                  ["Receipts", "Each stream page lists funding, withdrawals and cancellation events with transaction hashes and timestamps. Use Receipt to print or save a PDF."],
                ].map(([title, body], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="numeric mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-[11px] text-muted">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{title}</p>
                      <p className="mt-0.5 text-[12.5px] leading-6 text-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>

            <Section id="troubleshooting" title="Troubleshooting">
              <div className="space-y-3">
                {[
                  [
                    "\"Not enough tQDAY for gas\"",
                    "Claim free tQDAY from the QDay faucet, then retry. The app never subsidises gas.",
                  ],
                  [
                    "\"Nothing to withdraw yet\"",
                    "The stream has not accrued a balance, or everything accrued was already withdrawn. Wait for the next second or block.",
                  ],
                  [
                    "\"This stream has ended\"",
                    "Cancellation is closed after endTime. The recipient should withdraw the remaining balance instead.",
                  ],
                  [
                    "\"Approval still needed\"",
                    "The permit signature may have expired or been used. Retry the create flow, or use the standard Approve-first path.",
                  ],
                  [
                    "\"Aevum RPC didn't respond\"",
                    "Reads failed; no funds moved. Retry, or check the QDay status. The contract remains authoritative.",
                  ],
                ].map(([question, answer]) => (
                  <div key={question} className="rounded-xl border border-line p-3.5">
                    <p className="text-[12.5px] font-medium text-foreground">{question}</p>
                    <p className="mt-1 text-[12px] leading-5 text-muted">{answer}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="deployment" title="Deployment">
              <p>
                The app resolves its contract address from{" "}
                <Mono>NEXT_PUBLIC_STREAMPAY_ADDRESS</Mono> or the checked-in deployment record.
                This page never guesses an address: if the build is not configured, reads and
                writes stay disabled and the UI says so.
              </p>
              <div className="overflow-hidden rounded-xl border border-line">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <span className="text-[11.5px] text-faint">StreamPay contract</span>
                  {IS_CONTRACT_CONFIGURED ? (
                    <AddressDisplay address={DEPLOYMENT.streamPay} showExplorer />
                  ) : (
                    <span className="text-[11.5px] text-amber">Not deployed in this build</span>
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11.5px] text-faint">Token</span>
                  <AddressDisplay address={TUSD8.address} showExplorer />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={QDAY.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-muted underline-offset-4 hover:text-foreground hover:underline"
                >
                  <Terminal className="size-3.5" />
                  QDay developer docs
                  <ExternalLink className="size-3" />
                </a>
                {contractUrl() ? (
                  <a
                    href={contractUrl() as string}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] text-muted underline-offset-4 hover:text-foreground hover:underline"
                  >
                    <Code2 className="size-3.5" />
                    Verified source
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
              <p className="flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-[11.5px] leading-5 text-faint">
                <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-amber" />
                Aevum Testnet only. tUSD8 and tQDAY are free test tokens with no monetary value.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
