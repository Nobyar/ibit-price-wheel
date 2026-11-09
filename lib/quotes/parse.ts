import { parseVendorPrice } from "@/lib/money";
import type { BtcQuote, IbitQuote } from "@/lib/quotes/types";

type ParsedBtc = Omit<BtcQuote, "notes">;
type ParsedIbit = Omit<IbitQuote, "notes" | "crossCheck">;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseIsoTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\.(\d{3})\d+(?=Z$)/, ".$1");
  const ms = Date.parse(normalized);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export function unixSecondsToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 1_000_000_000 || value > 10_000_000_000) return null;
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function inRange(price: number, min: number, max: number): number | null {
  return price >= min && price <= max ? price : null;
}

export function parseCoinbaseTicker(payload: unknown): ParsedBtc | null {
  const record = asRecord(payload);
  if (!record) return null;
  const price = inRange(parseVendorPrice(record.price) ?? Number.NaN, 1_000, 10_000_000);
  const asOf = parseIsoTime(record.time);
  if (price == null || asOf == null) return null;
  return {
    ok: true,
    symbol: "BTC-USD",
    price,
    currency: "USD",
    asOf,
    asOfIsTradeTime: true,
    sourceName: "Coinbase Exchange",
    sourceUrl: "https://www.coinbase.com/price/bitcoin",
    bid: parseVendorPrice(record.bid),
    ask: parseVendorPrice(record.ask),
  };
}

export function parseCoinbaseSpot(payload: unknown, fetchedAt: string): ParsedBtc | null {
  const data = asRecord(asRecord(payload)?.data);
  if (!data) return null;
  const price = inRange(parseVendorPrice(data.amount) ?? Number.NaN, 1_000, 10_000_000);
  if (price == null || data.base !== "BTC" || data.currency !== "USD") return null;
  return {
    ok: true,
    symbol: "BTC-USD",
    price,
    currency: "USD",
    asOf: fetchedAt,
    asOfIsTradeTime: false,
    sourceName: "Coinbase spot",
    sourceUrl: "https://www.coinbase.com/price/bitcoin",
    bid: null,
    ask: null,
  };
}

export function parseKrakenTicker(payload: unknown, fetchedAt: string): ParsedBtc | null {
  const root = asRecord(payload);
  if (!root) return null;
  const errors = root.error;
  if (Array.isArray(errors) && errors.length > 0) return null;
  const result = asRecord(root.result);
  if (!result) return null;
  const first = asRecord(Object.values(result)[0]);
  if (!first) return null;
  const last = Array.isArray(first.c) ? first.c[0] : null;
  const ask = Array.isArray(first.a) ? first.a[0] : null;
  const bid = Array.isArray(first.b) ? first.b[0] : null;
  const price = inRange(parseVendorPrice(last) ?? Number.NaN, 1_000, 10_000_000);
  if (price == null) return null;
  return {
    ok: true,
    symbol: "BTC-USD",
    price,
    currency: "USD",
    asOf: fetchedAt,
    asOfIsTradeTime: false,
    sourceName: "Kraken",
    sourceUrl: "https://www.kraken.com/prices/bitcoin",
    bid: parseVendorPrice(bid),
    ask: parseVendorPrice(ask),
  };
}

export function parseYahooChart(payload: unknown): ParsedIbit | null {
  const chart = asRecord(asRecord(payload)?.chart);
  const result = chart?.result;
  const meta = asRecord(Array.isArray(result) ? result[0] : null);
  const source = asRecord(meta?.meta);
  if (!source || source.symbol !== "IBIT") return null;
  const price = inRange(
    parseVendorPrice(source.regularMarketPrice) ?? Number.NaN,
    0.5,
    20_000,
  );
  if (price == null) return null;
  const asOf = unixSecondsToIso(source.regularMarketTime);
  const fullDay = parseVendorPrice(source.fulldayPrice);
  return {
    ok: true,
    symbol: "IBIT",
    name: asString(source.longName) ?? "iShares Bitcoin Trust ETF",
    price,
    currency: "USD",
    asOf,
    asOfPrecision: asOf ? "timestamp" : "unknown",
    asOfLabel: null,
    sourceName: "Yahoo Finance chart",
    sourceUrl: "https://finance.yahoo.com/quote/IBIT/",
    exchange: asString(source.fullExchangeName),
    vendorMarketStatus: null,
    vendorRealtime: null,
    fullDayPrice: fullDay != null && Math.abs(fullDay - price) >= 0.01 ? fullDay : null,
  };
}

export function parseNasdaqQuote(payload: unknown): ParsedIbit | null {
  const data = asRecord(asRecord(payload)?.data);
  const primary = asRecord(data?.primaryData);
  if (!data || !primary) return null;
  const price = inRange(parseVendorPrice(primary.lastSalePrice) ?? Number.NaN, 0.5, 20_000);
  if (price == null) return null;
  const label = asString(primary.lastTradeTimestamp);
  const realtime = typeof primary.isRealTime === "boolean" ? primary.isRealTime : null;
  return {
    ok: true,
    symbol: "IBIT",
    name: asString(data.companyName) ?? "iShares Bitcoin Trust ETF",
    price,
    currency: "USD",
    asOf: null,
    asOfPrecision: label ? "date" : "unknown",
    asOfLabel: label,
    sourceName: "Nasdaq public quote",
    sourceUrl: "https://www.nasdaq.com/market-activity/etf/ibit",
    exchange: asString(data.exchange),
    vendorMarketStatus: asString(data.marketStatus),
    vendorRealtime: realtime,
    fullDayPrice: null,
  };
}
