"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig, useAccount, useSignTypedData, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { parseEventLogs, parseSignature, type Address } from "viem";
import { toast } from "sonner";
import { streamPayAbi } from "@/lib/abi/streamPay";
import { erc20Abi, permitTypes } from "@/lib/abi/erc20";
import {
  IS_CONTRACT_CONFIGURED,
  QDAY,
  STREAMPAY_ADDRESS,
  TUSD8,
} from "@/lib/config";
import { aevumTestnet } from "@/lib/chain";
import { useClock } from "@/lib/providers/clock-provider";
import { describeTxError } from "@/lib/errors";
import { formatTokenAmount } from "@/lib/format";

export type CreateStep =
  | "idle"
  | "signing"
  | "approving"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

export type CreateMode = "permit" | "approve";

export function useCreateStream() {
  const config = useConfig();
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const { nowMs } = useClock();
  const [step, setStep] = useState<CreateStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [streamId, setStreamId] = useState<bigint | null>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
    setStreamId(null);
  }, []);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["readContract"] });
    queryClient.invalidateQueries({ queryKey: ["streams"] });
    queryClient.invalidateQueries({ queryKey: ["stream-events"] });
  }, [queryClient]);

  const create = useCallback(
    async ({
      recipient,
      amount,
      startTime,
      endTime,
      mode,
    }: {
      recipient: Address;
      amount: bigint;
      startTime: bigint;
      endTime: bigint;
      mode: CreateMode;
    }): Promise<{ ok: boolean; hash?: `0x${string}`; streamId?: bigint; cancelled?: boolean }> => {
      setError(null);
      setTxHash(null);
      setStreamId(null);

      if (!address) {
        const message = "Connect a wallet first.";
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
        const message = "Switch your wallet to QDay Aevum (chain 44005) first.";
        setError(message);
        toast.error("Wrong network", { description: message });
        return { ok: false };
      }

      let hash: `0x${string}` | null = null;

      try {
        if (mode === "permit") {
          setStep("signing");
          const nonce = await readContract(config, {
            address: TUSD8.address,
            abi: erc20Abi,
            functionName: "nonces",
            args: [address],
            chainId: aevumTestnet.id,
          });
          const chainNow = Math.floor((nowMs || Date.now()) / 1_000);
          const deadline = BigInt(chainNow + 30 * 60);

          const signature = await signTypedDataAsync({
            domain: {
              name: TUSD8.permitDomain.name,
              version: TUSD8.permitDomain.version,
              chainId: aevumTestnet.id,
              verifyingContract: TUSD8.address,
            },
            types: permitTypes,
            primaryType: "Permit",
            message: {
              owner: address,
              spender: STREAMPAY_ADDRESS,
              value: amount,
              nonce,
              deadline,
            },
          });

          const parsed = parseSignature(signature);
          const v =
            parsed.v !== undefined
              ? Number(parsed.v)
              : parsed.yParity === 1
                ? 28
                : 27;

          setStep("submitting");
          hash = await writeContractAsync({
            address: STREAMPAY_ADDRESS,
            abi: streamPayAbi,
            functionName: "createStreamWithPermit",
            args: [
              recipient,
              amount,
              startTime,
              endTime,
              deadline,
              v,
              parsed.r,
              parsed.s,
            ],
            chainId: aevumTestnet.id,
          });
        } else {
          const allowance = await readContract(config, {
            address: TUSD8.address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, STREAMPAY_ADDRESS],
            chainId: aevumTestnet.id,
          });

          if (allowance < amount) {
            setStep("approving");
            const approvalHash = await writeContractAsync({
              address: TUSD8.address,
              abi: erc20Abi,
              functionName: "approve",
              args: [STREAMPAY_ADDRESS, amount],
              chainId: aevumTestnet.id,
            });
            const approvalReceipt = await waitForTransactionReceipt(config, {
              hash: approvalHash,
              chainId: aevumTestnet.id,
              confirmations: 1,
              timeout: 120_000,
            });
            if (approvalReceipt.status !== "success") {
              throw new Error("Approval transaction reverted.");
            }
            queryClient.invalidateQueries({ queryKey: ["readContract"] });
          }

          setStep("submitting");
          hash = await writeContractAsync({
            address: STREAMPAY_ADDRESS,
            abi: streamPayAbi,
            functionName: "createStream",
            args: [recipient, amount, startTime, endTime],
            chainId: aevumTestnet.id,
          });
        }

        setTxHash(hash);
        setStep("confirming");

        const receipt = await waitForTransactionReceipt(config, {
          hash,
          chainId: aevumTestnet.id,
          confirmations: 1,
          timeout: 120_000,
        });

        if (receipt.status !== "success") {
          throw new Error("The transaction was reverted on-chain.");
        }

        const [created] = parseEventLogs({
          abi: streamPayAbi,
          eventName: "StreamCreated",
          logs: receipt.logs,
        });
        const newId = created?.args.streamId ?? null;

        setStreamId(newId);
        setStep("success");
        invalidate();

        toast.success("Stream created", {
          description: `${formatTokenAmount(amount)} is now accruing.`,
        });

        return { ok: true, hash, streamId: newId ?? undefined };
      } catch (caught) {
        const info = describeTxError(caught);
        setStep("error");
        setError(info.description);
        if (info.rejected) {
          toast.info("Request cancelled", {
            description: "Nothing was sent.",
          });
        } else {
          toast.error(info.title, { description: info.description });
        }
        return { ok: false, cancelled: info.rejected };
      }
    },
    [
      address,
      chainId,
      config,
      invalidate,
      nowMs,
      queryClient,
      signTypedDataAsync,
      writeContractAsync,
    ],
  );

  return {
    create,
    reset,
    step,
    error,
    txHash,
    streamId,
    isBusy:
      step === "signing" ||
      step === "approving" ||
      step === "submitting" ||
      step === "confirming",
  };
}
