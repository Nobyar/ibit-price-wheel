export type BtcQuote = {
  ok: true;
  symbol: "BTC-USD";
  price: number;
  currency: "USD";
  asOf: string;
  asOfIsTradeTime: boolean;
  sourceName: string;
  sourceUrl: string;
  notes: string[];
  bid: number | null;
  ask: number | null;
};

export type BtcLeg = BtcQuote | { ok: false; error: string };

export type IbitCrossCheck = {
  sourceName: string;
  sourceUrl: string;
  price: number;
  agrees: boolean;
  vendorMarketStatus: string | null;
  vendorRealtime: boolean | null;
  asOfLabel: string | null;
  asOfPrecision: "timestamp" | "date" | "unknown";
};

export type IbitQuote = {
  ok: true;
  symbol: "IBIT";
  name: string;
  price: number;
  currency: "USD";
  asOf: string | null;
  asOfPrecision: "timestamp" | "date" | "unknown";
  asOfLabel: string | null;
  sourceName: string;
  sourceUrl: string;
  exchange: string | null;
  vendorMarketStatus: string | null;
  vendorRealtime: boolean | null;
  fullDayPrice: number | null;
  notes: string[];
  crossCheck: IbitCrossCheck | null;
};

export type IbitLeg = IbitQuote | { ok: false; error: string };

export type QuotesEnvelope = {
  ok: true;
  fetchedAt: string;
  btc: BtcLeg;
  ibit: IbitLeg;
};
