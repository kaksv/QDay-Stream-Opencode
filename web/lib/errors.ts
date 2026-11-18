export type TxErrorInfo = {
  title: string;
  description: string;
  rejected: boolean;
};

function messageOf(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const extra = (error as Error & { shortMessage?: string }).shortMessage;
    return `${error.name}: ${extra ?? ""} ${error.message}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function codeOf(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { code?: number; cause?: { code?: number }; data?: { error?: { code?: number } } };
  return e.code ?? e.cause?.code ?? e.data?.error?.code;
}

/** Turns wallet/RPC/contract failures into calm, actionable copy. */
export function describeTxError(error: unknown): TxErrorInfo {
  const message = messageOf(error);
  const code = codeOf(error);
  const lower = message.toLowerCase();

  if (
    code === 4001 ||
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request") ||
    lower.includes("request rejected")
  ) {
    return {
      title: "Request cancelled",
      description: "Nothing was sent. You can try again whenever you're ready.",
      rejected: true,
    };
  }

  if (lower.includes("nothingtowithdraw")) {
    return {
      title: "Nothing to withdraw yet",
      description: "This stream hasn't accrued a withdrawable balance. Try again in a moment.",
      rejected: false,
    };
  }

  if (lower.includes("streamalreadyended")) {
    return {
      title: "This stream has ended",
      description: "The full amount has accrued. Withdraw your balance instead.",
      rejected: false,
    };
  }

  if (lower.includes("streamalreadycancelled")) {
    return {
      title: "Stream already cancelled",
      description: "Accrual is frozen. Any accrued balance can still be withdrawn.",
      rejected: false,
    };
  }

  if (lower.includes("insufficientallowance")) {
    return {
      title: "Approval still needed",
      description: "Approve the stream amount, then create the stream again.",
      rejected: false,
    };
  }

  if (lower.includes("insufficient funds")) {
    return {
      title: "Not enough tQDAY for gas",
      description: "Claim free testnet gas from the QDay faucet, then retry.",
      rejected: false,
    };
  }

  if (lower.includes("exceeds balance") || lower.includes("transfer amount exceeds")) {
    return {
      title: "Not enough tUSD8",
      description: "Your balance is lower than this amount. Claim more test tokens from the QDay faucet.",
      rejected: false,
    };
  }

  if (lower.includes("notrecipient") || lower.includes("notstreamparty")) {
    return {
      title: "This wallet can't do that",
      description: "Only the recipient can withdraw, and only the two stream parties can cancel.",
      rejected: false,
    };
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("http request failed") ||
    lower.includes("timeout") ||
    lower.includes("network error") ||
    lower.includes("could not coalesce")
  ) {
    return {
      title: "Aevum RPC didn't respond",
      description: "Check your connection and try again. No funds moved.",
      rejected: false,
    };
  }

  if (lower.includes("nonce")) {
    return {
      title: "Wallet nonce out of sync",
      description: "Reset the account activity in your wallet, or wait a moment and retry.",
      rejected: false,
    };
  }

  if (lower.includes("chain") && lower.includes("mismatch")) {
    return {
      title: "Wrong network",
      description: "Switch your wallet to QDay Aevum Testnet (chain 44005) and retry.",
      rejected: false,
    };
  }

  const cleaned = message
    .replace(/^Error:\s*/i, "")
    .replace(/\s+/g, " ")
    .slice(0, 180);

  return {
    title: "Transaction didn't go through",
    description: cleaned || "The network rejected the request. Nothing moved. Try again.",
    rejected: false,
  };
}
