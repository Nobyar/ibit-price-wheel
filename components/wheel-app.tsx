"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BaselinePanel } from "@/components/baseline-panel";
import { DigitalReadout } from "@/components/digital-readout";
import { MethodologyDialog } from "@/components/methodology-dialog";
import { PriceWheel, type PriceWheelHandle } from "@/components/price-wheel";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { OFFLINE_EXAMPLE } from "@/lib/example";
import {
  formatEditable,
  formatSignedPercent,
  formatSignedUsd,
  formatUsd,
  parseUsd,
  roundUsd,
  validateBaseline,
} from "@/lib/money";
import {
  MAX_FACTOR,
  MIN_FACTOR,
  applyDialDelta,
  applyPercentNudge,
  degreesFromPrice,
  formatRatio,
  priceFromDegrees,
  snapshot,
} from "@/lib/price";
import { classifyBaselines, type Provenance } from "@/lib/provenance";
import type { QuotesEnvelope } from "@/lib/quotes/types";
import { buildScenarioSearch, readScenario, type ReadyScenario } from "@/lib/scenario";

function subscribeToLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function useLocationSearch() {
  return useSyncExternalStore(
    subscribeToLocation,
    () => window.location.search,
    () => "",
  );
}

function useIsClient() {
  return useSyncExternalStore(
    (onChange) => {
      const id = window.setTimeout(onChange, 0);
      return () => window.clearTimeout(id);
    },
    () => true,
    () => false,
  );
}

function subscribeToBrowserClock(onChange: () => void) {
  const id = window.setTimeout(onChange, 0);
  return () => window.clearTimeout(id);
}

let browserIso: string | null = null;

function readBrowserIso() {
  browserIso ??= new Date().toISOString();
  return browserIso;
}

function useBrowserIsoTime() {
  return useSyncExternalStore(subscribeToBrowserClock, readBrowserIso, () => null);
}

