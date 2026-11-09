import { assembleQuotes } from "@/lib/quotes/assemble";
import type { QuotesEnvelope } from "@/lib/quotes/types";

const COINBASE_TICKER = "https://api.exchange.coinbase.com/products/BTC-USD/ticker";
const COINBASE_SPOT = "https://api.coinbase.com/v2/prices/BTC-USD/spot";
const KRAKEN_TICKER = "https://api.kraken.com/0/public/Ticker?pair=XBTUSD";
const YAHOO_CHART =
  "https://query1.finance.yahoo.com/v8/finance/chart/IBIT?interval=1d&range=5d";
const NASDAQ_QUOTE = "https://api.nasdaq.com/api/quote/IBIT/info?assetclass=etf";

function rethrowIfFramework(error: unknown): void {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string"
  ) {
    throw error;
  }
}

async function getJson(fetchImpl: typeof fetch, url: string): Promise<unknown | null> {
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (compatible; IBIT-Price-Wheel/1.0)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("<")) return null;
    return JSON.parse(trimmed) as unknown;
  } catch (error) {
    rethrowIfFramework(error);
    return null;
  }
}

export async function loadQuotes(fetchImpl: typeof fetch = fetch): Promise<QuotesEnvelope> {
  const fetchedAt = new Date().toISOString();
  const [coinbaseTicker, coinbaseSpot, kraken, yahoo, nasdaq] = await Promise.all([
    getJson(fetchImpl, COINBASE_TICKER),
    getJson(fetchImpl, COINBASE_SPOT),
    getJson(fetchImpl, KRAKEN_TICKER),
    getJson(fetchImpl, YAHOO_CHART),
    getJson(fetchImpl, NASDAQ_QUOTE),
  ]);
  return assembleQuotes({
    fetchedAt,
    coinbaseTicker,
    coinbaseSpot,
    kraken,
    yahoo,
    nasdaq,
  });
}
