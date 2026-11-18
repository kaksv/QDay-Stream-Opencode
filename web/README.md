# StreamPay web

Next.js frontend for StreamPay. Product docs live in the
[root README](../README.md); this file covers day-to-day web work.

## Run

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Environment values are public (`NEXT_PUBLIC_*`) and are baked into the bundle at
build time.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_DEPLOYMENT=local` | Use `lib/deployments/local.json` and the Anvil RPC |
| `NEXT_PUBLIC_DEMO_WALLET=1` | Register the gated Anvil demo connector (never in production) |
| `NEXT_PUBLIC_DEMO_ADDRESS` | Account used by the demo connector |
| `NEXT_PUBLIC_STREAMPAY_ADDRESS` | Override the contract from the deployment record |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | Override the token (local/test only) |
| `NEXT_PUBLIC_RPC_URL` | Override the Aevum RPC |
| `NEXT_PUBLIC_APP_URL` | Canonical URL for metadata, OG tags and sitemap |

## Scripts

```bash
pnpm dev        # dev server
pnpm build      # production build
pnpm start      # serve the production build
pnpm typecheck  # tsc --noEmit
pnpm lint       # eslint
pnpm test       # vitest watch
pnpm test:run   # vitest once
```

## Structure

```
app/                 Routes (landing, dashboard, create, stream detail, docs)
components/app/      Product UI
components/brand/    Amount, live dot, logo, empty states
components/ui/       Radix-based primitives
lib/hooks/           Reads, writes, events, transaction lifecycles
lib/providers/       wagmi, TanStack Query, clock, toasts
lib/accrual.ts       UI mirror of the contract's accrual math
lib/format.ts        Money, percent and compact-number formatting
lib/config.ts        Chain, token, RPC and deployment resolution
```

## Notes

- The chain id is `44005` in both local and Aevum modes. Only the RPC, token and
  contract address change with `NEXT_PUBLIC_DEPLOYMENT=local`.
- A fresh Anvil node has no Multicall3, so the wagmi config disables multicall
  aggregation in local mode.
- Live numbers are estimates between blocks. Finalized balances always come from
  a contract read after confirmation.
- Deploying to Vercel: root directory `web`, Node 22, `pnpm build`. See
  [`../DEPLOYMENT.md`](../DEPLOYMENT.md).
