# Architecture

StreamPay is deliberately small: one immutable escrow contract, one token, and a
frontend that treats the chain as the source of truth.

## The core idea

A sender escrows the **full** stream amount when creating it:

```
balanceOf(StreamPay) >= Σ (amount − withdrawn − refunded)
```

Nothing is transferred on a schedule. The contract stores a start and end time
and computes accrual on every read:

```
accrued(t)  = amount × clamp(t − startTime, 0, duration) / duration
duration    = endTime − startTime
```

- Before `startTime`: `0`.
- After `endTime`: the full `amount`.
- After cancellation: accrual freezes at `cancelledAt`.
- Rounding is integer division, so the recipient can never withdraw more than
  accrued; the final wei-dust stays in escrow until completion.

That is the whole accounting model. No interest, no compounding, no per-second
transactions, no keeper, no cron job.

## Contract surface

`contracts/src/StreamPay.sol`

| Function | Who | What |
|---|---|---|
| `createStream(recipient, amount, startTime, endTime)` | anyone | Pull `amount` with `transferFrom`, store the stream, emit `StreamCreated` |
| `createStreamWithPermit(...)` | anyone | Best-effort EIP-2612 permit, then the same creation path |
| `withdraw(streamId)` | recipient | Send `accrued − withdrawn` to the recipient |
| `withdrawMany(streamIds[])` | recipient | Same, batched; max 50 ids, skips zero balances |
| `cancelStream(streamId)` | sender or recipient | Freeze at `now`, pay the recipient's accrued remainder, refund the sender |
| `getStream(id)` | anyone | Flattened view: amounts, times, status |
| `accruedOf(id)` / `withdrawableOf(id)` | anyone | Convenience reads |
| `getSenderStreams` / `getRecipientStreams` | anyone | Newest-first pagination, max 50 per page |
| `senderStreamCount` / `recipientStreamCount` / `streamCount` | anyone | Counts for dashboards |

Events: `StreamCreated`, `Withdrawal`, `StreamCancelled`. The frontend uses them
for history and receipts; balances are always re-read from the contract.

### Ownership and upgradeability

There is none. The contract has:

- no `Ownable`, no admin role, no pause, no fee recipient;
- no proxy, no delegatecall, no upgrade path;
- one immutable `token` address, fixed at construction.

Shipping a new version means deploying a new contract. Existing streams keep
working because they live entirely in the old contract's storage.

### Safety properties

- `ReentrancyGuard` on every state-changing entry point.
- `SafeERC20` for non-standard tokens.
- Fee-on-transfer tokens are rejected by measuring the balance delta
  (`UnexpectedTransferAmount`) instead of trusting `amount`.
- A failed permit is swallowed, then the allowance check still runs. A front-run
  or unsupported permit can never create an unfunded stream.
- `uint128` amounts and `uint64` timestamps bound the arithmetic:
  `amount × elapsed` fits in `uint256`.
- Either party can cancel an active stream. Neither can cancel twice, and a
  completed stream cannot be cancelled.
- Withdrawals only ever pay the recipient; cancellation only ever pays the
  recipient's accrued remainder and the sender's refund.

## Frontend

Next.js App Router, all product routes client-rendered behind a wallet gate.

```
app/
  page.tsx                 Landing page (static, live hero preview)
  (app)/dashboard          Receiving/sending streams, totals, withdraw-all
  (app)/create             Stream builder with review + permit/approve choice
  (app)/streams/[id]       Live detail, history, receipt, cancel/withdraw
  (app)/docs               Protocol and network documentation
```

### Reads

- `useAccountStreams(role)` → `getRecipientStreams` / `getSenderStreams`,
  paginated 50 at a time, refreshed every 7 s.
- `useStreamCounts()` → total, sent and received counts.
- `useStream(id)` → a single stream, refreshed every 5 s.
- `useStreamEvents(id)` → `StreamCreated`, `Withdrawal`, `StreamCancelled` logs
  scoped to the deployment block.
- Token balance, allowance and native gas balance are read with wagmi.

All reads are keyed by chain id and the configured contract address, so a
network switch or a redeploy invalidates them cleanly.

### The clock

`lib/providers/clock-provider.tsx` keeps a single shared clock:

1. Read the latest block timestamp.
2. Estimate the offset between the browser clock and chain time.
3. Tick locally every second.

Every live number on screen uses this clock, so the dashboard and a detail page
show the same accrual, and the animation matches what the contract will compute
on the next block. The UI labels accrual as an estimate; finalized balances come
from `withdrawableOf` / `getStream` after a transaction.

### Writes

`use-create-stream`, `use-withdraw`, and `use-cancel-stream` wrap wagmi's
`writeContract` with a shared lifecycle: simulate → sign → pending toast → wait
for receipt → invalidate the relevant query keys → success state with an
explorer link.

Creation supports two approval paths:

- **Permit (one transaction):** sign EIP-2612 typed data, then call
  `createStreamWithPermit`. If the wallet cannot sign typed data, the UI falls
  back to approval.
- **Approve first (two transactions):** `approve(amount)` then `createStream`.
  The approval is for the exact amount, so no allowance is left behind.

### Configuration and deployments

`lib/config.ts` resolves everything from checked-in deployment records plus
optional public env vars:

| Value | Source |
|---|---|
| Chain id / RPC / explorer | `QDAY` constants, overridable by `NEXT_PUBLIC_RPC_URL` |
| Token | `NEXT_PUBLIC_TOKEN_ADDRESS` → deployment record → official tUSD8 |
| StreamPay address | `NEXT_PUBLIC_STREAMPAY_ADDRESS` → deployment record |
| Local mode | `NEXT_PUBLIC_DEPLOYMENT=local` |

`NEXT_PUBLIC_DEPLOYMENT=local` also switches the RPC and token to the Anvil
fixture, so the same build can run against a local chain with the same chain id
(44005) without touching Aevum addresses.

### Local demo connector

`lib/wagmi.ts` registers a wagmi `mock` connector only when
`NEXT_PUBLIC_DEMO_WALLET=1`. It connects as Anvil account #0, which is unlocked,
so create/withdraw/cancel work without a browser extension. This is gated behind
an explicit env flag and documented as never-for-production.

## Trust boundaries

- **Chain:** authoritative for balances, timestamps, status and history.
- **Wallet:** authoritative for signatures and the sender's identity.
- **Frontend:** a viewer and transaction builder. A malicious frontend could
  show wrong numbers, but it cannot move funds outside the contract's rules.
- **RPC:** can censor or delay reads/writes, but cannot forge balances because
  every state-changing path verifies allowances and balances on-chain.

## Why one token

A single immutable token removes the entire class of "wrong token registered"
admin bugs and makes the solvency invariant trivial to audit. StreamPay is not a
token router; it is a time-locked escrow for one stablecoin.
