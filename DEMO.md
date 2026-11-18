# Demo script

A three-minute walkthrough for judges, plus the exact local setup.

## Run it locally

```bash
# terminal 1 — chain with the Aevum chain id
anvil --chain-id 44005

# terminal 2 — token, contract, and seeded streams
cd contracts
forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url http://127.0.0.1:8545 --broadcast

# terminal 3 — app
cd web
cp .env.example .env.local   # then set the two flags below
pnpm install
pnpm dev
```

`web/.env.local` for the local demo:

```dotenv
NEXT_PUBLIC_DEPLOYMENT=local
NEXT_PUBLIC_DEMO_WALLET=1
NEXT_PUBLIC_DEMO_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

The demo connector signs as Anvil account #0. It is gated behind
`NEXT_PUBLIC_DEMO_WALLET=1` and must never be enabled in production.

### Seeded fixture

| Account | Address | Streams |
|---|---|---|
| #0 (demo) | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | receives 8,400 / 30 d, 1,250 / 90 min, 2,500 / 7 d; sends 15,000 / 14 d, 4,000 / 30 d (1 h delay) |
| #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | sender of two incoming streams |
| #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | sender of one incoming stream |

Each account starts with 1,000,000 mock tUSD8. The mock token is local only; the
Aevum deployment uses the official tUSD8.

## The walkthrough

### 1. Landing page — 20 s

Open `/`. Point at the hero preview: value moving every second, the testnet
disclaimer, and "full amount escrowed up front". Open **Launch app**.

### 2. Dashboard — 40 s

- The shared clock ticks; `block N` is live.
- **Receiving** shows three streams. The top card says how much is withdrawable
  across all of them, and each card's number climbs every second.
- Switch to **Sending**: two outgoing streams, same live accrual, no custody.
- Note the counts and "Auto-refreshing every few seconds" — the chain is the
  source of truth, the animation is an estimate.

### 3. Create a stream — 60 s

1. **New stream**.
2. Paste a recipient address (use account #1 for a clean demo).
3. Enter `100`, keep the duration short (e.g. 2 hours) so movement is visible.
4. Show the live summary: rate per second, start/end, recipient, approval method.
5. Choose **Sign & create** (permit) and open the review dialog.
6. Confirm: the permit is signed, one transaction creates and funds the stream.
   The success state links the hash.
7. Optionally repeat with **Approve first** to show the two-transaction path and
   the exact-amount approval (no residual allowance).

### 4. Stream detail — 40 s

Open the new stream from the dashboard.

- Parties, amount, rate, start/end, progress bar.
- **Withdraw** a partial balance from the recipient view; the receipt section
  fills in with the transaction hash and the finalized amount.
- Cancel as the sender: accrual freezes, the recipient keeps what accrued, the
  sender is refunded the rest. Point out that either party can cancel, and that
  a completed stream cannot.

### 5. Docs and network — 20 s

- `/docs` explains the model, the contract surface, and the local setup.
- The network card shows chain ID 44005, tUSD8, the explorer and the faucet.
- Footer: "tUSD8 has no monetary value."

## What to emphasize

- **Non-custodial:** no accounts, no passwords, no server-held keys.
- **Fully funded:** the contract always holds every outstanding obligation.
- **Second-by-second:** no per-second transactions, no keeper, no gas per tick.
- **Either party can cancel:** accrual freezes; both sides are settled atomically.
- **Estimates are labeled:** the UI animates, the contract decides.

## Reset

`anvil` state is in memory. Restarting it wipes the deployment; re-run the
`DeployLocal` script and reload the app. Delete `web/.next` if a build cache
survives a config change.

## Recording checklist

- 1280×720 or larger, browser zoom 100%.
- Close extra tabs and notifications.
- Start on the landing page, end on a completed withdrawal receipt.
- Keep the testnet disclaimer visible in at least one shot.
