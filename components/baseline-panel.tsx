"use client";

import { memo } from "react";
import { OFFLINE_EXAMPLE } from "@/lib/example";
import {
  describeBtcStatus,
  describeEquityClock,
  describeIbitStatus,
  formatTimestamp,
} from "@/lib/market";
import { formatUsd } from "@/lib/money";
import type { Provenance } from "@/lib/provenance";
import type { BtcQuote, IbitQuote } from "@/lib/quotes/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ToneBadge({ tone, children }: { tone: "closed" | "caution" | "session"; children: string }) {
  const color =
    tone === "closed" ? "text-warning" : tone === "caution" ? "text-brass" : "text-foreground";
  return <p className={`text-sm font-medium ${color}`}>{children}</p>;
}

function FactList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function BtcCard({ quote, checkedAt }: { quote: BtcQuote; checkedAt: string }) {
  const copy = describeBtcStatus({
    sourceName: quote.sourceName,
    asOf: new Date(quote.asOf),
    asOfIsTradeTime: quote.asOfIsTradeTime,
    bid: quote.bid,
    ask: quote.ask,
  });
  return (
    <article className="rounded-2xl border border-border bg-background/60 p-4" data-tone="baseline">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.68rem] tracking-[0.16em] text-brass">BITCOIN BASELINE</h3>
        <p data-testid="btc-baseline-price" data-tone="baseline" className="font-mono text-lg text-foreground">
          {formatUsd(quote.price)}
        </p>
      </div>
      <p className="mt-2 text-sm text-foreground">{copy.headline}</p>
      <FactList items={[...copy.details, ...quote.notes, `Quote check: ${formatTimestamp(checkedAt)}.`]} />
      <a className="mt-2 inline-block text-xs text-brass underline-offset-2 hover:underline" href={quote.sourceUrl} target="_blank" rel="noreferrer">
        {quote.sourceName} source page
      </a>
    </article>
  );
}

function IbitCard({ quote, checkedAt }: { quote: IbitQuote; checkedAt: string }) {
  const copy = describeIbitStatus({
    now: new Date(checkedAt),
    sourceName: quote.sourceName,
    asOf: quote.asOf ? new Date(quote.asOf) : null,
    asOfPrecision: quote.asOfPrecision,
    asOfLabel: quote.asOfLabel,
    vendorMarketStatus: quote.vendorMarketStatus,
    vendorRealtime: quote.vendorRealtime,
  });
  return (
    <article className="rounded-2xl border border-border bg-background/60 p-4" data-tone="baseline">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.68rem] tracking-[0.16em] text-brass">IBIT BASELINE</h3>
        <p data-testid="ibit-baseline-price" data-tone="baseline" className="font-mono text-lg text-foreground">
          {formatUsd(quote.price)}
        </p>
      </div>
      <div className="mt-2">
        <ToneBadge tone={copy.tone}>{copy.headline}</ToneBadge>
      </div>
      <FactList items={[...copy.details, ...quote.notes, `Quote check: ${formatTimestamp(checkedAt)}.`]} />
      <a className="mt-2 inline-block text-xs text-brass underline-offset-2 hover:underline" href={quote.sourceUrl} target="_blank" rel="noreferrer">
        {quote.sourceName} source page
      </a>
    </article>
  );
}

