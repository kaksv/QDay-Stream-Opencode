import type { Metadata } from "next";
import { DashboardView } from "@/components/app/dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Track incoming and outgoing tUSD8 streams on QDay Aevum. Withdraw accrued balances and cancel active streams.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
