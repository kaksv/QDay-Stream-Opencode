import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(
  address?: string | null,
  start = 6,
  end = 4,
): string {
  if (!address) return "—";
  if (address.length <= start + end + 2) return address;
  return `${address.slice(0, start)}…${address.slice(-end)}`;
}

export function isSameAddress(
  a?: string | null,
  b?: string | null,
): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
