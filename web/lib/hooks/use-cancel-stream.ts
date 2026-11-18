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

export type CancelStep = "idle" | "signing" | "confirming" | "success" | "error";

export type CancelResult = {
  ok: boolean;
  hash?: `0x${string}`;
  senderRefund?: bigint;
  recipientWithdrawable?: bigint;
  cancelled?: boolean;
};

/**
 * Cancels an active stream. Accrual freezes at the cancellation block timestamp; the
 * sender gets the unaccrued remainder and the recipient keeps any accrued balance.
 */
export function useCancelStream() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<CancelStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [senderRefund, setSenderRefund] = useState<bigint | null>(null);
  const [recipientWithdrawable, setRecipientWithdrawable] = useState<
    bigint | null
  >(null);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
    setSenderRefund(null);
    setRecipientWithdrawable(null);
  }, []);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
    queryClient.invalidateQueries({ queryKey: ["streams"] });
    queryClient.invalidateQueries({ queryKey: ["stream-events"] });
  }, [queryClient]);

  const cancel = useCallback(
    async (streamId: bigint): Promise<CancelResult> => {
      setError(null);
      setTxHash(null);
      setSenderRefund(null);
      setRecipientWithdrawable(null);

      if (!address) {
        const message = "Connect a stream party wallet first.";
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

      try {
        setStep("signing");
        const hash = await writeContractAsync({
          address: STREAMPAY_ADDRESS,
          abi: streamPayAbi,
          functionName: "cancelStream",
          args: [streamId],
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
          throw new Error("The cancellation reverted on-chain.");
        }

        const [cancelled] = parseEventLogs({
          abi: streamPayAbi,
          eventName: "StreamCancelled",
          logs: receipt.logs,
        });
        const refund = cancelled?.args.senderRefund ?? null;
        const accrued = cancelled?.args.recipientWithdrawable ?? null;

        setSenderRefund(refund);
        setRecipientWithdrawable(accrued);
        setStep("success");
        invalidate();

        toast.success("Stream cancelled", {
          description:
            refund != null && refund > 0n
              ? `${formatTokenAmount(refund)} returned to the sender. Accrued funds stay with the recipient.`
              : "Accrual is frozen. Any accrued balance stays withdrawable by the recipient.",
        });

        return {
          ok: true,
          hash,
          senderRefund: refund ?? undefined,
          recipientWithdrawable: accrued ?? undefined,
        };
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

  return {
    cancel,
    reset,
    step,
    error,
    txHash,
    senderRefund,
    recipientWithdrawable,
    isBusy: step === "signing" || step === "confirming",
  };
}
