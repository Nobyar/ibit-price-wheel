import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { WheelApp } from "@/components/wheel-app";
import { formatSignedPercent, formatUsd } from "@/lib/money";
import { estimateIbit, percentChange } from "@/lib/price";
import { readScenario } from "@/lib/scenario";
import { DEFAULT_DESCRIPTION, socialCard } from "@/lib/site";

export async function generateMetadata(props: PageProps<"/">): Promise<Metadata> {
  const scenario = readScenario(await props.searchParams);
  if (scenario.kind !== "ready") {
    return {
      title: { absolute: "IBIT Price Wheel" },
      description: DEFAULT_DESCRIPTION,
    };
  }
  const ibit = estimateIbit(scenario.btc, scenario.ibit, scenario.sim);
  const pct = percentChange(scenario.btc, scenario.sim);
  const title = `${formatSignedPercent(pct)} Bitcoin what-if`;
  const description = `Shared what-if, not a live quote. Hypothetical Bitcoin ${formatUsd(scenario.sim)} from a baseline of ${formatUsd(scenario.btc)} (${formatSignedPercent(pct)}). Estimated IBIT ${formatUsd(ibit)} using the link's baseline ratio.`;
  return {
    title: { absolute: `${title} · IBIT Price Wheel` },
    description,
    ...socialCard({
      title,
      description,
      path: `/?btc=${scenario.btc}&ibit=${scenario.ibit}&sim=${scenario.sim}`,
    }),
  };
}

async function DynamicMetadataMarker() {
  await connection();
  return null;
}

export default function Page() {
  return (
    <>
      <Suspense fallback={null}>
        <DynamicMetadataMarker />
      </Suspense>
      <WheelApp initialScenario={null} ignoredLinkReason={null} />
    </>
  );
}
