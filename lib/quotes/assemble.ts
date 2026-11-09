import { formatUsd } from "@/lib/money";
import {
  parseCoinbaseSpot,
  parseCoinbaseTicker,
  parseKrakenTicker,
  parseNasdaqQuote,
  parseYahooChart,
} from "@/lib/quotes/parse";
import type { BtcLeg, IbitCrossCheck, IbitLeg, IbitQuote, QuotesEnvelope } from "@/lib/quotes/types";

const BTC_ERROR =
  "No Bitcoin quote could be read from Coinbase Exchange, Kraken, or Coinbase spot.";
const IBIT_ERROR =
  "No IBIT quote could be read from the Yahoo Finance chart or the Nasdaq public quote.";

function realtimeLabel(value: boolean | null): string {
  if (value === false) return "no";
  if (value === true) return "yes";
  return "not provided";
}

function crossCheckFrom(
  primaryPrice: number,
  other: Omit<IbitQuote, "notes" | "crossCheck">,
): IbitCrossCheck {
  return {
    sourceName: other.sourceName,
    sourceUrl: other.sourceUrl,
    price: other.price,
    agrees: Math.abs(other.price - primaryPrice) <= 0.02,
    vendorMarketStatus: other.vendorMarketStatus,
    vendorRealtime: other.vendorRealtime,
    asOfLabel: other.asOfLabel,
    asOfPrecision: other.asOfPrecision,
  };
}

function ibitNotes(
  primary: Omit<IbitQuote, "notes" | "crossCheck">,
  cross: IbitCrossCheck | null,
  fallback: boolean,
): string[] {
  const notes: string[] = [];
  if (primary.sourceName === "Yahoo Finance chart") {
    notes.push(
      "Regular-session price from the Yahoo Finance chart endpoint for IBIT. That payload does not include a real-time flag.",
    );
  } else if (fallback) {
    notes.push(
      "Nasdaq public quote for IBIT. This feed is the fallback because the Yahoo Finance chart did not return a usable price.",
    );
  }
  if (primary.fullDayPrice != null) {
    notes.push(
      `Yahoo also reported a full-day price of ${formatUsd(primary.fullDayPrice)}, which is not the regular-session price. The baseline uses the regular-session price only.`,
    );
  }
  if (cross) {
    const status = cross.vendorMarketStatus ?? "not provided";
    const label = cross.asOfLabel ?? "not provided";
    if (cross.agrees) {
      notes.push(
        `${cross.sourceName} agrees at ${formatUsd(cross.price)}. Vendor market status: ${status}. Real-time flag: ${realtimeLabel(cross.vendorRealtime)}. Last trade label: ${label}.`,
      );
    } else {
      notes.push(
        `${cross.sourceName} differs (${formatUsd(cross.price)} versus ${formatUsd(primary.price)}). The baseline keeps ${primary.sourceName} because that payload is the preferred source.`,
      );
    }
  }
  if (primary.vendorRealtime === false) {
    notes.push("The vendor marks this feed as not real-time.");
  }
  if (primary.asOfPrecision === "date" && primary.asOfLabel) {
    notes.push(
      `Last trade label from the vendor: ${primary.asOfLabel}. No clock time was included.`,
    );
  }
  return notes;
}

function btcNotes(sourceName: string): string[] {
  if (sourceName === "Coinbase Exchange") {
    return [
      "Last trade on the Coinbase Exchange BTC-USD book.",
      "A last trade is not a guaranteed price you can execute.",
    ];
  }
  if (sourceName === "Kraken") {
    return [
      "Kraken public ticker last trade for XBT/USD.",
      "This payload has no trade timestamp. The as-of time is when this server read the ticker.",
      "A last trade is not a guaranteed price you can execute.",
    ];
  }
  return [
    "Coinbase spot price endpoint. It does not include a trade timestamp. The as-of time is when this server read it.",
    "A spot display price is not a guaranteed price you can execute.",
  ];
}

export function assembleQuotes(input: {
  fetchedAt: string;
  coinbaseTicker: unknown | null;
  coinbaseSpot: unknown | null;
  kraken: unknown | null;
  yahoo: unknown | null;
  nasdaq: unknown | null;
}): QuotesEnvelope {
  const ticker = parseCoinbaseTicker(input.coinbaseTicker);
  const kraken = parseKrakenTicker(input.kraken, input.fetchedAt);
  const spot = parseCoinbaseSpot(input.coinbaseSpot, input.fetchedAt);
  const chosen = ticker ?? kraken ?? spot;
  const btc: BtcLeg = chosen
    ? { ...chosen, notes: btcNotes(chosen.sourceName) }
    : { ok: false, error: BTC_ERROR };

  const yahoo = parseYahooChart(input.yahoo);
  const nasdaq = parseNasdaqQuote(input.nasdaq);
  let ibit: IbitLeg;
  if (yahoo) {
    const cross = nasdaq ? crossCheckFrom(yahoo.price, nasdaq) : null;
    ibit = { ...yahoo, crossCheck: cross, notes: ibitNotes(yahoo, cross, false) };
  } else if (nasdaq) {
    ibit = { ...nasdaq, crossCheck: null, notes: ibitNotes(nasdaq, null, true) };
  } else {
    ibit = { ok: false, error: IBIT_ERROR };
  }

  return { ok: true, fetchedAt: input.fetchedAt, btc, ibit };
}
