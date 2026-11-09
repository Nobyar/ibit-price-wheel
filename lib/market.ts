import { formatUsd } from "@/lib/money";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type ZonedClock = {
  weekday: Weekday;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type EquitySession = "weekend" | "closed" | "pre" | "regular" | "post";

export type StatusTone = "closed" | "caution" | "session";

function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
}

export function newYorkClock(now: Date): ZonedClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  const weekday = parts.weekday ?? "";
  if (!isWeekday(weekday)) {
    throw new Error(`Unexpected weekday from America/New_York: ${weekday}`);
  }
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  return {
    weekday,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Weekday session from the clock alone. Weekends are classified by the caller. */
export function weekdaySession(clock: ZonedClock): Exclude<EquitySession, "weekend"> {
  const minutes = clock.hour * 60 + clock.minute;
  if (minutes < 4 * 60) return "closed";
  if (minutes < 9 * 60 + 30) return "pre";
  if (minutes < 16 * 60) return "regular";
  if (minutes < 20 * 60) return "post";
  return "closed";
}

export function formatTimestamp(
  value: Date | string,
  timeZone = "America/New_York",
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "unknown time";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export type StatusCopy = {
  headline: string;
  details: string[];
  tone: StatusTone;
};

export function describeEquityClock(now: Date): StatusCopy {
  const clock = newYorkClock(now);
  if (clock.weekday === "Sun") {
    return {
      headline: "US stock market closed (Sunday).",
      details: [
        "IBIT does not trade on Sunday. Any share price in hand is a prior print, not a live price.",
      ],
      tone: "closed",
    };
  }
  if (clock.weekday === "Sat") {
    return {
      headline: "US stock market closed (Saturday).",
      details: [
        "IBIT does not trade on Saturday. Any share price in hand is a prior print, not a live price.",
      ],
      tone: "closed",
    };
  }
  const session = weekdaySession(clock);
  if (session === "regular") {
    return {
      headline: "US regular session hours (9:30 AM–4:00 PM ET).",
      details: [],
      tone: "session",
    };
  }
  if (session === "pre") {
    return {
      headline:
        "Pre-market hours. A baseline should use the last regular-session price, not a pre-market print.",
      details: [],
      tone: "caution",
    };
  }
  if (session === "post") {
    return {
      headline:
        "After-hours. A baseline should use the last regular-session price, not an after-hours print.",
      details: [],
      tone: "caution",
    };
  }
  return {
    headline: "US stock market closed.",
    details: [],
    tone: "closed",
  };
}

export function describeIbitStatus(input: {
  now: Date;
  sourceName: string;
  asOf: Date | null;
  asOfPrecision: "timestamp" | "date" | "unknown";
  asOfLabel: string | null;
  vendorMarketStatus: string | null;
  vendorRealtime: boolean | null;
}): StatusCopy {
  const clock = newYorkClock(input.now);
  const weekend = clock.weekday === "Sat" || clock.weekday === "Sun";
  const session = weekend ? "weekend" : weekdaySession(clock);
  const vendor = input.vendorMarketStatus?.trim() || null;
  const vendorClosed = vendor != null && /closed/i.test(vendor);
  const details: string[] = [];

  let headline: string;
  let tone: StatusTone;

  if (clock.weekday === "Sun") {
    headline = "US stock market closed (Sunday).";
    tone = "closed";
  } else if (clock.weekday === "Sat") {
    headline = "US stock market closed (Saturday).";
    tone = "closed";
  } else if (vendorClosed) {
    headline = "Vendor reports the market closed.";
    tone = "closed";
    details.push(
      "The quote-check clock is on a weekday. This app does not include an exchange holiday calendar, so a holiday shows up when the vendor reports Closed and in the trade timestamp.",
    );
  } else if (session === "regular") {
    headline = "US regular session hours (9:30 AM–4:00 PM ET).";
    tone = "session";
  } else if (session === "pre") {
    headline =
      "Pre-market hours. The baseline uses the last regular-session price, not a pre-market print.";
    tone = "caution";
  } else if (session === "post") {
    headline =
      "After-hours. The baseline uses the last regular-session price, not an after-hours print.";
    tone = "caution";
  } else {
    headline = "US stock market closed.";
    tone = "closed";
  }

  if (vendor) {
    details.push(`Vendor market status: ${vendor}.`);
    if (weekend && /open|regular/i.test(vendor)) {
      details.push(
        "That vendor status conflicts with the weekend. Treat the figure as a last sale, not a live price.",
      );
    }
  }

  if (input.vendorRealtime === false) {
    details.push("The vendor marks this feed as not real-time.");
  } else if (input.vendorRealtime == null) {
    details.push(`${input.sourceName} does not label this feed as real-time.`);
  } else {
    details.push(
      "The vendor marks this print as real-time. It is still a snapshot, not an executable price.",
    );
    if (tone === "session") tone = "caution";
  }

  if (input.asOfPrecision === "timestamp" && input.asOf) {
    details.push(`Last regular-session timestamp: ${formatTimestamp(input.asOf)}.`);
    const ageMin = (input.now.getTime() - input.asOf.getTime()) / 60_000;
    if (!weekend && session === "regular" && ageMin > 20) {
      details.push(
        `That timestamp is ${Math.floor(ageMin)} minutes old. Treat it as delayed.`,
      );
      tone = "caution";
    }
  } else if (input.asOfPrecision === "date" && input.asOfLabel) {
    details.push(
      `Last trade date from the vendor: ${input.asOfLabel}. No clock time was provided.`,
    );
    if (tone === "session") tone = "caution";
  } else {
    details.push("No trade time was provided with this price.");
    if (tone === "session") tone = "caution";
  }

  details.push(
    "Session hours are judged from the quote-check time in America/New_York, not from your computer clock.",
  );

  return { headline, details, tone };
}

export function describeBtcStatus(input: {
  sourceName: string;
  asOf: Date;
  asOfIsTradeTime: boolean;
  bid: number | null;
  ask: number | null;
}): { headline: string; details: string[] } {
  const when = `${formatTimestamp(input.asOf)} (${formatTimestamp(input.asOf, "UTC")})`;
  const details = [
    input.asOfIsTradeTime
      ? `${input.sourceName} last trade at ${when}.`
      : `${input.sourceName} last price. This source did not include a trade timestamp. The as-of time is when the server read the ticker: ${when}.`,
    "Bitcoin trades continuously, including weekends. A last trade is not a guaranteed executable price.",
  ];
  if (input.bid != null && input.ask != null) {
    details.push(
      `Bid ${formatUsd(input.bid)} · ask ${formatUsd(input.ask)} in the same snapshot.`,
    );
  }
  return {
    headline: "Crypto spot snapshot. Not the green simulated price.",
    details,
  };
}
