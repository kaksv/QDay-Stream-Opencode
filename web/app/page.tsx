import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  Check,
  CircleDollarSign,
  Clock3,
  FlaskConical,
  Gauge,
  KeyRound,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
  Timer,
  Wallet,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { TestnetBadge, TestnetNote } from "@/components/brand/testnet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AddressDisplay } from "@/components/brand/address";
import { WalletButton } from "@/components/app/wallet-button";
import { HeroPreview } from "@/components/landing/hero-preview";
import {
  DEPLOYMENT,
  IS_CONTRACT_CONFIGURED,
  QDAY,
  TUSD8,
} from "@/lib/config";

const HOW = [
  {
    icon: Wallet,
    step: "01",
    title: "Fund once",
    body: "Pick a recipient, an amount and a duration. The full amount is escrowed in the contract in a single transaction — no recurring approvals, no auto-debits.",
  },
  {
    icon: Timer,
    step: "02",
    title: "Accrue every second",
    body: "The balance unlocks linearly from the start time to the end time. Accrual is computed from block timestamps, so there are no per-second transactions and no gas drip.",
  },
  {
    icon: CircleDollarSign,
    step: "03",
    title: "Withdraw or cancel",
    body: "The recipient pulls the accrued balance whenever they like. Either party can cancel while it runs: the sender recovers the unaccrued remainder, the recipient keeps what accrued.",
  },
];

const SECURITY = [
  {
    icon: KeyRound,
    title: "No owner, no admin keys",
    body: "The contract has no owner, pause switch, upgrade proxy, fee recipient or rescue function. Nobody can intervene in a stream.",
  },
  {
    icon: Lock,
    title: "Fully funded upfront",
    body: "A stream cannot exist unless the entire amount is already inside the contract. There is no promise to pay later.",
  },
  {
    icon: ShieldCheck,
    title: "Pull-based withdrawals",
    body: "Recipients withdraw to their own address. State is updated before the token transfer and the contract is reentrancy-guarded.",
  },
  {
    icon: Ban,
    title: "Fee-on-transfer rejected",
    body: "Creation measures the actual balance delta and rejects tokens that deliver less than the agreed amount.",
  },
  {
    icon: Layers,
    title: "Small, immutable surface",
    body: "One token per deployment, linear accrual, explicit custom errors. No oracles, no external calls beyond tUSD8.",
  },
  {
    icon: Gauge,
    title: "Tested against edge cases",
    body: "61 Foundry tests cover permits, front-running, pagination, reentrancy, fee-on-transfer tokens, fuzzing and solvency invariants.",
  },
];

