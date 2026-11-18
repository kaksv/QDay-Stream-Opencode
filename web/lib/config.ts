import type { Address } from "viem";
import aevumDeployment from "@/lib/deployments/aevum.json";
import localDeployment from "@/lib/deployments/local.json";

/**
 * Verified QDay Aevum parameters. Sources:
 * - https://qday.io/build
 * - https://wiki.qday.info/guide/start/add-network
 * - https://wiki.qday.info/Knowledge/technical/developer-guide/contract-verification/
 * - on-chain checks: eth_chainId, tUSD8.decimals(), Multicall3 code
 */
export const QDAY = {
  chainId: 44005,
  chainIdHex: "0xABE5",
  name: "QDay Aevum Testnet",
  shortName: "Aevum",
  nativeCurrency: {
    name: "tQDAY",
    symbol: "tQDAY",
    decimals: 18,
  },
  rpcUrl: "https://rpc-test.qday.info",
  wsUrl: "wss://rpc-test.qday.info",
  explorerUrl: "https://explorer-test.qday.info",
  faucetUrl: "https://faucet.qday.info/en",
  docsUrl: "https://wiki.qday.info/Knowledge/technical/developer-guide/getting-started/",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11" as Address,
} as const;

const useLocalDeployment = process.env.NEXT_PUBLIC_DEPLOYMENT === "local";
const deployment = useLocalDeployment ? localDeployment : aevumDeployment;

export const TUSD8 = {
  address: (process.env.NEXT_PUBLIC_TOKEN_ADDRESS ??
    deployment.token) as Address,
  symbol: "tUSD8",
  name: "tUSD8",
  decimals: 6,
  /** EIP-712 domain verified against the live DOMAIN_SEPARATOR on Aevum. */
  permitDomain: {
    name: "tUSD8",
    version: "2",
  },
  decimalsVerifiedOnChain: true,
} as const;

const deploymentAddress = (process.env.NEXT_PUBLIC_STREAMPAY_ADDRESS ??
  deployment.streamPay) as Address;

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

export const STREAMPAY_ADDRESS = deploymentAddress;
export const IS_CONTRACT_CONFIGURED =
  deploymentAddress.toLowerCase() !== ZERO_ADDRESS;

export const DEPLOYMENT = {
  ...deployment,
  streamPay: deploymentAddress,
  isLocal: useLocalDeployment,
  startBlock: BigInt(deployment.deployBlock ?? 0),
};

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ??
  (useLocalDeployment ? localDeployment.rpcUrl : QDAY.rpcUrl);
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ??
  (useLocalDeployment ? "http://127.0.0.1:8545" : QDAY.explorerUrl);

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Dev-only unlocked Anvil wallet used for local screenshots and e2e. */
export const DEMO_WALLET_ENABLED =
  process.env.NEXT_PUBLIC_DEMO_WALLET === "1";
export const DEMO_WALLET_ADDRESS = (process.env.NEXT_PUBLIC_DEMO_ADDRESS ??
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") as Address;

export const STREAMPAY_DEPLOYED_AT = Number(deployment.deployedAt ?? 0);
