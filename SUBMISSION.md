# Submission — Aevum Builder Challenge #1

Copy-ready answers for the DoraHacks submission form. Replace the bracketed
links after the contract and Vercel deployments are live.

## Project name

StreamPay

## Tagline

Pay by the second, not by the invoice. Non-custodial tUSD8 payment streams on
QDay Aevum.

## Short description

StreamPay lets anyone escrow tUSD8 once and have it unlock linearly, second by
second, to a recipient who can withdraw at any time. Senders can cancel to
recover whatever has not accrued. No accounts, no custody, no per-second
transactions, no fees.

## Links

| Field | Link |
|---|---|
| Live app | https://streampay-five.vercel.app |
| Repository | https://github.com/kaksv/QDay-Stream-Opencode |
| Contract | `0xe149A6cb0694382c88B14c7608C50a6151DE79cD` |
| Explorer | https://explorer-test.qday.info/address/0xe149A6cb0694382c88B14c7608C50a6151DE79cD |
| Demo video | `[DEMO_VIDEO_URL]` |
| Network | QDay Aevum Testnet, chain 44005 |

## Full description

**The problem.** Salaries, grants, retainers and subscriptions are still paid in
lumps: the work happens continuously, the money moves monthly. On-chain payments
inherit the same batch mentality, and "streaming" products usually reintroduce
custody, keepers or per-second transactions.

**The solution.** StreamPay is a single immutable escrow contract plus a
wallet-native frontend. A sender funds the entire stream up front. The recipient's
balance accrues linearly against block timestamps and can be withdrawn whenever
they choose. Cancellation freezes accrual at that block: the recipient keeps what
accrued, the sender is refunded the rest, atomically.

**What is built.**

- Solidity 0.8.24 contract with no owner, admin, pause, proxy, fee or upgrade
  path. One immutable token (official tUSD8), `SafeERC20`, reentrancy guards,
  fee-on-transfer rejection, exact-amount approvals, and best-effort EIP-2612
  permits that still enforce allowance.
- 61 Foundry tests: unit, fuzz, and stateful invariants for solvency,
  per-stream accounting and bounded withdrawals.
- Next.js App Router app with a landing page, dashboard, stream builder, live
  stream detail, receipts, protocol docs, wallet connection and network switching.
- A shared chain-corrected clock so every live number on screen agrees, with
  estimates clearly separated from finalized on-chain balances.
- 29 Vitest tests for formatting and accrual math, plus a clean
  typecheck, lint and production build.

**Why QDay.** Aevum's low fees and fast finality make second-level balances
usable, and the official tUSD8 gives a stable unit for salaries and grants. The
contract targets EVM `paris` and uses the canonical Multicall3 address already
deployed on Aevum.

**Safety.** The deployment is a testnet deployment and is unaudited. tUSD8 and
tQDAY have no monetary value. The contract can only move funds through
withdrawals to the recipient and cancellation refunds to the sender.

## Track

`[SELECT THE TRACK SHOWN IN THE HACKATHON FORM]`

## Tech stack

Solidity, Foundry, OpenZeppelin, Next.js 16 (App Router), React 19, TypeScript,
Tailwind CSS 4, shadcn-style Radix primitives, wagmi, viem, TanStack Query,
Motion, Vitest.

## What was hard

- Keeping the UI's second-by-second animation honest: one shared clock anchored
  to block time, with every finalized number re-read from the contract.
- Making permit-based creation safe: the permit is best-effort, and the
  allowance/transfer checks run regardless, so a front-run cannot create an
  unfunded stream.
- Designing cancellation so both sides settle in one transaction without opening
  a reentrancy or double-spend path.
- Testing time: warp-based unit tests plus stateful invariants that mix creates,
  withdrawals, cancellations and time jumps.

## What's next

- An indexer for cross-account history and notifications.
- Stream templates and recurring payroll batches.
- Optional transferability of recipient positions.
- An independent audit before any mainnet deployment.

## Testnet disclaimer

StreamPay runs on QDay Aevum Testnet. tUSD8 and tQDAY are free test assets with
no monetary value and no expectation of value. The contract is unaudited.

## Final checklist

- [x] Contract deployed to Aevum
- [ ] Contract verified on the explorer
- [ ] `deployments/aevum.json` and `web/lib/deployments/aevum.json` updated
- [x] Web app deployed to Vercel with `NEXT_PUBLIC_APP_URL` set
- [ ] Demo wallet flags absent from the production build
- [ ] Demo video recorded (see `DEMO.md`)
- [x] Repository public, README links working
- [ ] Submission form links checked in an incognito window
