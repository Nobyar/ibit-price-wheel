# IBIT Price Wheel

A what-if price wheel for the relationship between a hypothetical Bitcoin price and an [iShares Bitcoin Trust ETF](https://www.ishares.com/us/products/333011/ishares-bitcoin-trust-etf) (IBIT) share price. Drag the dial clockwise to raise Bitcoin and counterclockwise to lower it. The IBIT figure moves by the same percentage as the Bitcoin baseline ratio you set.

Green segmented numbers are simulated. Stone-colored numbers are baselines, labeled with a source and a time when a quote check supplied them. This is not a brokerage, an order ticket, a forecast, or investment advice.

## Run locally

Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3847](http://localhost:3847). No API keys or database are required. Quote checks need outbound HTTPS. If they fail, enter both baselines yourself or load the labeled offline example.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Deploy

The app is a standard Next.js App Router project and is ready for Vercel.

1. Import the repository. Framework preset: Next.js. Root directory: the repository root.
2. Use Node.js 20.9 or newer. Build command: `npm run build`. No install overrides.
3. Leave environment variables empty. Optionally set `NEXT_PUBLIC_SITE_URL` to the public `https` origin so Open Graph links use that host. If it is unset, those links use `https://ibit-price-wheel.vercel.app`. The share image is `public/og.png`, served at `/og.png`.
4. The server route `/api/quotes` needs outbound HTTPS to the quote hosts below. There is no secret to provision.

Quote responses are cached for about a minute (`cacheLife` stale 30s, revalidate 60s, expire 300s) plus a short `Cache-Control` header. A failed check is not replaced with a made-up price.

## Baseline methodology

The wheel does not model NAV, creation baskets, or options. It holds the ratio of the two baselines constant:

```text
estimated IBIT = IBIT baseline × (hypothetical Bitcoin ÷ Bitcoin baseline)
```

One full clockwise revolution multiplies the hypothetical Bitcoin price by 1.10. Counterclockwise divides by 1.10. Because the factor is geometric, each additional revolution is 10% of the price at the start of that revolution. Arrow keys nudge 0.1% of the current hypothetical price. Shift plus an arrow nudges 1%. The wheel stops at 10% and 10× the Bitcoin baseline. Reset returns both simulated prices to the baselines.

Applying new baselines, loading the offline example, or replacing baselines with a fresh quote check resets the wheel to flat so the green numbers start equal to the baselines you just accepted.

A share link is `/?btc=&ibit=&sim=`. Those three values are plain positive decimals. The page ignores anything else, including scripts, exponents, and prices outside the wheel's range. The link stores the scenario. It does not contain an account or an order.

### Offline example

If you choose **Use offline example**, the baselines are Bitcoin **$100,000.00** and IBIT **$50.00**. They are round figures so the wheel can be tried with no network. No market-data vendor supplied them. The screen says so, and the numbers are not labeled as a quote.

## Quote sources

The route `GET /api/quotes` reads public endpoints in parallel and returns only prices it could parse. It never fills a missing price with a constant.

| Leg | Preferred source | Fallback | What the payload actually gives |
| --- | --- | --- | --- |
| Bitcoin | [Coinbase Exchange BTC-USD ticker](https://api.exchange.coinbase.com/products/BTC-USD/ticker) | [Kraken XBT/USD ticker](https://api.kraken.com/0/public/Ticker?pair=XBTUSD), then [Coinbase spot](https://api.coinbase.com/v2/prices/BTC-USD/spot) | Coinbase Exchange includes a last-trade timestamp, bid, and ask. Kraken and Coinbase spot do not include a trade timestamp. For those, the as-of time is when this server read the ticker, and the screen says that. |
| IBIT | [Yahoo Finance chart](https://query1.finance.yahoo.com/v8/finance/chart/IBIT?interval=1d&range=5d) `regularMarketPrice` and `regularMarketTime` | [Nasdaq public quote](https://api.nasdaq.com/api/quote/IBIT/info?assetclass=etf) | Yahoo's chart includes a regular-session timestamp and does not label the feed as real-time. Nasdaq's quote includes market status, an explicit real-time flag (currently false on the public feed), and a trade date that often has no clock time. |

Human-readable source pages linked from the app:

- [Coinbase Bitcoin price](https://www.coinbase.com/price/bitcoin)
- [Kraken Bitcoin price](https://www.kraken.com/prices/bitcoin)
- [Yahoo Finance IBIT](https://finance.yahoo.com/quote/IBIT/)
- [Nasdaq IBIT](https://www.nasdaq.com/market-activity/etf/ibit)

When both IBIT sources return a price, the baseline keeps Yahoo if it parsed, and the screen says whether Nasdaq agrees within two cents. A different Yahoo "full-day" figure is shown as a note and is not used as the baseline.

Bitcoin prices outside $1,000–$10,000,000 and IBIT prices outside $0.50–$20,000 are rejected as unusable vendor payloads. That guard does not substitute another number.

You can still type any baseline inside the manual limits (Bitcoin $1 to $100,000,000, IBIT $0.01 to $100,000). Manual and shared numbers are labeled as such.

## Market hours and delays

Session copy uses the quote-check time in `America/New_York`, not the viewer's computer clock, whenever a quote check succeeded.

- Saturday and Sunday are always described as the US stock market closed. IBIT does not trade then. The figure on screen is the last parsed sale, with its timestamp.
- Weekday hours used only as a clock check: closed before 4:00 AM, pre-market until 9:30 AM, regular session until 4:00 PM, after-hours until 8:00 PM, then closed. The baseline still prefers the regular-session price.
- If the vendor says `Closed` on a weekday, the screen says the vendor reports the market closed. This app does not ship an exchange holiday calendar. A holiday is visible from that vendor status and from the trade timestamp.
- If a regular-session timestamp is more than 20 minutes old, the screen says to treat it as delayed.
- Nasdaq's public quote is shown as not real-time when the payload says so. Yahoo's chart is described as unlabeled, not as a live feed.
- Bitcoin is described as a continuous spot snapshot, including weekends. A last trade is not an executable price.

A manual, shared, or example baseline has no trade timestamp. If the browser clock is on a weekend, a separate note says the stock market is closed and that the note comes from the browser clock.

## Limits

- The constant-ratio estimate ignores fees, spreads, the ETF expense ratio, cash in the trust, premiums or discounts to net asset value, creation and redemption, and tracking difference.
- IBIT trades on the US equity market. Bitcoin trades all week. A Sunday Bitcoin move does not have a simultaneous IBIT print.
- Free public endpoints can change, rate-limit, or block server IPs. The wheel then asks for a manual baseline or the labeled example.
- The Yahoo chart endpoint is an undocumented public JSON feed. The Nasdaq quote is a public endpoint and is not a licensed real-time feed.
- Quote checks can be about a minute old because of the cache.
- Share links reproduce the saved scenario. They do not refresh market data until you ask.

## Stack

Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, and shadcn/ui. Tests run in Vitest and Testing Library.
