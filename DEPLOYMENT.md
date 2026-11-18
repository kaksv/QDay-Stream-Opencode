# Deployment

Two deployments: the **contract** on QDay Aevum Testnet, and the **web app** on
Vercel. The app reads the contract address from a checked-in deployment record,
so deploy the contract first.

## 0. Prerequisites

- Foundry (`forge`, `cast`) on `PATH`
- Node 22+ and pnpm 9 (`corepack enable`)
- A funded Aevum deployer account (tQDAY for gas)
- Accounts for GitHub and Vercel

Network facts (verified against the live chain):

| | |
|---|---|
| Chain ID | `44005` (`0xABE5`) |
| RPC | `https://rpc-test.qday.info` |
| Explorer | `https://explorer-test.qday.info` |
| Faucet | `https://faucet.qday.info/en` |
| Gas token | tQDAY (18 decimals) |
| tUSD8 | `0x456569838f1d43009A91ebA4263147Afd7233483` (6 decimals) |

## 1. Fund a deployer

Generate a throwaway deployer key (never commit it):

```bash
cd contracts
cast wallet new
```

Save the private key in `contracts/.env` (already git-ignored, `chmod 600`):

```bash
PRIVATE_KEY=0x...
EXPECTED_CHAIN_ID=44005
WRITE_DEPLOYMENT=true
```

Request tQDAY from the QDay faucet for the printed address. A deploy costs well
under 0.001 tQDAY at typical testnet gas prices.

## 2. Simulate, then broadcast

Always simulate first. The script refuses to run if `block.chainid` is not
`EXPECTED_CHAIN_ID` (default `44005`).

```bash
cd contracts
set -a && source .env && set +a

# dry run — no transactions sent
forge script script/Deploy.s.sol:Deploy --rpc-url https://rpc-test.qday.info

# broadcast
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc-test.qday.info --broadcast
```

Optional env:

| Variable | Default |
|---|---|
| `TOKEN_ADDRESS` | official tUSD8 |
| `EXPECTED_CHAIN_ID` | `44005` |
| `WRITE_DEPLOYMENT` | `true` |

On success the script writes:

- `deployments/aevum.json`
- `web/lib/deployments/aevum.json`

Both contain `streamPay`, `deployer`, `deployBlock`, `deployedAt`, the token and
the explorer URL. The app uses them at build time.

> The dry run also writes a record using the **predicted** address. Treat it as a
> preview until the broadcast succeeds and the explorer shows the contract.

## 3. Verify on the explorer

QDay uses Blockscout-compatible verification:

```bash
cd contracts
forge verify-contract \
  --chain-id 44005 \
  --verifier blockscout \
  --verifier-url https://explorer-test.qday.info/api \
  --constructor-args $(cast abi-encode "constructor(address)" 0x456569838f1d43009A91ebA4263147Afd7233483) \
  <STREAMPAY_ADDRESS> \
  src/StreamPay.sol:StreamPay
```

If the explorer asks for an API key, leave it empty; Blockscout accepts the
standard flow. Do not invent a verifier URL — this is the one documented by QDay.

Confirm before announcing:

1. The explorer page shows the contract source.
2. `cast call <STREAMPAY_ADDRESS> "token()(address)" --rpc-url https://rpc-test.qday.info`
   returns the official tUSD8 address.
3. `cast call <STREAMPAY_ADDRESS> "streamCount()(uint256)" --rpc-url https://rpc-test.qday.info`
   returns `0` on a fresh deployment.

## 4. Build the web app

```bash
cd web
cp .env.example .env.local   # or set the values in the host's dashboard
pnpm install --frozen-lockfile
pnpm build
```

Production environment variables:

| Variable | Required | Meaning |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | yes | Canonical URL for metadata, OG tags, sitemap |
| `NEXT_PUBLIC_STREAMPAY_ADDRESS` | optional | Overrides the checked-in deployment record |
| `NEXT_PUBLIC_RPC_URL` | optional | Overrides `https://rpc-test.qday.info` |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | optional | Only for non-Aevum deployments |

Never set `NEXT_PUBLIC_DEPLOYMENT=local` or `NEXT_PUBLIC_DEMO_WALLET=1` in
production. All `NEXT_PUBLIC_*` values are public.

## 5. Vercel

### Option A — dashboard (recommended)

1. Push the repo to GitHub (see below).
2. In Vercel: **Add New → Project → Import** the repository.
3. Set **Root Directory** to `web`.
4. Framework preset: **Next.js**. Build command `pnpm build`, install
   `pnpm install --frozen-lockfile`. Node.js 22.x.
5. Add `NEXT_PUBLIC_APP_URL=https://<project>.vercel.app` (or your domain).
6. Deploy, then open the URL and check:
   - the network banner reads Aevum Testnet,
   - the dashboard loads streams after connecting a wallet,
   - `/docs` renders and the footer links resolve.

`web/.env.local` and `contracts/.env` are git-ignored and never uploaded.

### Option B — CLI

```bash
npm i -g vercel
vercel login
cd web
vercel --prod
```

Set the same environment variables in the project settings (or with
`vercel env add`). If you deploy from a clean checkout, make sure
`web/lib/deployments/aevum.json` contains the real address before building.

## 6. Post-deploy smoke test

1. Connect a wallet on Aevum Testnet (chain 44005). If the wallet is on another
   network, use the in-app switch/add prompt.
2. Get tUSD8 from the QDay faucet if the balance is zero.
3. Create a small stream to a second address; approve once (or sign a permit).
4. Confirm the stream appears in **Sending** and, from the recipient wallet, in
   **Receiving** with a live second-by-second balance.
5. Withdraw a partial balance, then cancel and confirm the sender refund.
6. Open the transaction hash in the explorer.

## Troubleshooting

- **`chain id mismatch`** — the RPC is not Aevum, or `EXPECTED_CHAIN_ID` is set
  to something else. Check `cast chain-id --rpc-url <rpc>`.
- **`insufficient funds for gas`** — the deployer has no tQDAY. Use the faucet.
- **App still points at the zero address** — the build ran before the deployment
  record was written, or `NEXT_PUBLIC_STREAMPAY_ADDRESS` is unset and the record
  is stale. Rebuild after updating `web/lib/deployments/aevum.json`.
- **Reads fail only locally** — a fresh Anvil node has no Multicall3; the app
  disables multicall aggregation when `NEXT_PUBLIC_DEPLOYMENT=local`.
- **Contract verification fails** — confirm the constructor argument is the
  token address and the compiler settings match `contracts/foundry.toml`
  (Solidity 0.8.24, optimizer 200, EVM `paris`).
