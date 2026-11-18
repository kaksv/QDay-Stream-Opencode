"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useConfig } from "wagmi";
import { readContract } from "wagmi/actions";
import { useAccount, useBalance, useReadContract } from "wagmi";
import { streamPayAbi } from "@/lib/abi/streamPay";
import { erc20Abi } from "@/lib/abi/erc20";
import {
  IS_CONTRACT_CONFIGURED,
  STREAMPAY_ADDRESS,
  TUSD8,
  DEPLOYMENT,
} from "@/lib/config";
import type { Stream, StreamRole } from "@/lib/types";
import { aevumTestnet } from "@/lib/chain";

const PAGE_SIZE = 50;

type RawStream = {
  id: bigint | number;
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amount: bigint;
  withdrawn: bigint;
  accrued: bigint;
  withdrawable: bigint;
  startTime: bigint;
  endTime: bigint;
  createdAt: bigint;
  cancelledAt: bigint;
  status: number;
};

export function toStream(raw: unknown): Stream {
  const r = raw as RawStream;
  return {
    id: BigInt(r.id),
    sender: r.sender,
    recipient: r.recipient,
    amount: BigInt(r.amount),
    withdrawn: BigInt(r.withdrawn),
    accrued: BigInt(r.accrued),
    withdrawable: BigInt(r.withdrawable),
    startTime: BigInt(r.startTime),
    endTime: BigInt(r.endTime),
    createdAt: BigInt(r.createdAt),
    cancelledAt: BigInt(r.cancelledAt),
    status: (Number(r.status) as Stream["status"]) ?? 0,
  };
}

export function useAccountStreams(
  role: StreamRole,
  options: { enabled?: boolean } = {},
) {
  const { address } = useAccount();
  const config = useConfig();

  const query = useInfiniteQuery({
    queryKey: ["streams", role, address, aevumTestnet.id, STREAMPAY_ADDRESS],
    enabled:
      Boolean(address) &&
      IS_CONTRACT_CONFIGURED &&
      (options.enabled ?? true),
    initialPageParam: 0,
    refetchInterval: 7_000,
    staleTime: 2_000,
    queryFn: async ({ pageParam }) => {
      if (!address) return [];
      const offset = BigInt(pageParam);
      const limit = BigInt(PAGE_SIZE);
      if (role === "sender") {
        const raw = await readContract(config, {
          address: STREAMPAY_ADDRESS,
          abi: streamPayAbi,
          functionName: "getSenderStreams",
          args: [address, offset, limit],
          chainId: aevumTestnet.id,
        });
        return raw.map(toStream);
      }
      const raw = await readContract(config, {
        address: STREAMPAY_ADDRESS,
        abi: streamPayAbi,
        functionName: "getRecipientStreams",
        args: [address, offset, limit],
        chainId: aevumTestnet.id,
      });
      return raw.map(toStream);
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  });

  return {
    streams: query.data?.pages.flat() ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasMore: query.hasNextPage,
    fetchMore: query.fetchNextPage,
    isFetchingMore: query.isFetchingNextPage,
    refetch: query.refetch,
  };
}

export function useStream(id: bigint | null) {
  const query = useReadContract({
    address: STREAMPAY_ADDRESS,
    abi: streamPayAbi,
    functionName: "getStream",
    args: id != null ? [id] : undefined,
    chainId: aevumTestnet.id,
    query: {
      enabled: IS_CONTRACT_CONFIGURED && id != null,
      refetchInterval: 5_000,
      staleTime: 2_000,
      retry: 1,
    },
  });

  return {
    stream: query.data ? toStream(query.data) : null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useStreamCounts() {
  const { address } = useAccount();
  const { data, isLoading } = useReadContract({
    address: STREAMPAY_ADDRESS,
    abi: streamPayAbi,
    functionName: "streamCount",
    chainId: aevumTestnet.id,
    query: {
      enabled: IS_CONTRACT_CONFIGURED,
      refetchInterval: 15_000,
    },
  });

  const senderCount = useReadContract({
    address: STREAMPAY_ADDRESS,
    abi: streamPayAbi,
    functionName: "senderStreamCount",
    args: address ? [address] : undefined,
    chainId: aevumTestnet.id,
    query: { enabled: Boolean(address) && IS_CONTRACT_CONFIGURED, refetchInterval: 15_000 },
  });

  const recipientCount = useReadContract({
    address: STREAMPAY_ADDRESS,
    abi: streamPayAbi,
    functionName: "recipientStreamCount",
    args: address ? [address] : undefined,
    chainId: aevumTestnet.id,
    query: { enabled: Boolean(address) && IS_CONTRACT_CONFIGURED, refetchInterval: 15_000 },
  });

  return {
    total: data ?? 0n,
    sent: senderCount.data ?? 0n,
    received: recipientCount.data ?? 0n,
    isLoading: isLoading || senderCount.isLoading || recipientCount.isLoading,
  };
}

export function useTokenBalance(address?: `0x${string}`) {
  const query = useReadContract({
    address: TUSD8.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: aevumTestnet.id,
    query: {
      enabled: Boolean(address),
      refetchInterval: 10_000,
      staleTime: 4_000,
    },
  });

  return {
    balance: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useAllowance(owner?: `0x${string}`) {
  const query = useReadContract({
    address: TUSD8.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: owner ? [owner, STREAMPAY_ADDRESS] : undefined,
    chainId: aevumTestnet.id,
    query: {
      enabled: Boolean(owner) && IS_CONTRACT_CONFIGURED,
      refetchInterval: 8_000,
    },
  });

  return { allowance: query.data ?? 0n, refetch: query.refetch, isLoading: query.isLoading };
}

export function useGasBalance(address?: `0x${string}`) {
  return useBalance({
    address,
    chainId: aevumTestnet.id,
    query: {
      enabled: Boolean(address),
      refetchInterval: 15_000,
    },
  });
}

export function useStreamLogsStartBlock(): bigint {
  return DEPLOYMENT.startBlock;
}
