import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/brand/feedback";
import { WalletButton } from "@/components/app/wallet-button";

export function ConnectGate({
  title = "Connect your wallet",
  description = "Your wallet is your account. Connect an EVM wallet to see streams, create payments, and withdraw.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      icon={<Wallet className="size-5" />}
      title={title}
      description={description}
      action={<WalletButton />}
    />
  );
}
