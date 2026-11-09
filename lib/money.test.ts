import { describe, expect, it } from "vitest";
import {
  formatLedDigits,
  formatParam,
  formatSignedPercent,
  formatSignedUsd,
  formatUsd,
  parseUsd,
  parseVendorPrice,
  roundUsd,
  validateBaseline,
} from "@/lib/money";

describe("USD parsing and formatting", () => {
  it("parses grouped, plain, and dollar-signed amounts", () => {
    expect(parseUsd("$75,357.07")).toEqual({ ok: true, value: 75357.07 });
    expect(parseUsd("  75,357.07 ")).toEqual({ ok: true, value: 75357.07 });
    expect(parseUsd("75357.07")).toEqual({ ok: true, value: 75357.07 });
    expect(parseUsd("75357")).toEqual({ ok: true, value: 75357 });
    expect(parseUsd(".50")).toEqual({ ok: true, value: 0.5 });
  });

  it("rejects blanks, signs, exponents, and broken decimals", () => {
    expect(parseUsd("")).toMatchObject({ ok: false });
    expect(parseUsd("abc")).toMatchObject({ ok: false });
    expect(parseUsd("<script>")).toMatchObject({ ok: false });
    expect(parseUsd("1e5")).toMatchObject({ ok: false });
    expect(parseUsd("-10")).toMatchObject({ ok: false });
    expect(parseUsd("(100)")).toMatchObject({ ok: false });
    expect(parseUsd("12.34.56")).toMatchObject({ ok: false });
    expect(parseUsd("42,88")).toMatchObject({ ok: false });
    expect(parseUsd("0")).toMatchObject({ ok: false });
  });

  it("formats currency and signed change", () => {
    expect(formatUsd(75357.07)).toBe("$75,357.07");
    expect(formatLedDigits(75357.07)).toBe("75357.07");
    expect(formatSignedUsd(100)).toBe("+$100.00");
    expect(formatSignedUsd(-0.05)).toBe("−$0.05");
    expect(formatSignedUsd(0)).toBe("$0.00");
    expect(formatSignedPercent(0.1)).toBe("+0.10%");
    expect(formatSignedPercent(-0.1)).toBe("−0.10%");
    expect(formatSignedPercent(0)).toBe("0.00%");
  });

  it("rounds to cents and keeps share params plain", () => {
    expect(roundUsd(42.886)).toBe(42.89);
    expect(formatParam(100000)).toBe("100000");
    expect(formatParam(42.8)).toBe("42.8");
    expect(formatParam(42.88)).toBe("42.88");
  });

  it("bounds baselines and vendor strings", () => {
    expect(validateBaseline("btc", 100000).ok).toBe(true);
    expect(validateBaseline("ibit", 0.001).ok).toBe(false);
    expect(parseVendorPrice("$42.88")).toBe(42.88);
    expect(parseVendorPrice("N/A")).toBeNull();
    expect(parseVendorPrice(-1)).toBeNull();
    expect(parseVendorPrice(0)).toBeNull();
  });
});
