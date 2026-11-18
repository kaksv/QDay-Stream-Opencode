"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { parseEventLogs } from "viem";
import { toast } from "sonner";
import { streamPayAbi } from "@/lib/abi/streamPay";
import { IS_CONTRACT_CONFIGURED, QDAY, STREAMPAY_ADDRESS } from "@/lib/config";
import { aevumTestnet } from "@/lib/chain";
import { describeTxError } from "@/lib/errors";
import { formatTokenAmount } from "@/lib/format";

export type WithdrawStep =
  | "idle"
  | "signing"
  | "confirming"
  | "success"
  | "error";

export type WithdrawResult = {
  ok: boolean;
  hash?: `0x${string}`;
  amount?: bigint;
  cancelled?: boolean;
};

/**
 * Recipient-side withdrawals. Both the single and batch paths share one lifecycle so the
 * UI only has to reason about one busy state.
 */
export function useWithdraw() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<WithdrawStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [amount, setAmount] = useState<bigint | null>(null);
  const [streamIds, setStreamIds] = useState<bigint[]>([]);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
    setAmount(null);
    setStreamIds([]);
  }, []);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
    queryClient.invalidateQueries({ queryKey: ["streams"] });
    queryClient.invalidateQueries({ queryKey: ["stream-events"] });
  }, [queryClient]);

  const run = useCallback(
    async (ids: bigint[]): Promise<WithdrawResult> => {
      setError(null);
      setTxHash(null);
      setAmount(null);
      setStreamIds(ids);

      if (!address) {
        const message = "Connect the recipient wallet first.";
        setError(message);
        toast.error(message);
        return { ok: false };
      }
      if (!IS_CONTRACT_CONFIGURED) {
        const message = "StreamPay is not configured for this deployment yet.";
        setError(message);
        toast.error(message);
        return { ok: false };
      }
      if (chainId !== QDAY.chainId) {
        setError("Switch your wallet to QDay Aevum (chain 44005) first.");
        toast.error("Wrong network", {
          description: "Switch to QDay Aevum (chain 44005) and retry.",
        });
        return { ok: false };
      }
      if (ids.length === 0) {
        setError("Select at least one stream.");
        return { ok: false };
      }

      try {
        setStep("signing");
        const hash =
          ids.length === 1
            ? await writeContractAsync({
                address: STREAMPAY_ADDRESS,
                abi: streamPayAbi,
                functionName: "withdraw",
                args: [ids[0]],
                chainId: aevumTestnet.id,
              })
            : await writeContractAsync({
                address: STREAMPAY_ADDRESS,
                abi: streamPayAbi,
                functionName: "withdrawMany",
                args: [ids],
                chainId: aevumTestnet.id,
              });

        setTxHash(hash);
        setStep("confirming");

        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId: aevumTestnet.id,
          confirmations: 1,
          timeout: 120_000,
        });

        if (receipt.status !== "success") {
          throw new Error("The withdrawal reverted on-chain.");
        }

        const logs = parseEventLogs({
          abi: streamPayAbi,
          eventName: "Withdrawal",
          logs: receipt.logs,
        });
        const total = logs.reduce(
          (sum, log) => sum + (log.args.amount ?? 0n),
          0n,
        );

        setAmount(total);
        setStep("success");
        invalidate();

        toast.success(
          ids.length > 1 ? "Withdrawals complete" : "Withdrawal complete",
          {
            description:
              total > 0n
                ? `${formatTokenAmount(total)} moved to your wallet.`
                : "The accrued balance is now in your wallet.",
          },
        );

        return { ok: true, hash, amount: total };
      } catch (caught) {
        const info = describeTxError(caught);
        setStep("error");
        setError(info.description);
        if (info.rejected) {
          toast.info("Request cancelled", { description: "Nothing was sent." });
        } else {
          toast.error(info.title, { description: info.description });
        }
        return { ok: false, cancelled: info.rejected };
      }
    },
    [address, chainId, config, invalidate, writeContractAsync],
  );

  const withdraw = useCallback(
    (streamId: bigint) => run([streamId]),
    [run],
  );
  const withdrawMany = useCallback((ids: bigint[]) => run(ids), [run]);

  return {
    withdraw,
    withdrawMany,
    reset,
    step,
    error,
    txHash,
    amount,
    streamIds,
    isBusy: step === "signing" || step === "confirming",
  };
}
