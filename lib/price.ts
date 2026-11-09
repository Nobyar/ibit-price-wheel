import { roundUsd } from "@/lib/money";

/** One clockwise revolution multiplies the hypothetical Bitcoin price by 1.10. */
export const TURN_GAIN = 0.1;
export const MIN_FACTOR = 0.1;
export const MAX_FACTOR = 10;

export function priceFromDegrees(baseline: number, degrees: number): number {
  const turns = degrees / 360;
  return baseline * Math.pow(1 + TURN_GAIN, turns);
}

export function degreesFromPrice(baseline: number, price: number): number {
  if (!(baseline > 0) || !(price > 0)) return 0;
  const turns = Math.log(price / baseline) / Math.log(1 + TURN_GAIN);
  if (!Number.isFinite(turns)) return 0;
  return turns * 360;
}

export function clampFactor(baseline: number, price: number): number {
  const min = baseline * MIN_FACTOR;
  const max = baseline * MAX_FACTOR;
  return Math.min(max, Math.max(min, price));
}

export function applyDialDelta(
  baseline: number,
  degrees: number,
  deltaDeg: number,
): number {
  if (!Number.isFinite(deltaDeg) || deltaDeg === 0 || !(baseline > 0)) {
    return degrees;
  }
  const nextDegrees = degrees + deltaDeg;
  const price = priceFromDegrees(baseline, nextDegrees);
  const clamped = clampFactor(baseline, price);
  if (clamped === price) return nextDegrees;
  return degreesFromPrice(baseline, clamped);
}

export function applyPercentNudge(
  baseline: number,
  degrees: number,
  percent: number,
): number {
  if (!Number.isFinite(percent) || percent === 0 || !(baseline > 0)) {
    return degrees;
  }
  const current = priceFromDegrees(baseline, degrees);
  const target = clampFactor(baseline, current * (1 + percent / 100));
  return degreesFromPrice(baseline, target);
}

export function estimateIbit(
  baselineBtc: number,
  baselineIbit: number,
  simulatedBtc: number,
): number {
  if (!(baselineBtc > 0)) return Number.NaN;
  return baselineIbit * (simulatedBtc / baselineBtc);
}

export function percentChange(baseline: number, next: number): number {
  if (!(baseline > 0) || !Number.isFinite(next)) return Number.NaN;
  return (next / baseline - 1) * 100;
}

export type PriceSnapshot = {
  btc: number;
  ibit: number;
  btcChange: number;
  ibitChange: number;
  percent: number;
  atBound: "min" | "max" | null;
};

export function snapshot(
  baselineBtc: number,
  baselineIbit: number,
  degrees: number,
): PriceSnapshot {
  const rawBtc = priceFromDegrees(baselineBtc, degrees);
  const rawIbit = estimateIbit(baselineBtc, baselineIbit, rawBtc);
  const factor = rawBtc / baselineBtc;
  const atBound =
    factor >= MAX_FACTOR - 1e-9 ? "max" : factor <= MIN_FACTOR + 1e-9 ? "min" : null;
  const btc = roundUsd(rawBtc);
  const ibit = roundUsd(rawIbit);
  return {
    btc,
    ibit,
    btcChange: roundUsd(btc - roundUsd(baselineBtc)),
    ibitChange: roundUsd(ibit - roundUsd(baselineIbit)),
    percent: percentChange(baselineBtc, rawBtc),
    atBound,
  };
}

export function formatRatio(baselineIbit: number, baselineBtc: number): string {
  if (!(baselineBtc > 0) || !Number.isFinite(baselineIbit)) return "—";
  const ratio = baselineIbit / baselineBtc;
  return ratio.toLocaleString("en-US", { maximumSignificantDigits: 6 });
}
