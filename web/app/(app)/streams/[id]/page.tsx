import type { Metadata } from "next";
import { StreamDetailView } from "@/components/app/stream-detail-view";

type PageProps = { params: Promise<{ id: string }> };

// The whole view is keyed to the URL: a stream id. Opt out of instant-shell
// validation rather than rendering a shell that cannot know the id yet.
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Stream #${id}`,
    description:
      "Live tUSD8 stream on QDay Aevum. Track accrual, withdrawals, and the on-chain receipt.",
  };
}

export default async function StreamPage({ params }: PageProps) {
  const { id } = await params;
  return <StreamDetailView id={id} />;
}
