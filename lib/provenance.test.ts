import { describe, expect, it } from "vitest";
import { classifyBaselines } from "@/lib/provenance";
import type { QuotesEnvelope } from "@/lib/quotes/types";

const quotes = {
  ok: true,
  fetchedAt: "2026-11-09T02:35:00.000Z",
  btc: {
    ok: true,
    symbol: "BTC-USD",
    price: 75357.07,
    currency: "USD",
    asOf: "2026-11-09T02:38:34.004Z",
    asOfIsTradeTime: true,
    sourceName: "Coinbase Exchange",
    sourceUrl: "https://www.coinbase.com/price/bitcoin",
    notes: [],
    bid: null,
    ask: null,
  },
  ibit: {
    ok: true,
    symbol: "IBIT",
    name: "iShares Bitcoin Trust ETF",
    price: 42.88,
    currency: "USD",
    asOf: "2026-11-06T21:00:01.000Z",
    asOfPrecision: "timestamp",
    asOfLabel: null,
    sourceName: "Yahoo Finance chart",
    sourceUrl: "https://finance.yahoo.com/quote/IBIT/",
    exchange: "NasdaqGM",
    vendorMarketStatus: null,
    vendorRealtime: null,
    fullDayPrice: null,
    notes: [],
    crossCheck: null,
  },
} satisfies QuotesEnvelope;

describe("baseline classification", () => {
  it("keeps a market label only when both entered prices match the check", () => {
    expect(classifyBaselines(75357.07, 42.88, quotes).kind).toBe("market");
    const mixed = classifyBaselines(75357.07, 40, quotes);
    expect(mixed.kind).toBe("mixed");
    if (mixed.kind === "mixed") {
      expect(mixed.summary).toContain("Bitcoin matches");
      expect(mixed.summary).toContain("IBIT does not match");
      expect(mixed.ibit).toBeNull();
    }
    expect(classifyBaselines(80_000, 40, null)).toEqual({ kind: "manual" });
  });
});
