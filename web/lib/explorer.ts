import { DEPLOYMENT, EXPLORER_URL, IS_CONTRACT_CONFIGURED } from "./config";

export const explorerEnabled = IS_CONTRACT_CONFIGURED && !DEPLOYMENT.isLocal;

export function txUrl(hash: string): string | null {
  if (!explorerEnabled) return null;
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function addressUrl(address: string): string | null {
  if (!explorerEnabled) return null;
  return `${EXPLORER_URL}/address/${address}`;
}

export function blockUrl(block: bigint | number): string | null {
  if (!explorerEnabled) return null;
  return `${EXPLORER_URL}/block/${block}`;
}

export function contractUrl(): string | null {
  if (!explorerEnabled) return null;
  return `${EXPLORER_URL}/address/${DEPLOYMENT.streamPay}`;
}
