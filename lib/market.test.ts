import { describe, expect, it } from "vitest";
import {
  describeBtcStatus,
  describeEquityClock,
  describeIbitStatus,
  newYorkClock,
  weekdaySession,
} from "@/lib/market";

const sundayEvening = new Date("2026-11-09T02:35:00.000Z");
const saturday = new Date("2026-11-07T18:00:00.000Z");
const fridayRegular = new Date("2026-11-06T20:00:00.000Z");
const mondayPremarket = new Date("2026-11-09T14:00:00.000Z");
const mondayOpen = new Date("2026-11-09T14:30:00.000Z");
const mondayAfter = new Date("2026-11-10T01:00:00.000Z");
const fridayClose = new Date("2026-11-06T21:00:01.000Z");

describe("US equity clock", () => {
  it("knows Sunday evening in New York is Sunday", () => {
    const clock = newYorkClock(sundayEvening);
    expect(clock.weekday).toBe("Sun");
    expect(clock.hour).toBe(21);
    expect(describeEquityClock(sundayEvening).headline).toBe(
      "US stock market closed (Sunday).",
    );
    expect(describeEquityClock(saturday).headline).toBe(
      "US stock market closed (Saturday).",
    );
  });

  it("splits the weekday into pre, regular, post, and closed", () => {
    expect(weekdaySession(newYorkClock(mondayPremarket))).toBe("pre");
    expect(weekdaySession(newYorkClock(mondayOpen))).toBe("regular");
    expect(weekdaySession(newYorkClock(fridayRegular))).toBe("regular");
    expect(weekdaySession(newYorkClock(mondayAfter))).toBe("closed");
  });
});

describe("IBIT status copy", () => {
  it("says Sunday is closed and does not call a delayed print real-time", () => {
    const status = describeIbitStatus({
      now: sundayEvening,
      sourceName: "Yahoo Finance chart",
      asOf: fridayClose,
      asOfPrecision: "timestamp",
      asOfLabel: null,
      vendorMarketStatus: "Closed",
      vendorRealtime: null,
    });
    expect(status.headline).toBe("US stock market closed (Sunday).");
    expect(status.tone).toBe("closed");
    const text = status.details.join(" ");
    expect(text).toContain("does not label this feed as real-time");
    expect(text).toContain("Nov");
    expect(text).toContain("EST");
    expect(text.toLowerCase()).not.toContain("market is open");
    expect(status.headline.toLowerCase()).not.toContain("live");
  });

  it("flags a stale timestamp during regular hours and a vendor holiday closure", () => {
    const stale = describeIbitStatus({
      now: new Date("2026-11-09T15:30:00.000Z"),
      sourceName: "Yahoo Finance chart",
      asOf: new Date("2026-11-09T14:30:00.000Z"),
      asOfPrecision: "timestamp",
      asOfLabel: null,
      vendorMarketStatus: null,
      vendorRealtime: false,
    });
    expect(stale.headline).toContain("regular session");
    expect(stale.details.join(" ")).toContain("60 minutes old");
    expect(stale.details.join(" ")).toContain("not real-time");
    expect(stale.tone).toBe("caution");

    const holiday = describeIbitStatus({
      now: new Date("2026-11-09T15:30:00.000Z"),
      sourceName: "Nasdaq public quote",
      asOf: null,
      asOfPrecision: "date",
      asOfLabel: "Nov 26, 2026",
      vendorMarketStatus: "Closed",
      vendorRealtime: false,
    });
    expect(holiday.headline).toBe("Vendor reports the market closed.");
    expect(holiday.details.join(" ")).toContain("holiday");
    expect(holiday.details.join(" ")).toContain("No clock time");
  });

  it("describes a Bitcoin trade time without calling it the simulated price", () => {
    const copy = describeBtcStatus({
      sourceName: "Coinbase Exchange",
      asOf: new Date("2026-11-09T02:38:34.004Z"),
      asOfIsTradeTime: true,
      bid: 75357.06,
      ask: 75357.07,
    });
    expect(copy.headline).toContain("Not the green simulated price");
    expect(copy.details.join(" ")).toContain("Coinbase Exchange last trade");
    expect(copy.details.join(" ")).toContain("weekends");
  });
});
