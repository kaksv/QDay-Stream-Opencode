# Security

StreamPay holds real value (testnet tUSD8) in escrow, so the contract is written
to be small enough to audit in one sitting. This document describes what is
protected, how, and what is explicitly out of scope.

> **Status:** unaudited, testnet-only. tUSD8 and tQDAY have no monetary value.
> Do not deploy this contract to mainnet with assets you care about without an
> independent audit.

## Trust model

| Party | Can | Cannot |
|---|---|---|
| Sender | Create streams, cancel their streams, recover unaccrued funds | Withdraw the recipient's accrued balance, move another user's funds |
| Recipient | Withdraw accrued balance, cancel their stream (freezing accrual) | Withdraw more than accrued, touch the sender's refund |
| Anyone else | Read state, create their own streams | Withdraw, cancel, or alter someone else's stream |
| Deployer | Nothing after deployment | Upgrade, pause, change the token, take fees, rescue funds |
| Frontend | Build transactions, display estimates | Move funds outside contract rules |

There is **no owner, admin, proxy, pause switch, fee, or rescue function**. The
token is immutable. The only privileged capability in the system is the
recipient's right to withdraw their own accrued balance.

## Invariants

The stateful invariant suite (`contracts/test/StreamPayInvariant.t.sol`) drives
random creates, withdrawals, cancels, and time jumps against a handler, then
asserts:

1. **Solvency** — `token.balanceOf(StreamPay)` equals the sum of every stream's
   remaining obligation (`amount − withdrawn − refunded`).
2. **Per-stream accounting** — for every stream,
   `withdrawn ≤ accrued ≤ amount`, and cancelled streams never accrue past
   `cancelledAt`.
3. **Bounded withdrawals** — total withdrawn per stream never exceeds the
   accrued amount; the recipient can never drain another stream's escrow.

Unit and fuzz tests additionally cover:

- exact-amount approval leaves no residual allowance;
- fee-on-transfer tokens revert atomically;
- permit front-running and invalid permits cannot bypass the allowance check;
- cancellation conserves total value across sender and recipient;
- reentrancy on withdrawal is blocked;
- batch limits, duplicate ids, foreign streams, and empty batches revert or skip
  as documented;
- pagination is newest-first and bounded.

## Threats and mitigations

### Reentrancy

Every state-changing external function is `nonReentrant`. Withdrawals update
`withdrawn` before `safeTransfer`, and cancellation writes `cancelledAt` and
refunds before returning. A malicious token could still re-enter, but the guard
and the checks-effects-interactions ordering stop double spends.

### Fee-on-transfer / rebasing tokens

The contract measures the balance delta on deposit and requires it to equal
`amount`; otherwise the transaction reverts. A token that changes balances
asynchronously (rebasing) is out of scope: the solvency invariant assumes a
standard, non-rebasing ERC-20.

### Permit front-running / unsupported wallets

`createStreamWithPermit` calls `permit` inside `try/catch` and then always runs
the normal allowance and transfer checks. If an attacker submits the permit
first, the victim's call fails only the permit and still succeeds if allowance
exists. If the wallet cannot sign typed data, the UI's "Approve first" path is a
plain two-transaction flow.

### Rounding

Accrual rounds down. The recipient can never withdraw more than the linear
schedule allows. The unallocated remainder (at most a few base units) stays in
escrow until the stream completes, when `accrued == amount`.

### Griefing

- A sender cannot cancel and still leave the recipient unpaid: cancellation pays
  the accrued remainder in the same transaction.
- A recipient cannot block the sender's refund by refusing to withdraw:
  cancellation settles both sides.
- Spam streams cost the sender the full amount plus gas, and cannot affect other
  streams.
- Batch withdrawal is capped at 50 ids and skips zero balances, so a large
  account cannot be forced into an unbounded loop.

### Time

Accrual uses `block.timestamp`. Validators can drift it by seconds; this shifts
accrual by the same seconds but cannot break solvency. Scheduled starts must be
at or after the current block timestamp, and `endTime` must be strictly greater
than `startTime`.

### Frontend risks

- **Estimates vs. finalized balances.** The UI animates accrual locally but
  labels it as an estimate; after every write it re-reads the contract.
- **Wrong network.** The app checks `chainId` and offers a user-initiated
  `wallet_switchEthereumChain` / `wallet_addEthereumChain`.
- **Phishing.** The app never asks for a seed phrase or private key. A wallet
  signature is only used for an EIP-2612 permit scoped to the exact amount.
- **Testnet confusion.** A persistent banner and copy state that tUSD8 has no
  monetary value.

## Known limitations

- **Single token.** Only the token passed to the constructor is supported.
- **No partial cancellation.** Cancellation freezes the stream; it does not let
  the sender reduce the rate or extend the duration.
- **No transfer of stream ownership.** Recipient and sender are fixed.
- **`uint128` amounts.** Single streams above ~3.4e38 base units are rejected.
- **Pagination, not indexing.** Dashboards read pages of 50 from the contract.
  There is no off-chain indexer; event history is read per stream from logs.
- **Unaudited testnet deployment.** No bug bounty, no formal verification.

## Reporting

This is a hackathon project. If you find an issue, open a private report or
contact the maintainer before disclosing it publicly. Include the transaction,
the affected function, and a minimal reproduction.
