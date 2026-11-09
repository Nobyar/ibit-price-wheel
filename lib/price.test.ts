import { describe, expect, it } from "vitest";
import { shortestAngleDelta } from "@/lib/angle";
import {
  MAX_FACTOR,
  MIN_FACTOR,
  applyDialDelta,
  applyPercentNudge,
  degreesFromPrice,
  estimateIbit,
  percentChange,
  priceFromDegrees,
  snapshot,
} from "@/lib/price";

const BTC = 100_000;
const IBIT = 50;

describe("price relationship", () => {
  it("keeps a full clockwise turn at +10% and a counterclockwise turn at the inverse", () => {
    expect(priceFromDegrees(BTC, 360)).toBeCloseTo(BTC * 1.1);
    expect(priceFromDegrees(BTC, -360)).toBeCloseTo(BTC / 1.1);
    expect(estimateIbit(BTC, IBIT, priceFromDegrees(BTC, 360))).toBeCloseTo(55);
    const up = snapshot(BTC, IBIT, 360);
    expect(up.percent).toBeCloseTo(10);
    expect(percentChange(IBIT, estimateIbit(BTC, IBIT, priceFromDegrees(BTC, 360)))).toBeCloseTo(
      up.percent,
    );
  });

  it("raises price clockwise and lowers it counterclockwise, including across the wrap", () => {
    const clockwise = applyDialDelta(BTC, 0, shortestAngleDelta(170, -170));
    const counterclockwise = applyDialDelta(BTC, 0, shortestAngleDelta(-170, 170));
    expect(clockwise).toBeCloseTo(20);
    expect(priceFromDegrees(BTC, clockwise)).toBeGreaterThan(BTC);
    expect(counterclockwise).toBeCloseTo(-20);
    expect(priceFromDegrees(BTC, counterclockwise)).toBeLessThan(BTC);
  });

  it("accumulates a wrapped drag as one continuous turn", () => {
    const angles = [350, 10, 30];
    let cursor = angles[0] ?? 0;
    let degrees = 0;
    for (const angle of angles.slice(1)) {
      degrees = applyDialDelta(BTC, degrees, shortestAngleDelta(cursor, angle));
      cursor = angle;
    }
    expect(degrees).toBeCloseTo(40);
    expect(snapshot(BTC, IBIT, degrees).percent).toBeGreaterThan(0);
  });

  it("resets to the baseline and stops at the range ends", () => {
    expect(snapshot(BTC, IBIT, 0)).toMatchObject({
      btc: BTC,
      ibit: IBIT,
      btcChange: 0,
      ibitChange: 0,
      percent: 0,
      atBound: null,
    });
    let degrees = 0;
    for (let turn = 0; turn < 80; turn += 1) {
      degrees = applyDialDelta(BTC, degrees, 360);
    }
    expect(priceFromDegrees(BTC, degrees)).toBeCloseTo(BTC * MAX_FACTOR, 0);
    expect(applyDialDelta(BTC, degrees, 30)).toBeCloseTo(degrees);
    expect(priceFromDegrees(BTC, applyDialDelta(BTC, degrees, -360))).toBeLessThan(
      BTC * MAX_FACTOR,
    );

    let down = 0;
    for (let turn = 0; turn < 80; turn += 1) {
      down = applyDialDelta(BTC, down, -360);
    }
    expect(priceFromDegrees(BTC, down)).toBeCloseTo(BTC * MIN_FACTOR, 0);
    expect(priceFromDegrees(BTC, applyDialDelta(BTC, down, 360))).toBeGreaterThan(
      BTC * MIN_FACTOR,
    );
  });

  it("nudges by a percentage and can return through the inverse degrees", () => {
    const nudged = applyPercentNudge(BTC, 0, 0.1);
    expect(snapshot(BTC, IBIT, nudged).btc).toBe(100_100);
    expect(snapshot(BTC, IBIT, nudged).ibit).toBe(50.05);
    expect(degreesFromPrice(BTC, BTC)).toBe(0);
  });
});
