import type { Connector } from "wagmi";
import { QDAY } from "./config";

type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type AddChainError = {
  code?: number;
  message?: string;
  cause?: { code?: number; message?: string };
};

function looksLikeUnknownChain(error: unknown): boolean {
  const e = error as AddChainError;
  const code = e?.code ?? e?.cause?.code;
  const message = `${e?.message ?? ""} ${e?.cause?.message ?? ""}`.toLowerCase();
  return code === 4902 || message.includes("4902") || message.includes("unrecognized chain");
}

export const aevumChainParams = {
  chainId: QDAY.chainIdHex,
  chainName: QDAY.name,
  nativeCurrency: QDAY.nativeCurrency,
  rpcUrls: [QDAY.rpcUrl],
  blockExplorerUrls: [QDAY.explorerUrl],
};

/**
 * Switches to Aevum and falls back to wallet_addEthereumChain when the wallet has not
 * seen chain 44005 yet. The wallet always shows its own confirmation before adding.
 */
export async function switchToAevum(
  connector: Connector | undefined,
  switchChainAsync: (args: { chainId: typeof QDAY.chainId }) => Promise<unknown>,
): Promise<void> {
  try {
    await switchChainAsync({ chainId: QDAY.chainId });
    return;
  } catch (error) {
    if (!connector || !looksLikeUnknownChain(error)) throw error;
    const provider = (await connector.getProvider()) as Eip1193Provider;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [aevumChainParams],
    });
    await switchChainAsync({ chainId: QDAY.chainId });
  }
}

export function isAevum(chainId?: number): boolean {
  return chainId === QDAY.chainId;
}
