import { pricesMatch } from "@/lib/money";
import { formatUsd } from "@/lib/money";
import type { BtcQuote, IbitQuote, QuotesEnvelope } from "@/lib/quotes/types";

export type Provenance =
  | { kind: "market"; fetchedAt: string; btc: BtcQuote; ibit: IbitQuote }
  | {
      kind: "mixed";
      fetchedAt: string;
      summary: string;
      btc: BtcQuote | null;
      ibit: IbitQuote | null;
    }
  | { kind: "manual" }
  | { kind: "example" }
  | { kind: "shared" }
  | { kind: "unset" };

export function classifyBaselines(
  btc: number,
  ibit: number,
  quotes: QuotesEnvelope | null,
): Exclude<Provenance, { kind: "example" } | { kind: "shared" } | { kind: "unset" }> {
  if (!quotes) return { kind: "manual" };
  const btcQuote = quotes.btc.ok ? quotes.btc : null;
  const ibitQuote = quotes.ibit.ok ? quotes.ibit : null;
  const btcMatches = btcQuote != null && pricesMatch(btc, btcQuote.price);
  const ibitMatches = ibitQuote != null && pricesMatch(ibit, ibitQuote.price);
  if (btcMatches && ibitMatches && btcQuote && ibitQuote) {
    return { kind: "market", fetchedAt: quotes.fetchedAt, btc: btcQuote, ibit: ibitQuote };
  }
  if (!btcQuote && !ibitQuote) return { kind: "manual" };

  const parts: string[] = [];
  if (btcMatches && btcQuote) {
    parts.push(`Bitcoin matches the ${btcQuote.sourceName} snapshot.`);
  } else if (btcQuote) {
    parts.push(
      `Bitcoin does not match the ${btcQuote.sourceName} snapshot of ${formatUsd(btcQuote.price)}, so that baseline is manual.`,
    );
  } else {
    parts.push("No Bitcoin quote was available, so that baseline is manual.");
  }
  if (ibitMatches && ibitQuote) {
    parts.push(`IBIT matches the ${ibitQuote.sourceName} price.`);
  } else if (ibitQuote) {
    parts.push(
      `IBIT does not match the ${ibitQuote.sourceName} price of ${formatUsd(ibitQuote.price)}, so that baseline is manual.`,
    );
  } else {
    parts.push("No IBIT quote was available, so that baseline is manual.");
  }
  return {
    kind: "mixed",
    fetchedAt: quotes.fetchedAt,
    summary: parts.join(" "),
    btc: btcMatches ? btcQuote : null,
    ibit: ibitMatches ? ibitQuote : null,
  };
}