export const BaselinePanel = memo(function BaselinePanel({
  btcInput,
  ibitInput,
  btcError,
  ibitError,
  checking,
  quoteError,
  ignoredLinkReason,
  provenance,
  browserNow,
  ratioText,
  onBtcInput,
  onIbitInput,
  onApply,
  onExample,
  onReload,
}: {
  btcInput: string;
  ibitInput: string;
  btcError: string | null;
  ibitError: string | null;
  checking: boolean;
  quoteError: string | null;
  ignoredLinkReason: string | null;
  provenance: Provenance;
  browserNow: string | null;
  ratioText: string | null;
  onBtcInput: (value: string) => void;
  onIbitInput: (value: string) => void;
  onApply: () => void;
  onExample: () => void;
  onReload: () => void;
}) {
  const manualClock =
    browserNow &&
    (provenance.kind === "manual" ||
      provenance.kind === "example" ||
      provenance.kind === "shared" ||
      provenance.kind === "unset")
      ? describeEquityClock(new Date(browserNow))
      : null;

  return (
    <section aria-labelledby="baseline-heading" className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="baseline-heading" className="text-lg font-semibold">
            Baselines
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Stone figures are market or manual baselines. Green figures above are the simulation.
            A quote check names its source and time. It is not a guaranteed executable price.
          </p>
        </div>
        <Button type="button" variant="outline" className="min-h-11" onClick={onReload} disabled={checking}>
          {checking ? "Checking quotes…" : "Replace with latest quotes"}
        </Button>
      </div>

      {ignoredLinkReason ? (
        <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning" role="status">
          {ignoredLinkReason} Enter baselines manually, or load quotes.
        </p>
      ) : null}

      {quoteError ? (
        <p className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground" role="status">
          {quoteError}
        </p>
      ) : null}

      {provenance.kind === "shared" ? (
        <p className="mt-4 text-sm leading-6 text-foreground">
          Loaded from this link. These baselines are the numbers stored in the URL, not a fresh quote.
        </p>
      ) : null}
      {provenance.kind === "manual" ? (
        <p className="mt-4 text-sm leading-6 text-foreground">
          Manual baseline. These prices are what you entered. They are not a market feed.
        </p>
      ) : null}
      {provenance.kind === "example" ? (
        <p className="mt-4 text-sm leading-6 text-foreground">
          Illustrative example, not a market quote. Bitcoin {formatUsd(OFFLINE_EXAMPLE.btc)} and IBIT{" "}
          {formatUsd(OFFLINE_EXAMPLE.ibit)} are round figures for offline use. {OFFLINE_EXAMPLE.origin}
        </p>
      ) : null}
      {provenance.kind === "mixed" ? (
        <p className="mt-4 text-sm leading-6 text-foreground">{provenance.summary}</p>
      ) : null}

      {manualClock ? (
        <p className="mt-3 text-sm text-warning">
          {manualClock.headline} This note uses this browser&apos;s clock
          {browserNow ? ` (${formatTimestamp(browserNow)})` : ""}. A manual, shared, or example
          baseline has no trade timestamp of its own.
        </p>
      ) : null}

      {provenance.kind === "market" ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <BtcCard quote={provenance.btc} checkedAt={provenance.fetchedAt} />
          <IbitCard quote={provenance.ibit} checkedAt={provenance.fetchedAt} />
        </div>
      ) : null}
      {provenance.kind === "mixed" ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {provenance.btc ? <BtcCard quote={provenance.btc} checkedAt={provenance.fetchedAt} /> : null}
          {provenance.ibit ? <IbitCard quote={provenance.ibit} checkedAt={provenance.fetchedAt} /> : null}
        </div>
      ) : null}

      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="btc-baseline">Bitcoin baseline (USD)</Label>
          <Input
            id="btc-baseline"
            className="h-11 font-mono text-base"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            value={btcInput}
            aria-invalid={btcError ? true : undefined}
            aria-describedby={btcError ? "btc-baseline-error" : undefined}
            onChange={(event) => onBtcInput(event.target.value)}
          />
          {btcError ? (
            <p id="btc-baseline-error" role="alert" className="text-sm text-down">
              {btcError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ibit-baseline">IBIT baseline (USD)</Label>
          <Input
            id="ibit-baseline"
            className="h-11 font-mono text-base"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            value={ibitInput}
            aria-invalid={ibitError ? true : undefined}
            aria-describedby={ibitError ? "ibit-baseline-error" : undefined}
            onChange={(event) => onIbitInput(event.target.value)}
          />
          {ibitError ? (
            <p id="ibit-baseline-error" role="alert" className="text-sm text-down">
              {ibitError}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" className="min-h-11">
            Apply baselines
          </Button>
          <Button type="button" variant="secondary" className="min-h-11" onClick={onExample}>
            Use offline example
          </Button>
        </div>
      </form>

      {ratioText ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Scale factor from these baselines: {ratioText} dollars of IBIT per 1 dollar of Bitcoin.
          The estimate holds that factor constant. It is not a creation basket, a fee-adjusted NAV,
          or an exchange rate.
        </p>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The dial stays locked until both baselines are set. Applying them resets the wheel to flat.
          Replacing them with latest quotes also resets the what-if.
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        The share link stores btc, ibit, and sim only. It is not an order.
      </p>
    </section>
  );
});
