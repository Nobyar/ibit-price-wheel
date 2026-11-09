import { describe, expect, it, vi } from "vitest";
import { assembleQuotes } from "@/lib/quotes/assemble";
import { loadQuotes } from "@/lib/quotes/load";
import { parseNasdaqQuote, parseYahooChart } from "@/lib/quotes/parse";

const fetchedAt = "2026-11-09T02:35:00.000Z";

const coinbaseTicker = {
  ask: "75357.07",
  bid: "75357.06",
  price: "75357.07",
  time: "2026-11-09T02:38:34.004391969Z",
};

const coinbaseSpot = { data: { amount: "76000.00", base: "BTC", currency: "USD" } };

const kraken = {
  error: [],
  result: {
    XXBTZUSD: {
      a: ["75360.40000", "1", "1"],
      b: ["75360.30000", "1", "1"],
      c: ["75360.40000", "0.01"],
    },
  },
};

const yahoo = {
  chart: {
    result: [
      {
        meta: {
          symbol: "IBIT",
          longName: "iShares Bitcoin Trust ETF",
          fullExchangeName: "NasdaqGM",
          regularMarketPrice: 42.88,
          regularMarketTime: 1793998801,
          fulldayPrice: 42.7,
          currency: "USD",
        },
      },
    ],
    error: null,
  },
};

const nasdaq = {
  data: {
    symbol: "IBIT",
    companyName: "iShares Bitcoin Trust ETF",
    exchange: "NASDAQ-GM",
    marketStatus: "Closed",
    primaryData: {
      lastSalePrice: "$42.88",
      lastTradeTimestamp: "Nov 6, 2026",
      isRealTime: false,
    },
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

describe("quote assembly", () => {
  it("prefers timestamped sources and records an agreeing cross-check", () => {
    const quotes = assembleQuotes({
      fetchedAt,
      coinbaseTicker,
      coinbaseSpot,
      kraken,
      yahoo,
      nasdaq,
    });
    expect(quotes.btc.ok && quotes.btc.price).toBe(75357.07);
    expect(quotes.btc.ok && quotes.btc.asOf).toBe("2026-11-09T02:38:34.004Z");
    expect(quotes.btc.ok && quotes.btc.sourceName).toBe("Coinbase Exchange");
    expect(quotes.ibit.ok && quotes.ibit.price).toBe(42.88);
    expect(quotes.ibit.ok && quotes.ibit.asOf).toBe("2026-11-06T21:00:01.000Z");
    expect(quotes.ibit.ok && quotes.ibit.crossCheck?.agrees).toBe(true);
    expect(quotes.ibit.ok && quotes.ibit.notes.join(" ")).toMatch(/real-time flag: no/i);
    expect(quotes.ibit.ok && quotes.ibit.notes.join(" ")).toContain("$42.70");
  });

  it("does not invent a price when every payload is empty or unusable", () => {
    const quotes = assembleQuotes({
      fetchedAt,
      coinbaseTicker: null,
      coinbaseSpot: { data: { amount: "nope", base: "BTC", currency: "USD" } },
      kraken: { error: ["EGeneral"] },
      yahoo: { chart: { result: null, error: { code: "Not Found" } } },
      nasdaq: { data: { primaryData: { lastSalePrice: "N/A", isRealTime: false } } },
    });
    expect(quotes.btc.ok).toBe(false);
    expect(quotes.ibit.ok).toBe(false);
    expect(JSON.stringify(quotes)).not.toMatch(/42\.88|75357/);
    expect(parseYahooChart({ finance: { error: { code: "Unauthorized" } } })).toBeNull();
    expect(parseNasdaqQuote(nasdaq)?.vendorRealtime).toBe(false);
  });

  it("falls back to Kraken and Nasdaq without substituting a constant", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("exchange.coinbase.com")) return jsonResponse({}, 500);
      if (url.includes("api.coinbase.com/v2")) return jsonResponse(coinbaseSpot);
      if (url.includes("kraken.com")) return jsonResponse(kraken);
      if (url.includes("yahoo.com")) return jsonResponse("<html>nope</html>");
      if (url.includes("nasdaq.com")) return jsonResponse(nasdaq);
      return jsonResponse({}, 404);
    });
    const quotes = await loadQuotes(fetchImpl);
    expect(quotes.btc.ok && quotes.btc.sourceName).toBe("Kraken");
    expect(quotes.btc.ok && quotes.btc.asOfIsTradeTime).toBe(false);
    expect(quotes.ibit.ok && quotes.ibit.sourceName).toBe("Nasdaq public quote");
    expect(quotes.ibit.ok && quotes.ibit.asOfPrecision).toBe("date");
    expect(quotes.ibit.ok && quotes.ibit.price).toBe(42.88);
  });
});
