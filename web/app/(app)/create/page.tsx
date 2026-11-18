import type { Metadata } from "next";
import { CreateStreamForm } from "@/components/app/create-stream-form";

export const metadata: Metadata = {
  title: "Create a stream",
  description:
    "Fund a fully-backed tUSD8 stream on QDay Aevum. Choose a recipient, amount and duration, then let it accrue every second.",
};

export default function CreatePage() {
  return <CreateStreamForm />;
}