const FAQ = [
  {
    q: "Where does the money actually sit?",
    a: "Inside the StreamPay contract on QDay Aevum. When you create a stream, the full amount moves from your wallet to the contract in one ERC-20 transfer. It leaves only when the recipient withdraws or the sender is refunded after a cancellation.",
  },
  {
    q: "Can StreamPay freeze or take my funds?",
    a: "No. There is no owner, no pause, no upgrade and no withdrawal function for a third party. Only the recipient can withdraw accrued funds, and only the sender or recipient can cancel a running stream.",
  },
  {
    q: "What happens when a stream is cancelled?",
    a: "Accrual freezes at the cancellation block timestamp. The sender immediately receives the unaccrued remainder, and the recipient can withdraw everything that accrued up to that moment. If the stream already reached its end time, cancellation is not allowed — the full amount belongs to the recipient.",
  },
  {
    q: "Does the recipient need to claim every second?",
    a: "No. The balance accrues mathematically. Claiming is a pull action the recipient chooses to take, and one transaction can withdraw from up to 50 streams at once.",
  },
  {
    q: "Which wallet do I need?",
    a: "Any EVM wallet that supports QDay Aevum — MetaMask, Rabby, Brave and other injected wallets work. StreamPay detects the wrong network and asks your wallet to switch or add chain 44005.",
  },
  {
    q: "Is tUSD8 real money?",
    a: "No. tUSD8 and tQDAY are free testnet tokens on QDay Aevum. They carry no monetary value and no expectation of value. Never send mainnet assets to this deployment.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-background/80 backdrop-blur-xl">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-7">
            <Logo />
            <nav className="hidden items-center gap-5 text-[12.5px] text-muted md:flex">
              <a href="#how" className="transition-colors duration-100 hover:text-foreground">
                How it works
              </a>
              <a href="#security" className="transition-colors duration-100 hover:text-foreground">
                Security
              </a>
              <a href="#network" className="transition-colors duration-100 hover:text-foreground">
                Network
              </a>
              <a href="#faq" className="transition-colors duration-100 hover:text-foreground">
                FAQ
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <TestnetBadge className="hidden lg:inline-flex" />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/docs">Docs</Link>
            </Button>
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero ------------------------------------------------------------ */}
        <section className="atmosphere relative overflow-hidden border-b border-line">
          <div className="pointer-events-none absolute inset-0 grid-lines" aria-hidden="true" />
          <div className="container-page relative grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-16 lg:py-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[11.5px] text-muted">
                <Sparkles className="size-3 text-primary" aria-hidden="true" />
                Aevum Builder Challenge #1 · QDay testnet
              </p>

              <h1 className="mt-6 max-w-2xl text-[42px] font-medium leading-[0.98] tracking-[-0.05em] text-foreground sm:text-[58px] lg:text-[64px]">
                Pay by the{" "}
                <em className="font-serif font-normal italic text-primary">second</em>,
                <br className="hidden sm:block" /> not by the invoice.
              </h1>

              <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted sm:text-[16px]">
                StreamPay turns a stablecoin balance into a live payment. Fund a stream once
                and it unlocks to the recipient every second — withdrawable at any time,
                cancellable by either party, never custodial.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-11">
                  <Link href="/create">
                    Open the app
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="h-11">
                  <a href="#how">See how it works</a>
                </Button>
              </div>

              <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-muted">
                {["Non-custodial", "Fully funded", "No admin keys"].map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 text-mint" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-5 flex items-center gap-1.5 text-[11.5px] text-faint">
                <FlaskConical className="size-3.5 text-amber" aria-hidden="true" />
                Testnet only · tUSD8 has no monetary value.
              </p>
            </div>

            <div className="lg:pl-2">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Proof strip --------------------------------------------------- */}
        <section className="border-b border-line bg-surface/40">
          <div className="container-page grid grid-cols-2 divide-x divide-line py-1 sm:grid-cols-4">
            {[
              { value: "1 tx", label: "to fund a stream" },
              { value: "0", label: "custodians" },
              { value: "1 sec", label: "accrual granularity" },
              { value: "61", label: "Foundry tests passing" },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-5 first:pl-0 last:pr-0">
                <p className="numeric text-[20px] font-medium tracking-[-0.03em] text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[11.5px] text-faint">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How ------------------------------------------------------------ */}
        <section id="how" className="border-b border-line py-16 sm:py-20">
          <div className="container-page">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.12em] text-primary">
                How it works
              </p>
              <h2 className="mt-3 text-[30px] font-medium leading-tight tracking-[-0.04em] sm:text-[40px]">
                Three steps. No payroll rails, no recurring approvals.
              </h2>
              <p className="mt-3 text-[14px] leading-7 text-muted">
                A stream is an escrow with a clock. Everything else — balances, withdrawals,
                cancellations — follows from that one idea.
              </p>
            </div>

            <div className="mt-9 grid gap-3 md:grid-cols-3">
              {HOW.map((item) => (
                <Card key={item.step} className="relative p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-xl border border-line bg-elevated text-primary">
                      <item.icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="numeric text-[11px] text-faint">{item.step}</span>
                  </div>
                  <h3 className="mt-5 text-[15px] font-medium tracking-[-0.01em]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-6 text-muted">{item.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison ---------------------------------------------------- */}
        <section className="border-b border-line py-16 sm:py-20">
          <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-mint">
                The difference
              </p>
              <h2 className="mt-3 text-[30px] font-medium leading-tight tracking-[-0.04em] sm:text-[40px]">
                Invoices are a promise. Streams are a balance.
              </h2>
              <p className="mt-3 max-w-lg text-[14px] leading-7 text-muted">
                Paying monthly means someone is always extending credit. StreamPay replaces
                the promise with escrowed funds that release at the speed of time.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-line/60 p-5">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-faint">
                  <Clock3 className="size-3.5" />
                  Invoices
                </p>
                <ul className="mt-4 space-y-3 text-[12.5px] leading-5 text-muted">
                  {[
                    "Work happens before money moves",
                    "Refunds depend on the counterparty",
                    "Payment status lives in email",
                    "Recurring approvals and manual sends",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-faint" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="border-primary/25 bg-[linear-gradient(150deg,rgba(200,241,105,0.08),transparent_60%)] p-5">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-primary">
                  <Zap className="size-3.5" />
                  StreamPay
                </p>
                <ul className="mt-4 space-y-3 text-[12.5px] leading-5 text-muted">
                  {[
                    "Funds are locked before work starts",
                    "Refunds are enforced by the contract",
                    "Balance is readable on-chain, live",
                    "One funding transaction per stream",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-mint" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* Mechanics ----------------------------------------------------- */}
        <section className="border-b border-line py-16 sm:py-20">
          <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-amber">
                The mechanics
              </p>
              <h2 className="mt-3 text-[30px] font-medium leading-tight tracking-[-0.04em] sm:text-[40px]">
                Linear accrual, integer math, no clocks to trust.
              </h2>
              <p className="mt-3 text-[14px] leading-7 text-muted">
                The contract reads <span className="numeric text-foreground">block.timestamp</span>{" "}
                when it needs a balance. The browser mirrors the same formula every second for
                display, but only the chain can move funds.
              </p>
              <ul className="mt-6 space-y-3 text-[12.5px] leading-6 text-muted">
                <li className="flex gap-2.5">
                  <Check className="mt-1 size-3.5 shrink-0 text-mint" />
                  No keeper, oracle or cron job. Nothing to run.
                </li>
                <li className="flex gap-2.5">
                  <Check className="mt-1 size-3.5 shrink-0 text-mint" />
                  Rounding always favours the contract&apos;s solvency, never creates tokens.
                </li>
                <li className="flex gap-2.5">
                  <Check className="mt-1 size-3.5 shrink-0 text-mint" />
                  Cancellation freezes accrual at the cancellation block.
                </li>
              </ul>
            </div>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <p className="text-[11px] uppercase tracking-[0.08em] text-faint">
                  stream-pay / accrual
                </p>
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">
                  Solidity 0.8.24
                </span>
              </div>
              <pre className="overflow-x-auto p-5 text-[12.5px] leading-7 text-foreground/90">
{`accrued(t) = amount
  × clamp(t − startTime, 0, duration)
  / duration

withdrawable = accrued(t) − withdrawn

cancel(t):
  senderRefund       = amount − accrued(t)
  recipientKeeps     = accrued(t) − withdrawn`}
              </pre>
              <div className="border-t border-line px-5 py-3">
                <p className="text-[11.5px] leading-5 text-faint">
                  `t` is the block timestamp. A cancelled stream uses `cancelledAt` instead of
                  the current time.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Security ------------------------------------------------------ */}
        <section id="security" className="border-b border-line py-16 sm:py-20">
          <div className="container-page">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.12em] text-primary">
                Security model
              </p>
              <h2 className="mt-3 text-[30px] font-medium leading-tight tracking-[-0.04em] sm:text-[40px]">
                Boring on purpose.
              </h2>
              <p className="mt-3 text-[14px] leading-7 text-muted">
                The safest streaming contract is the one with the fewest ways to touch the
                money. This deployment has no governance surface at all.
              </p>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SECURITY.map((item) => (
                <Card key={item.title} className="p-5">
                  <item.icon className="size-4 text-mint" aria-hidden="true" />
                  <h3 className="mt-4 text-[13.5px] font-medium">{item.title}</h3>
                  <p className="mt-1.5 text-[12px] leading-5 text-muted">{item.body}</p>
                </Card>
              ))}
            </div>

            <TestnetNote className="mt-6 max-w-2xl" />
          </div>
        </section>

        {/* Network ------------------------------------------------------- */}
        <section id="network" className="border-b border-line py-16 sm:py-20">
          <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-mint">
                Built on QDay Aevum
              </p>
              <h2 className="mt-3 text-[30px] font-medium leading-tight tracking-[-0.04em] sm:text-[40px]">
                An EVM testnet with a stablecoin you can actually use.
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-7 text-muted">
                StreamPay targets QDay Aevum Testnet, where tUSD8 is the native test
                stablecoin. Gas is paid in tQDAY; both are free from the QDay faucet.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="secondary">
                  <a href={QDAY.faucetUrl} target="_blank" rel="noreferrer">
                    Claim test tokens
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
                <Button asChild variant="ghost">
                  <a href={QDAY.explorerUrl} target="_blank" rel="noreferrer">
                    Open explorer
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>
              </div>
            </div>

            <Card className="divide-y divide-line">
              {[
                ["Network", QDAY.name],
                ["Chain ID", String(QDAY.chainId)],
                ["Gas token", `${QDAY.nativeCurrency.symbol} · 18 decimals`],
                ["Stream token", `${TUSD8.symbol} · ${TUSD8.decimals} decimals`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-[11.5px] text-faint">{label}</span>
                  <span className="text-right text-[12px] text-foreground/90">{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-[11.5px] text-faint">tUSD8 token</span>
                <AddressDisplay address={TUSD8.address} showExplorer />
              </div>
              {IS_CONTRACT_CONFIGURED ? (
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-[11.5px] text-faint">StreamPay</span>
                  <AddressDisplay address={DEPLOYMENT.streamPay} showExplorer />
                </div>
              ) : (
                <div className="px-5 py-3 text-[11.5px] leading-5 text-faint">
                  StreamPay contract address is configured at deploy time.
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* FAQ ----------------------------------------------------------- */}
        <section id="faq" className="border-b border-line py-16 sm:py-20">
          <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-amber">FAQ</p>
              <h2 className="mt-3 text-[30px] font-medium leading-tight tracking-[-0.04em] sm:text-[40px]">
                Questions worth asking before you stream.
              </h2>
              <p className="mt-3 text-[13px] leading-6 text-muted">
                Still curious? The in-app docs cover the contract, the math and the deployment.
              </p>
              <Button asChild variant="secondary" className="mt-5">
                <Link href="/docs">
                  Read the docs
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="divide-y divide-line border-y border-line">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13.5px] font-medium text-foreground">
                    {item.q}
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-transform duration-150 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2.5 max-w-xl pr-8 text-[12.5px] leading-6 text-muted">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA ----------------------------------------------------------- */}
        <section className="py-16 sm:py-24">
          <div className="container-page">
            <div className="relative overflow-hidden rounded-[24px] border border-line-strong bg-surface px-6 py-12 text-center sm:px-12 sm:py-16">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(38rem_20rem_at_50%_0%,rgba(200,241,105,0.12),transparent_70%)]"
              />
              <div className="relative">
                <p className="text-[11px] uppercase tracking-[0.12em] text-faint">
                  Start on Aevum testnet
                </p>
                <h2 className="mx-auto mt-3 max-w-2xl text-[32px] font-medium leading-tight tracking-[-0.04em] sm:text-[44px]">
                  Open a stream in about a minute.
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-[13.5px] leading-6 text-muted">
                  Connect an EVM wallet, claim free tUSD8 from the faucet, and send your first
                  second-by-second payment.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <Button asChild size="lg" className="h-11">
                    <Link href="/create">
                      Create a stream
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary" className="h-11">
                    <Link href="/dashboard">View dashboard</Link>
                  </Button>
                </div>
                <p className="mt-5 text-[11.5px] text-faint">
                  No account. No email. Your wallet is your identity.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="container-page flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-[11.5px] leading-5 text-faint">
              Real-time stablecoin streams on QDay Aevum Testnet. Non-custodial by
              construction. tUSD8 has no monetary value.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-[11.5px] sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">App</p>
              <Link href="/dashboard" className="block text-muted hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/create" className="block text-muted hover:text-foreground">
                Create stream
              </Link>
              <Link href="/docs" className="block text-muted hover:text-foreground">
                Docs
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">QDay</p>
              <a
                href={QDAY.faucetUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-muted hover:text-foreground"
              >
                Faucet
              </a>
              <a
                href={QDAY.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-muted hover:text-foreground"
              >
                Explorer
              </a>
              <a
                href={QDAY.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-muted hover:text-foreground"
              >
                Developer docs
              </a>
            </div>
            <div className="space-y-2">
              <p className="text-[10.5px] uppercase tracking-[0.08em] text-faint">Contract</p>
              <span className="numeric block text-muted">Chain 44005</span>
              <span className="numeric block text-muted">Solidity 0.8.24</span>
              <span className="block text-muted">Foundry · wagmi · Next.js</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
