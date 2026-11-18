import { defineChain } from "viem";
import { EXPLORER_URL, QDAY, RPC_URL } from "./config";

export const aevumTestnet = defineChain({
  id: QDAY.chainId,
  name: QDAY.name,
  nativeCurrency: QDAY.nativeCurrency,
  rpcUrls: {
    default: {
      http: [RPC_URL],
      webSocket: [QDAY.wsUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "Aevum Explorer",
      url: EXPLORER_URL,
    },
  },
  contracts: {
    multicall3: {
      address: QDAY.multicall3,
    },
  },
  testnet: true,
});
