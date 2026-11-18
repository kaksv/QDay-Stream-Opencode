import { createConfig, http, type CreateConnectorFn } from "wagmi";
import { injected, mock } from "wagmi/connectors";
import { aevumTestnet } from "./chain";
import {
  DEMO_WALLET_ADDRESS,
  DEMO_WALLET_ENABLED,
  DEPLOYMENT,
  RPC_URL,
} from "./config";

const connectors: CreateConnectorFn[] = [
  injected({
    shimDisconnect: true,
  }),
];

if (DEMO_WALLET_ENABLED) {
  connectors.push(
    mock({
      accounts: [DEMO_WALLET_ADDRESS],
    }) as CreateConnectorFn,
  );
}

export const wagmiConfig = createConfig({
  chains: [aevumTestnet],
  connectors,
  transports: {
    [aevumTestnet.id]: http(RPC_URL, {
      batch: true,
      retryCount: 2,
    }),
  },
  // Aevum ships Multicall3 at the canonical address; a fresh Anvil node does
  // not. Keep the local demo on plain eth_call so reads do not revert.
  batch: DEPLOYMENT.isLocal ? false : { multicall: true },
  pollingInterval: 4_000,
  ssr: false,
  multiInjectedProviderDiscovery: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
