"use client";

import { useQuery } from "@tanstack/react-query";
import { getBlock, getPublicClient } from "wagmi/actions";
import { useConfig } from "wagmi";
import { streamPayAbi } from "@/lib/abi/streamPay";
import { DEPLOYMENT, IS_CONTRACT_CONFIGURED, STREAMPAY_ADDRESS } from "@/lib/config";
import { aevumTestnet } from "@/lib/chain";
import type { StreamEvent } from "@/lib/types";

export function useStreamEvents(streamId: bigint | null) {
  const config = useConfig();

  return useQuery({
    queryKey: ["stream-events", streamId?.toString(), STREAMPAY_ADDRESS],
    enabled: streamId != null && IS_CONTRACT_CONFIGURED,
    staleTime: 20_000,
    refetchInterval: 20_000,
    retry: false,
    queryFn: async (): Promise<StreamEvent[]> => {
      if (streamId == null) return [];

      const client = getPublicClient(config, { chainId: aevumTestnet.id });
      if (!client) return [];

      const base = {
        address: STREAMPAY_ADDRESS,
        abi: streamPayAbi,
        fromBlock: DEPLOYMENT.startBlock,
        toBlock: "latest" as const,
      };

      const [created, withdrawals, cancellations] = await Promise.all([
        client.getContractEvents({
          ...base,
          eventName: "StreamCreated",
          args: { streamId },
        }),
        client.getContractEvents({
          ...base,
          eventName: "Withdrawal",
          args: { streamId },
        }),
        client.getContractEvents({
          ...base,
          eventName: "StreamCancelled",
          args: { streamId },
        }),
      ]);

      const events: StreamEvent[] = [];

      for (const log of created) {
        events.push({
          kind: "created",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          amount: log.args.amount,
          actor: log.args.sender,
        });
      }
      for (const log of withdrawals) {
        events.push({
          kind: "withdrawal",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          amount: log.args.amount,
          actor: log.args.recipient,
        });
      }
      for (const log of cancellations) {
        events.push({
          kind: "cancelled",
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
          senderRefund: log.args.senderRefund,
          recipientWithdrawable: log.args.recipientWithdrawable,
          actor: log.args.cancelledBy,
        });
      }

      events.sort((a, b) => {
        if (a.blockNumber === b.blockNumber) return a.logIndex - b.logIndex;
        return a.blockNumber < b.blockNumber ? -1 : 1;
      });

      // Resolve timestamps for a small, bounded set of blocks.
      const uniqueBlocks = Array.from(
        new Set(events.map((event) => event.blockNumber.toString())),
      )
        .slice(0, 20)
        .map((n) => BigInt(n));

      const timestamps = new Map<string, bigint>();
      await Promise.all(
        uniqueBlocks.map(async (blockNumber) => {
          try {
            const block = await getBlock(config, {
              blockNumber,
              chainId: aevumTestnet.id,
            });
            timestamps.set(blockNumber.toString(), block.timestamp);
          } catch {
            // Timestamps are a nice-to-have; never fail the history for them.
          }
        }),
      );

      for (const event of events) {
        event.timestamp = timestamps.get(event.blockNumber.toString());
      }

      return events;
    },
  });
}