export function WheelApp({
  initialScenario,
  ignoredLinkReason,
}: {
  initialScenario: ReadyScenario | null;
  ignoredLinkReason: string | null;
}) {
  const [baselineBtc, setBaselineBtc] = useState<number | null>(initialScenario?.btc ?? null);
  const [baselineIbit, setBaselineIbit] = useState<number | null>(initialScenario?.ibit ?? null);
  const [degrees, setDegrees] = useState(() =>
    initialScenario ? degreesFromPrice(initialScenario.btc, initialScenario.sim) : 0,
  );
  const [provenance, setProvenance] = useState<Provenance>(
    initialScenario ? { kind: "shared" } : { kind: "unset" },
  );
  const [lastQuotes, setLastQuotes] = useState<QuotesEnvelope | null>(null);
  const [btcInput, setBtcInput] = useState(
    initialScenario ? formatEditable(initialScenario.btc) : "",
  );
  const [ibitInput, setIbitInput] = useState(
    initialScenario ? formatEditable(initialScenario.ibit) : "",
  );
  const [btcError, setBtcError] = useState<string | null>(null);
  const [ibitError, setIbitError] = useState<string | null>(null);
  const [checking, setChecking] = useState(initialScenario == null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [linkReason, setLinkReason] = useState<string | null>(ignoredLinkReason);
  const browserNow = useBrowserIsoTime();
  const locationSearch = useLocationSearch();
  const isClient = useIsClient();
  const [urlBooted, setUrlBooted] = useState(false);
  if (!initialScenario && isClient && !urlBooted) {
    setUrlBooted(true);
    const scenario = readScenario(new URLSearchParams(locationSearch));
    if (scenario.kind === "ready") {
      setBaselineBtc(scenario.btc);
      setBaselineIbit(scenario.ibit);
      setBtcInput(formatEditable(scenario.btc));
      setIbitInput(formatEditable(scenario.ibit));
      setDegrees(degreesFromPrice(scenario.btc, scenario.sim));
      setProvenance({ kind: "shared" });
      setChecking(false);
    } else if (scenario.kind === "invalid") {
      setLinkReason(scenario.reason);
    }
  }
  const [live, setLive] = useState("");
  const [settle, setSettle] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [failedLink, setFailedLink] = useState<string | null>(null);

  const btcRef = useRef(baselineBtc);
  const ibitRef = useRef(baselineIbit);
  const degreesRef = useRef(degrees);
  const dirtyRef = useRef(false);
  const wheelRef = useRef<PriceWheelHandle>(null);
  const lastNudgeAt = useRef(0);

  const stopWheel = useCallback((nextDegrees: number) => {
    wheelRef.current?.cancelMotion();
    degreesRef.current = nextDegrees;
  }, []);

  useEffect(() => {
    btcRef.current = baselineBtc;
    ibitRef.current = baselineIbit;
    degreesRef.current = degrees;
  });

  const announce = useCallback((nextDegrees: number) => {
    const btc = btcRef.current;
    const ibit = ibitRef.current;
    if (btc == null || ibit == null) return;
    const snap = snapshot(btc, ibit, nextDegrees);
    setLive(
      `Simulated Bitcoin ${formatUsd(snap.btc)}, ${formatSignedPercent(snap.percent)} from baseline. Estimated IBIT ${formatUsd(snap.ibit)}.`,
    );
  }, []);

  useEffect(() => {
    if (copyState !== "copied") return;
    const id = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(id);
  }, [copyState]);

  useEffect(() => {
    if (initialScenario) return;
    const scenario = readScenario(new URLSearchParams(window.location.search));
    if (scenario.kind === "ready") return;
    const controller = new AbortController();
    void (async () => {
      setChecking(true);
      try {
        const response = await fetch("/api/quotes", {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = (await response.json()) as QuotesEnvelope | { ok?: false };
        if (controller.signal.aborted) return;
        if (!response.ok || !body || body.ok !== true) {
          setQuoteError(
            "Public quotes are unavailable. Enter both baselines, or load the labeled offline example. Nothing shown is a live price.",
          );
          return;
        }
        setLastQuotes(body);
        if (body.btc.ok && body.ibit.ok && !dirtyRef.current) {
          const btc = roundUsd(body.btc.price);
          const ibit = roundUsd(body.ibit.price);
          setBaselineBtc(btc);
          setBaselineIbit(ibit);
          setBtcInput(formatEditable(btc));
          setIbitInput(formatEditable(ibit));
          stopWheel(0);
          setSettle(false);
          setDegrees(0);
          setProvenance({
            kind: "market",
            fetchedAt: body.fetchedAt,
            btc: body.btc,
            ibit: body.ibit,
          });
          setQuoteError(null);
        } else {
          if (!dirtyRef.current) {
            if (body.btc.ok) setBtcInput(formatEditable(body.btc.price));
            if (body.ibit.ok) setIbitInput(formatEditable(body.ibit.price));
          }
          const missing = [body.btc.ok ? null : "Bitcoin", body.ibit.ok ? null : "IBIT"]
            .filter(Boolean)
            .join(" and ");
          setQuoteError(
            `${missing} quote unavailable. Enter the missing baseline yourself. Nothing here is a made-up market price.`,
          );
        }
      } catch {
        if (controller.signal.aborted) return;
        setQuoteError(
          "Public quotes are unavailable. Enter both baselines, or load the labeled offline example. Nothing shown is a live price.",
        );
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    })();
    return () => controller.abort();
  }, [initialScenario, stopWheel]);

  useEffect(() => {
    if (baselineBtc == null || baselineIbit == null) return;
    const sim = roundUsd(priceFromDegrees(baselineBtc, degrees));
    const next = buildScenarioSearch({ btc: baselineBtc, ibit: baselineIbit, sim });
    const url = `${window.location.pathname}${next}`;
    if (`${window.location.pathname}${window.location.search}` !== url) {
      window.history.replaceState(null, "", url);
    }
  }, [baselineBtc, baselineIbit, degrees]);

  const onDelta = useCallback((delta: number) => {
    const baseline = btcRef.current;
    const current = degreesRef.current;
    if (baseline == null) return current;
    const next = applyDialDelta(baseline, current, delta);
    degreesRef.current = next;
    setSettle(false);
    setDegrees(next);
    return next;
  }, []);

  const onNudge = useCallback(
    (percent: number) => {
      const baseline = btcRef.current;
      if (baseline == null) return;
      const now = performance.now();
      const burst = now - lastNudgeAt.current < 90;
      lastNudgeAt.current = now;
      const next = applyPercentNudge(baseline, degreesRef.current, percent);
      degreesRef.current = next;
      const reduce =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setSettle(!burst && !reduce);
      setDegrees(next);
      announce(next);
    },
    [announce],
  );

  const onReset = useCallback(() => {
    stopWheel(0);
    setSettle(false);
    setDegrees(0);
    announce(0);
  }, [announce, stopWheel]);

  const onCommit = useCallback(() => {
    announce(degreesRef.current);
  }, [announce]);

  const onApply = useCallback(() => {
    const btcParsed = parseUsd(btcInput);
    const ibitParsed = parseUsd(ibitInput);
    const btcValid = btcParsed.ok ? validateBaseline("btc", btcParsed.value) : btcParsed;
    const ibitValid = ibitParsed.ok ? validateBaseline("ibit", ibitParsed.value) : ibitParsed;
    setBtcError(btcValid.ok ? null : btcValid.error);
    setIbitError(ibitValid.ok ? null : ibitValid.error);
    if (!btcValid.ok || !ibitValid.ok) return;
    setBaselineBtc(btcValid.value);
    setBaselineIbit(ibitValid.value);
    setBtcInput(formatEditable(btcValid.value));
    setIbitInput(formatEditable(ibitValid.value));
    stopWheel(0);
    setSettle(false);
    setDegrees(0);
    dirtyRef.current = false;
    setProvenance(classifyBaselines(btcValid.value, ibitValid.value, lastQuotes));
    setQuoteError(null);
  }, [btcInput, ibitInput, lastQuotes, stopWheel]);

  const onExample = useCallback(() => {
    setBaselineBtc(OFFLINE_EXAMPLE.btc);
    setBaselineIbit(OFFLINE_EXAMPLE.ibit);
    setBtcInput(formatEditable(OFFLINE_EXAMPLE.btc));
    setIbitInput(formatEditable(OFFLINE_EXAMPLE.ibit));
    stopWheel(0);
    setSettle(false);
    setDegrees(0);
    setBtcError(null);
    setIbitError(null);
    dirtyRef.current = false;
    setProvenance({ kind: "example" });
    setQuoteError(null);
  }, [stopWheel]);

  const onReload = useCallback(async () => {
    setChecking(true);
    setQuoteError(null);
    try {
      const response = await fetch("/api/quotes", { cache: "no-store" });
      const body = (await response.json()) as QuotesEnvelope | { ok?: false };
      if (!response.ok || !body || body.ok !== true) {
        setQuoteError("Quote check failed. Your current baselines are unchanged.");
        return;
      }
      setLastQuotes(body);
      if (!(body.btc.ok && body.ibit.ok)) {
        setQuoteError(
          "Latest check did not return both prices. The wheel is still using the previous baselines.",
        );
        return;
      }
      const btc = roundUsd(body.btc.price);
      const ibit = roundUsd(body.ibit.price);
      setBaselineBtc(btc);
      setBaselineIbit(ibit);
      setBtcInput(formatEditable(btc));
      setIbitInput(formatEditable(ibit));
      stopWheel(0);
      setSettle(false);
      setDegrees(0);
      setBtcError(null);
      setIbitError(null);
      dirtyRef.current = false;
      setProvenance({ kind: "market", fetchedAt: body.fetchedAt, btc: body.btc, ibit: body.ibit });
    } catch {
      setQuoteError("Quote check failed. Your current baselines are unchanged.");
    } finally {
      setChecking(false);
    }
  }, [stopWheel]);

  const onBtcInput = useCallback((value: string) => {
    dirtyRef.current = true;
    setBtcInput(value);
    setBtcError(null);
  }, []);

  const onIbitInput = useCallback((value: string) => {
    dirtyRef.current = true;
    setIbitInput(value);
    setIbitError(null);
  }, []);

  const onCopy = useCallback(async () => {
    if (baselineBtc == null || baselineIbit == null) return;
    const sim = roundUsd(priceFromDegrees(baselineBtc, degreesRef.current));
    const url = `${window.location.origin}${window.location.pathname}${buildScenarioSearch({
      btc: baselineBtc,
      ibit: baselineIbit,
      sim,
    })}`;
    try {
      await navigator.clipboard.writeText(url);
      setFailedLink(null);
      setCopyState("copied");
    } catch {
      setFailedLink(url);
      setCopyState("failed");
    }
  }, [baselineBtc, baselineIbit]);

  const ready = baselineBtc != null && baselineIbit != null;
  const snap = ready ? snapshot(baselineBtc, baselineIbit, degrees) : null;
  const unchanged = snap != null && snap.btcChange === 0 && Math.abs(snap.percent) < 0.005;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Wordmark />
        <div className="flex flex-wrap items-center gap-2">
          <MethodologyDialog />
          <Button type="button" className="min-h-11" disabled={!ready} onClick={() => void onCopy()}>
            {copyState === "copied" ? "Link copied" : "Copy scenario link"}
          </Button>
        </div>
      </header>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Turn the dial to set a hypothetical Bitcoin price. The IBIT figure uses your baseline
        ratio and the same percentage. Green numbers are simulated. This is not a quote, a
        forecast, or an order.
      </p>
      {failedLink ? (
        <label className="text-sm text-muted-foreground">
          Copy failed. Select the link.
          <input
            readOnly
            value={failedLink}
            className="mt-1 h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm text-foreground"
          />
        </label>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {live}
      </p>

      <div className="instrument-grid" data-testid="instrument">
        <DigitalReadout
          id="btc"
          className="area-btc"
          title="BITCOIN · USD"
          spokenName="Bitcoin"
          price={snap?.btc ?? null}
          baseline={baselineBtc}
          change={snap?.btcChange ?? null}
        />
        <div className="area-wheel flex flex-col items-center gap-4" data-testid="wheel-column">
          <PriceWheel
            ref={wheelRef}
            degrees={degrees}
            disabled={!ready}
            settle={settle}
            percentLabel={snap ? formatSignedPercent(snap.percent) : "—"}
            valueNow={snap?.btc ?? 0}
            valueMin={ready ? roundUsd(baselineBtc * MIN_FACTOR) : 0}
            valueMax={ready ? roundUsd(baselineBtc * MAX_FACTOR) : 0}
            valueText={
              snap
                ? `${formatUsd(snap.btc)}, ${formatSignedPercent(snap.percent)} from the Bitcoin baseline`
                : "No baseline yet"
            }
            onDelta={onDelta}
            onNudge={onNudge}
            onReset={onReset}
            onCommit={onCommit}
          />
          <section className="w-full max-w-sm rounded-2xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-[0.68rem] tracking-[0.18em] text-brass">SELECTED CHANGE</p>
            <p data-testid="change-percent" className="text-glow font-mono text-2xl text-phosphor">
              {snap ? formatSignedPercent(snap.percent) : "—"}
            </p>
            {snap && !unchanged ? (
              <p className="mt-1 font-mono text-sm text-foreground">
                Bitcoin {formatSignedUsd(snap.btcChange)} · IBIT {formatSignedUsd(snap.ibitChange)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                {ready ? "At the baseline." : "Set both baselines to turn the wheel."}
              </p>
            )}
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {snap?.atBound === "max"
                ? "Upper stop: 10× the Bitcoin baseline."
                : snap?.atBound === "min"
                  ? "Lower stop: 10% of the Bitcoin baseline."
                  : "One clockwise turn is +10% of the current hypothetical Bitcoin price."}
            </p>
          </section>
        </div>
        <DigitalReadout
          id="ibit"
          className="area-ibit"
          title="IBIT · USD"
          spokenName="IBIT share"
          price={snap?.ibit ?? null}
          baseline={baselineIbit}
          change={snap?.ibitChange ?? null}
        />
      </div>

      <BaselinePanel
        btcInput={btcInput}
        ibitInput={ibitInput}
        btcError={btcError}
        ibitError={ibitError}
        checking={checking}
        quoteError={quoteError}
        ignoredLinkReason={linkReason}
        provenance={provenance}
        browserNow={browserNow}
        ratioText={ready ? formatRatio(baselineIbit, baselineBtc) : null}
        onBtcInput={onBtcInput}
        onIbitInput={onIbitInput}
        onApply={onApply}
        onExample={onExample}
        onReload={() => void onReload()}
      />

      <footer className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
        IBIT Price Wheel is a what-if illustration, not a brokerage and not advice. The dial sets
        a hypothetical Bitcoin price. The IBIT figure is your IBIT baseline multiplied by the same
        percentage. That ratio ignores fees, spreads, the expense ratio, premiums or discounts to
        net asset value, and the fact that IBIT trades on the US stock market while Bitcoin trades
        all week. Market baselines are labeled with their source and time. Green figures are
        simulated.
      </footer>
    </div>
  );
}
